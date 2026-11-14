#include "convert.h"

uint8_t bcd_to_bin(uint8_t bcd) { return (uint8_t)((bcd >> 4) * 10u + (bcd & 0x0Fu)); }
uint8_t bin_to_bcd(uint8_t bin) { return (uint8_t)(((bin / 10u) << 4) | (bin % 10u)); }

int32_t ds18b20_raw_to_milli_c(int16_t raw)
{
    return ((int32_t)raw * 125) / 2;            /* raw / 16 degrees = raw * 62.5 thousandths */
}

uint8_t crc8_maxim(const uint8_t *data, size_t len)
{
    uint8_t crc = 0;
    for (size_t i = 0; i < len; i++) {
        uint8_t byte = data[i];
        for (int b = 0; b < 8; b++) {           /* least significant bit first, as on the wire */
            uint8_t mix = (uint8_t)((crc ^ byte) & 0x01u);
            crc = (uint8_t)(crc >> 1);
            if (mix) {
                crc ^= 0x8Cu;                   /* 0x31 with its bits reversed */
            }
            byte = (uint8_t)(byte >> 1);
        }
    }
    return crc;
}

int32_t mpu6050_accel_to_mg(int16_t raw)
{
    return ((int32_t)raw * 1000) / 16384;
}

uint16_t mcp3008_decode(const uint8_t rx[3])
{
    return (uint16_t)(((uint16_t)(rx[1] & 0x03u) << 8) | rx[2]);
}

int16_t be16(const uint8_t *p)
{
    return (int16_t)(((uint16_t)p[0] << 8) | p[1]);
}
