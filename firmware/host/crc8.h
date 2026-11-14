/* CRC-8, polynomial 0x07, initial value 0, no reflection, no final XOR. Lessons 0.12 and 1.14. */
#ifndef CRC8_H
#define CRC8_H

#include <stddef.h>
#include <stdint.h>

uint8_t crc8_bitwise(const uint8_t *data, size_t len);
uint8_t crc8_table(const uint8_t *data, size_t len);
uint8_t crc8_update(uint8_t crc, uint8_t byte);

#endif
