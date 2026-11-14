/*
 * Lesson 3.2, sitting 3: the I2C master driver and a register-level MPU6050 driver.
 * SDA GPIO8, SCL GPIO9, pull-ups to 3.3 V. Register numbers are from the MPU-6000/6050 register map.
 */
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/i2c_master.h"
#include "esp_err.h"
#include "convert.h"

#define SDA_GPIO          8
#define SCL_GPIO          9
#define MPU_ADDR          0x68      /* 0x69 if the AD0 pin is high */
#define REG_PWR_MGMT_1    0x6B
#define REG_ACCEL_XOUT_H  0x3B
#define REG_WHO_AM_I      0x75

static i2c_master_dev_handle_t mpu;

static esp_err_t reg_read(uint8_t reg, uint8_t *buf, size_t len)
{
    return i2c_master_transmit_receive(mpu, &reg, 1, buf, len, 100);    /* write the register number, repeated start, read */
}
static esp_err_t reg_write(uint8_t reg, uint8_t value)
{
    uint8_t out[2] = { reg, value };
    return i2c_master_transmit(mpu, out, sizeof out, 100);
}

void app_main(void)
{
    i2c_master_bus_handle_t bus;
    i2c_master_bus_config_t bus_cfg = {
        .i2c_port = I2C_NUM_0,
        .sda_io_num = SDA_GPIO,
        .scl_io_num = SCL_GPIO,
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .glitch_ignore_cnt = 7,
        .flags.enable_internal_pullup = true,
    };
    ESP_ERROR_CHECK(i2c_new_master_bus(&bus_cfg, &bus));

    printf("devices found:");
    for (uint8_t addr = 0x08; addr <= 0x77; addr++) {
        if (i2c_master_probe(bus, addr, 50) == ESP_OK) {
            printf(" 0x%02X", addr);
        }
    }
    printf("\n");

    i2c_device_config_t dev_cfg = { .dev_addr_length = I2C_ADDR_BIT_LEN_7, .device_address = MPU_ADDR, .scl_speed_hz = 400000 };
    ESP_ERROR_CHECK(i2c_master_bus_add_device(bus, &dev_cfg, &mpu));

    uint8_t id = 0;
    esp_err_t err = reg_read(REG_WHO_AM_I, &id, 1);
    if (err != ESP_OK) {
        printf("no answer from 0x%02X: %s\n", MPU_ADDR, esp_err_to_name(err));
        return;
    }
    printf("WHO_AM_I = 0x%02X (0x68 expected)\n", id);
    ESP_ERROR_CHECK(reg_write(REG_PWR_MGMT_1, 0x00));       /* the chip powers up asleep: clear the sleep bit */

    for (;;) {
        uint8_t raw[6];
        if (reg_read(REG_ACCEL_XOUT_H, raw, sizeof raw) == ESP_OK) {
            /* three signed 16-bit values, most significant byte first */
            printf("accel mg: x %5d  y %5d  z %5d\n",
                   (int)mpu6050_accel_to_mg(be16(&raw[0])), (int)mpu6050_accel_to_mg(be16(&raw[2])), (int)mpu6050_accel_to_mg(be16(&raw[4])));
        }
        vTaskDelay(pdMS_TO_TICKS(250));
    }
}
