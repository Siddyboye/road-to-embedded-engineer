/*
 * Lesson 3.5: 1-Wire from scratch, reading one DS18B20. Data on GPIO4 with a 4.7 kOhm pull-up to 3.3 V.
 * Slot timings are the standard-speed values from the 1-Wire application note; each slot runs with interrupts off.
 */
#include <stdio.h>
#include <stdbool.h>
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_rom_sys.h"
#include "convert.h"

#define DQ GPIO_NUM_4

static portMUX_TYPE lock = portMUX_INITIALIZER_UNLOCKED;
static void low(void)     { gpio_set_level(DQ, 0); }
static void release(void) { gpio_set_level(DQ, 1); }      /* open-drain: "1" lets the pull-up raise the line */

static bool ow_reset(void)
{
    taskENTER_CRITICAL(&lock);
    low();     esp_rom_delay_us(480);
    release(); esp_rom_delay_us(70);
    bool present = (gpio_get_level(DQ) == 0);               /* a device answers by pulling low */
    taskEXIT_CRITICAL(&lock);
    esp_rom_delay_us(410);
    return present;
}

static void ow_write_bit(int bit)
{
    taskENTER_CRITICAL(&lock);
    if (bit) { low(); esp_rom_delay_us(6);  release(); esp_rom_delay_us(64); }     /* write 1: brief low */
    else     { low(); esp_rom_delay_us(60); release(); esp_rom_delay_us(10); }     /* write 0: low for the slot */
    taskEXIT_CRITICAL(&lock);
}

static int ow_read_bit(void)
{
    taskENTER_CRITICAL(&lock);
    low();     esp_rom_delay_us(6);
    release(); esp_rom_delay_us(9);
    int bit = gpio_get_level(DQ);                           /* sample early in the slot */
    taskEXIT_CRITICAL(&lock);
    esp_rom_delay_us(55);
    return bit;
}

static void ow_write(uint8_t byte) { for (int i = 0; i < 8; i++) ow_write_bit((byte >> i) & 1); }     /* least significant bit first */
static uint8_t ow_read(void) { uint8_t b = 0; for (int i = 0; i < 8; i++) b |= (uint8_t)(ow_read_bit() << i); return b; }

void app_main(void)
{
    gpio_config_t pin = {
        .pin_bit_mask = 1ULL << DQ,
        .mode = GPIO_MODE_INPUT_OUTPUT_OD,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&pin);
    release();

    for (;;) {
        if (!ow_reset()) {
            printf("no presence pulse: check the pull-up and the sensor's pin order\n");
            vTaskDelay(pdMS_TO_TICKS(1000));
            continue;
        }
        ow_write(0xCC);                                     /* Skip ROM: address every device */
        ow_write(0x44);                                     /* Convert T */
        vTaskDelay(pdMS_TO_TICKS(750));                     /* 12-bit conversion time */

        ow_reset();
        ow_write(0xCC);
        ow_write(0xBE);                                     /* Read Scratchpad: nine bytes */
        uint8_t pad[9];
        for (int i = 0; i < 9; i++) {
            pad[i] = ow_read();
        }
        if (crc8_maxim(pad, 8) != pad[8]) {
            printf("CRC mismatch: a slot was disturbed, reading discarded\n");
            continue;
        }
        int32_t milli = ds18b20_raw_to_milli_c((int16_t)(pad[0] | ((uint16_t)pad[1] << 8)));
        int32_t mag = milli < 0 ? -milli : milli;
        printf("%s%d.%03d C\n", milli < 0 ? "-" : "", (int)(mag / 1000), (int)(mag % 1000));
    }
}
