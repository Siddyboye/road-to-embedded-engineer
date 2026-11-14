#include "frame.h"
#include "crc8.h"

void frame_init(frame_parser_t *p)
{
    p->state = WAIT_SOF;
    p->len = 0;
    p->got = 0;
    p->crc = 0;
}

frame_result_t frame_feed(frame_parser_t *p, uint8_t byte)
{
    switch (p->state) {
    case WAIT_SOF:
        if (byte == FRAME_SOF) {
            p->state = WAIT_LEN;
        }
        return FRAME_NONE;

    case WAIT_LEN:
        if (byte == 0 || byte > FRAME_MAX) {
            p->state = WAIT_SOF;            /* resynchronise on the next start byte */
            return FRAME_BAD_LENGTH;
        }
        p->len = byte;
        p->got = 0;
        p->crc = crc8_update(0, byte);
        p->state = IN_PAYLOAD;
        return FRAME_NONE;

    case IN_PAYLOAD:
        p->payload[p->got++] = byte;
        p->crc = crc8_update(p->crc, byte);
        if (p->got == p->len) {
            p->state = WAIT_CRC;
        }
        return FRAME_NONE;

    case WAIT_CRC:
    default:
        p->state = WAIT_SOF;
        return (byte == p->crc) ? FRAME_OK : FRAME_BAD_CRC;
    }
}
