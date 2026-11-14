/*
 * Lesson 3.2, sitting 2: an I2C master built from two open-drain pins, and a bus scanner.
 * SDA on GPIO8, SCL on GPIO9, each with a 4.7 kOhm pull-up to 3.3 V. About 50 kHz.
 * With an MPU6050 attached, it also reads the identity register (0x75), which should return 0x68.
 */
#include <stdio.h>
#include <stdbool.h>
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_rom_sys.h"

#define SDA      GPIO_NUM_8
#define SCL      GPIO_NUM_9
#define HALF_US  10

static void sda(int level) { gpio_set_level(SDA, level); }
static int  sda_read(void) { return gpio_get_level(SDA); }
static void wait(void)     { esp_rom_delay_us(HALF_US); }

/* Release SCL and wait for it to actually rise: a slow device may hold it low (clock stretching). */
static void scl_high(void)
{
    gpio_set_level(SCL, 1);
    for (int i = 0; i < 1000 && gpio_get_level(SCL) == 0; i++) {
        esp_rom_delay_us(5);
    }
    wait();
}
static void scl_low(void) { gpio_set_level(SCL, 0); wait(); }

static void i2c_start(void) { sda(1); scl_high(); sda(0); wait(); scl_low(); }      /* SDA falls while SCL is high */
static void i2c_stop(void)  { sda(0); wait(); scl_high(); sda(1); wait(); }         /* SDA rises while SCL is high */

/* Sends eight bits, most significant first. Returns true if the receiver acknowledged. */
static bool i2c_write(uint8_t byte)
{
    for (int i = 7; i >= 0; i--) {
        sda((byte >> i) & 1);
        wait();
        scl_high();
        scl_low();
    }
    sda(1);                         /* release SDA so the receiver can drive the ninth bit */
    wait();
    scl_high();
    bool ack = (sda_read() == 0);
    scl_low();
    return ack;
}

/* Reads eight bits, then sends ACK (more bytes wanted) or NACK (last byte). */
static uint8_t i2c_read(bool ack)
{
    uint8_t byte = 0;
    sda(1);
    for (int i = 7; i >= 0; i--) {
        wait();
        scl_high();
        byte |= (uint8_t)(sda_read() << i);
        scl_low();
    }
    sda(ack ? 0 : 1);
    wait();
    scl_high();
    scl_low();
    sda(1);
    return byte;
}

static bool read_register(uint8_t addr, uint8_t reg, uint8_t *value)
{
    i2c_start();
    if (!i2c_write((uint8_t)(addr << 1)) || !i2c_write(reg)) {      /* address + write, then the register number */
        i2c_stop();
        return false;
    }
    i2c_start();                                                    /* repeated start: keep the bus */
    if (!i2c_write((uint8_t)((addr << 1) | 1))) {                   /* address + read */
        i2c_stop();
        return false;
    }
    *value = i2c_read(false);                                       /* one byte, so NACK it */
    i2c_stop();
    return true;
}

void app_main(void)
{
    gpio_config_t pins = {
        .pin_bit_mask = (1ULL << SDA) | (1ULL << SCL),
        .mode = GPIO_MODE_INPUT_OUTPUT_OD,
        .pull_up_en = GPIO_PULLUP_ENABLE,           /* weak help only: the external resistors do the real work */
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&pins);
    sda(1);
    gpio_set_level(SCL, 1);

    for (;;) {
        printf("scanning 0x08 to 0x77:");
        int found = 0;
        for (uint8_t addr = 0x08; addr <= 0x77; addr++) {
            i2c_start();
            bool ack = i2c_write((uint8_t)(addr << 1));
            i2c_stop();
            if (ack) {
                printf(" 0x%02X", addr);
                found++;
            }
        }
        printf("%s\n", found ? "" : " nothing answered: check the pull-ups, power and wiring");

        uint8_t id;
        if (read_register(0x68, 0x75, &id)) {
            printf("register 0x75 of device 0x68 = 0x%02X\n", id);
        }
        vTaskDelay(pdMS_TO_TICKS(2000));
    }
}
