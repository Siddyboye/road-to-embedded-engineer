/* Byte-at-a-time parser for the course's serial frame. Lessons 1.9 and 1.14.
 *   0x7E | length (1..FRAME_MAX) | payload ... | CRC-8 over length and payload
 * Feed it one received byte at a time; it is a small state machine and never blocks. */
#ifndef FRAME_H
#define FRAME_H

#include <stdint.h>

#define FRAME_SOF  0x7Eu
#define FRAME_MAX  32u

typedef enum { FRAME_NONE, FRAME_OK, FRAME_BAD_CRC, FRAME_BAD_LENGTH } frame_result_t;

typedef struct {
    enum { WAIT_SOF, WAIT_LEN, IN_PAYLOAD, WAIT_CRC } state;
    uint8_t len;
    uint8_t got;
    uint8_t crc;
    uint8_t payload[FRAME_MAX];
} frame_parser_t;

void           frame_init(frame_parser_t *p);
frame_result_t frame_feed(frame_parser_t *p, uint8_t byte);

#endif
