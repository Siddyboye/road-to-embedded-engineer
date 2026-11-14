/* Modbus RTU: CRC, a request builder for the master, and a slave that serves holding registers. Lesson 3.7. */
#ifndef MODBUS_H
#define MODBUS_H

#include <stddef.h>
#include <stdint.h>

#define MODBUS_READ_HOLDING   0x03u
#define MODBUS_WRITE_SINGLE   0x06u
#define MODBUS_EX_FUNCTION    0x01u     /* illegal function     */
#define MODBUS_EX_ADDRESS     0x02u     /* illegal data address */

uint16_t modbus_crc16(const uint8_t *data, size_t len);

/* Master: "read `count` holding registers from `start`". Writes 8 bytes to out. */
size_t modbus_build_read(uint8_t unit, uint16_t start, uint16_t count, uint8_t out[8]);

/* Slave: handle one request frame. Returns the reply length, or 0 when no reply must be sent
 * (frame for another unit, bad CRC, too short, or the reply would not fit). */
size_t modbus_slave_handle(uint8_t unit, const uint8_t *req, size_t req_len,
                           uint16_t *holding, uint16_t n_holding, uint8_t *resp, size_t resp_max);

#endif
