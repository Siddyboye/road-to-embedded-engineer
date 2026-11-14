#include "crc8.h"

uint8_t crc8_update(uint8_t crc, uint8_t byte)
{
    crc ^= byte;
    for (int i = 0; i < 8; i++) {
        /* crc is promoted to int by the shift; the casts say exactly which bits are kept (lesson 1.5) */
        unsigned shifted = (unsigned)crc << 1;
        crc = (uint8_t)((crc & 0x80u) ? (shifted ^ 0x07u) : shifted);
    }
    return crc;
}

uint8_t crc8_bitwise(const uint8_t *data, size_t len)
{
    uint8_t crc = 0;
    for (size_t i = 0; i < len; i++) {
        crc = crc8_update(crc, data[i]);
    }
    return crc;
}

static uint8_t table[256];
static int table_ready;

uint8_t crc8_table(const uint8_t *data, size_t len)
{
    if (!table_ready) {                     /* 256 bytes of RAM buys roughly an eightfold speed-up */
        for (int i = 0; i < 256; i++) {
            table[i] = crc8_update(0, (uint8_t)i);
        }
        table_ready = 1;
    }
    uint8_t crc = 0;
    for (size_t i = 0; i < len; i++) {
        crc = table[crc ^ data[i]];
    }
    return crc;
}
