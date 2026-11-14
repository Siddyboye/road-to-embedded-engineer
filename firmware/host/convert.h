/* Small conversions used by the Phase 3 drivers. Pure C, tested on the host. */
#ifndef CONVERT_H
#define CONVERT_H

#include <stddef.h>
#include <stdint.h>

uint8_t  bcd_to_bin(uint8_t bcd);                       /* DS3231 registers: 0x59 -> 59 */
uint8_t  bin_to_bcd(uint8_t bin);
int32_t  ds18b20_raw_to_milli_c(int16_t raw);           /* 1/16 degree steps -> thousandths of a degree */
uint8_t  crc8_maxim(const uint8_t *data, size_t len);   /* 1-Wire CRC: polynomial 0x31, reflected */
int32_t  mpu6050_accel_to_mg(int16_t raw);              /* at the +/-2 g range: 16384 counts per g */
uint16_t mcp3008_decode(const uint8_t rx[3]);           /* 10-bit result from a 3-byte transfer */
int16_t  be16(const uint8_t *p);                        /* big-endian bytes on the wire -> signed 16-bit */

#endif
