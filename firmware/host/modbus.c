#include "modbus.h"

uint16_t modbus_crc16(const uint8_t *data, size_t len)
{
    uint16_t crc = 0xFFFFu;
    for (size_t i = 0; i < len; i++) {
        crc ^= data[i];
        for (int b = 0; b < 8; b++) {
            crc = (crc & 1u) ? (uint16_t)((crc >> 1) ^ 0xA001u) : (uint16_t)(crc >> 1);
        }
    }
    return crc;
}

static size_t add_crc(uint8_t *frame, size_t len)
{
    uint16_t crc = modbus_crc16(frame, len);
    frame[len] = (uint8_t)(crc & 0xFFu);        /* low byte first: the one little-endian field in the frame */
    frame[len + 1] = (uint8_t)(crc >> 8);
    return len + 2;
}

static uint16_t get16(const uint8_t *p) { return (uint16_t)(((uint16_t)p[0] << 8) | p[1]); }

size_t modbus_build_read(uint8_t unit, uint16_t start, uint16_t count, uint8_t out[8])
{
    out[0] = unit;
    out[1] = MODBUS_READ_HOLDING;
    out[2] = (uint8_t)(start >> 8);
    out[3] = (uint8_t)(start & 0xFFu);
    out[4] = (uint8_t)(count >> 8);
    out[5] = (uint8_t)(count & 0xFFu);
    return add_crc(out, 6);
}

static size_t exception(uint8_t unit, uint8_t function, uint8_t code, uint8_t *resp)
{
    resp[0] = unit;
    resp[1] = (uint8_t)(function | 0x80u);      /* top bit set marks an exception reply */
    resp[2] = code;
    return add_crc(resp, 3);
}

size_t modbus_slave_handle(uint8_t unit, const uint8_t *req, size_t req_len,
                           uint16_t *holding, uint16_t n_holding, uint8_t *resp, size_t resp_max)
{
    if (req_len < 8 || req[0] != unit || resp_max < 8) {
        return 0;
    }
    uint16_t got = (uint16_t)(req[req_len - 2] | ((uint16_t)req[req_len - 1] << 8));
    if (got != modbus_crc16(req, req_len - 2)) {
        return 0;                               /* corrupted frames are ignored, never answered */
    }
    uint8_t function = req[1];
    uint16_t addr = get16(&req[2]);
    uint16_t value = get16(&req[4]);

    if (function == MODBUS_READ_HOLDING) {
        uint16_t count = value;
        if (count == 0 || count > 125 || (uint32_t)addr + count > n_holding) {
            return exception(unit, function, MODBUS_EX_ADDRESS, resp);
        }
        if (resp_max < (size_t)(5 + 2 * count)) {
            return 0;
        }
        resp[0] = unit;
        resp[1] = function;
        resp[2] = (uint8_t)(2 * count);
        for (uint16_t i = 0; i < count; i++) {
            resp[3 + 2 * i] = (uint8_t)(holding[addr + i] >> 8);
            resp[4 + 2 * i] = (uint8_t)(holding[addr + i] & 0xFFu);
        }
        return add_crc(resp, (size_t)(3 + 2 * count));
    }
    if (function == MODBUS_WRITE_SINGLE) {
        if (addr >= n_holding) {
            return exception(unit, function, MODBUS_EX_ADDRESS, resp);
        }
        holding[addr] = value;
        for (size_t i = 0; i < 6; i++) {
            resp[i] = req[i];                   /* the reply to a single write echoes the request */
        }
        return add_crc(resp, 6);
    }
    return exception(unit, function, MODBUS_EX_FUNCTION, resp);
}
