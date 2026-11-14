/*
 * Lesson 3.2, sitting 4: BMP280, or the temperature and pressure half of a BME280. SDA GPIO8, SCL GPIO9.
 * Address 0x76 (0x77 if SDO is high). The compensation maths lives in firmware/host/bmp280_comp.c,
 * where it is tested against the worked example in the datasheet. Humidity on the BME280 is your exercise.
 */
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/i2c_master.h"
#include "esp_err.h"
#include "bmp280_comp.h"

#define SDA_GPIO      8
#define SCL_GPIO      9
#define BMP_ADDR      0x76
#define REG_ID        0xD0
#define REG_CALIB     0x88      /* 24 bytes, little-endian pairs */
#define REG_CTRL_MEAS 0xF4
#define REG_DATA      0xF7      /* pressure msb, lsb, xlsb, then temperature msb, lsb, xlsb */

static i2c_master_bus_handle_t bus;
static i2c_master_dev_handle_t dev;

static void bus_open(uint8_t address)
{
    i2c_master_bus_config_t bus_cfg = {
        .i2c_port = I2C_NUM_0,
        .sda_io_num = SDA_GPIO,
        .scl_io_num = SCL_GPIO,
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .glitch_ignore_cnt = 7,
        .flags.enable_internal_pullup = true,
    };
    ESP_ERROR_CHECK(i2c_new_master_bus(&bus_cfg, &bus));
    i2c_device_config_t dev_cfg = { .dev_addr_length = I2C_ADDR_BIT_LEN_7, .device_address = address, .scl_speed_hz = 400000 };
    ESP_ERROR_CHECK(i2c_master_bus_add_device(bus, &dev_cfg, &dev));
}

static esp_err_t reg_read(uint8_t reg, uint8_t *buf, size_t len) { return i2c_master_transmit_receive(dev, &reg, 1, buf, len, 100); }
static uint16_t le16(const uint8_t *p) { return (uint16_t)(p[0] | ((uint16_t)p[1] << 8)); }

void app_main(void)
{
    bus_open(BMP_ADDR);
    uint8_t id = 0;
    if (reg_read(REG_ID, &id, 1) != ESP_OK) {
        printf("no answer at 0x%02X\n", BMP_ADDR);
        return;
    }
    printf("chip id 0x%02X (0x58 = BMP280, 0x60 = BME280)\n", id);

    uint8_t raw[24];
    ESP_ERROR_CHECK(reg_read(REG_CALIB, raw, sizeof raw));
    bmp280_calib_t c = {
        .T1 = le16(&raw[0]),  .T2 = (int16_t)le16(&raw[2]),  .T3 = (int16_t)le16(&raw[4]),
        .P1 = le16(&raw[6]),  .P2 = (int16_t)le16(&raw[8]),  .P3 = (int16_t)le16(&raw[10]),
        .P4 = (int16_t)le16(&raw[12]), .P5 = (int16_t)le16(&raw[14]), .P6 = (int16_t)le16(&raw[16]),
        .P7 = (int16_t)le16(&raw[18]), .P8 = (int16_t)le16(&raw[20]), .P9 = (int16_t)le16(&raw[22]),
    };

    const uint8_t start[2] = { REG_CTRL_MEAS, 0x27 };      /* temperature x1, pressure x1, normal mode */
    ESP_ERROR_CHECK(i2c_master_transmit(dev, start, sizeof start, 100));

    for (;;) {
        uint8_t d[6];
        if (reg_read(REG_DATA, d, sizeof d) == ESP_OK) {
            int32_t adc_p = (int32_t)(((uint32_t)d[0] << 12) | ((uint32_t)d[1] << 4) | (d[2] >> 4));    /* 20-bit values */
            int32_t adc_t = (int32_t)(((uint32_t)d[3] << 12) | ((uint32_t)d[4] << 4) | (d[5] >> 4));
            int32_t t_fine;
            int32_t centi = bmp280_temp_centi_c(&c, adc_t, &t_fine);
            uint32_t pa = bmp280_press_q24_8(&c, adc_p, t_fine) / 256;
            printf("%d.%02d C   %u.%02u hPa\n", (int)(centi / 100), (int)(centi % 100), (unsigned)(pa / 100), (unsigned)(pa % 100));
        }
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}
