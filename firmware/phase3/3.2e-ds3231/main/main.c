/*
 * Lesson 3.2, sitting 4: DS3231 real-time clock. SDA GPIO8, SCL GPIO9, address 0x68.
 * Its registers hold binary-coded decimal. Note the address: it is the same as the MPU6050's default.
 * Set SET_TIME to 1 once to write the time below, then back to 0.
 */
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/i2c_master.h"
#include "esp_err.h"
#include "convert.h"

#define SDA_GPIO  8
#define SCL_GPIO  9
#define RTC_ADDR  0x68
#define SET_TIME  0

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

void app_main(void)
{
    bus_open(RTC_ADDR);
#if SET_TIME
    /* register 0 onward: seconds, minutes, hours (24 h), day of week, date, month, year */
    const uint8_t set[8] = { 0x00, bin_to_bcd(0), bin_to_bcd(30), bin_to_bcd(18), 6, bin_to_bcd(14), bin_to_bcd(11), bin_to_bcd(26) };
    ESP_ERROR_CHECK(i2c_master_transmit(dev, set, sizeof set, 100));
    printf("time written\n");
#endif
    for (;;) {
        uint8_t reg = 0x00, t[7];
        if (i2c_master_transmit_receive(dev, &reg, 1, t, sizeof t, 100) == ESP_OK) {
            printf("20%02u-%02u-%02u %02u:%02u:%02u\n",
                   bcd_to_bin(t[6]), bcd_to_bin(t[5] & 0x1F), bcd_to_bin(t[4] & 0x3F),
                   bcd_to_bin(t[2] & 0x3F), bcd_to_bin(t[1] & 0x7F), bcd_to_bin(t[0] & 0x7F));
        } else {
            printf("no answer from the clock\n");
        }
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}
