/*
 * Lesson 3.3, sitting 1: an SPI master from GPIO, in any of the four modes, verified by loopback.
 * Jumper MOSI (GPIO11) to MISO (GPIO13). Watch SCK (GPIO12), MOSI and CS (GPIO10) on the logic analyzer.
 */
#include <stdio.h>
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_rom_sys.h"

#define CS    GPIO_NUM_10
#define MOSI  GPIO_NUM_11
#define SCK   GPIO_NUM_12
#define MISO  GPIO_NUM_13
#define HALF_US 5

/* mode = CPOL * 2 + CPHA. CPOL is the clock's idle level; CPHA selects which edge samples. */
static uint8_t transfer(uint8_t out, int mode)
{
    int cpol = (mode >> 1) & 1, cpha = mode & 1;
    uint8_t in = 0;
    for (int i = 7; i >= 0; i--) {                      /* most significant bit first */
        if (!cpha) {
            gpio_set_level(MOSI, (out >> i) & 1);       /* data is set up before the first edge */
        }
        esp_rom_delay_us(HALF_US);
        gpio_set_level(SCK, !cpol);                     /* leading edge */
        if (cpha) {
            gpio_set_level(MOSI, (out >> i) & 1);       /* CPHA 1: data changes on the leading edge */
        } else {
            in |= (uint8_t)(gpio_get_level(MISO) << i); /* CPHA 0: sample on the leading edge */
        }
        esp_rom_delay_us(HALF_US);
        gpio_set_level(SCK, cpol);                      /* trailing edge */
        if (cpha) {
            in |= (uint8_t)(gpio_get_level(MISO) << i); /* CPHA 1: sample on the trailing edge */
        }
    }
    return in;
}

void app_main(void)
{
    gpio_config_t outs = { .pin_bit_mask = (1ULL << CS) | (1ULL << MOSI) | (1ULL << SCK), .mode = GPIO_MODE_OUTPUT };
    gpio_config(&outs);
    gpio_config_t in = { .pin_bit_mask = 1ULL << MISO, .mode = GPIO_MODE_INPUT, .pull_down_en = GPIO_PULLDOWN_ENABLE };
    gpio_config(&in);
    gpio_set_level(CS, 1);

    for (;;) {
        for (int mode = 0; mode < 4; mode++) {
            gpio_set_level(SCK, (mode >> 1) & 1);       /* park the clock at its idle level before selecting */
            esp_rom_delay_us(HALF_US);
            int errors = 0;
            gpio_set_level(CS, 0);
            for (int value = 0; value < 256; value++) {
                if (transfer((uint8_t)value, mode) != value) {
                    errors++;
                }
            }
            gpio_set_level(CS, 1);
            printf("mode %d: 256 bytes looped back, %d errors\n", mode, errors);
        }
        vTaskDelay(pdMS_TO_TICKS(2000));
    }
}
