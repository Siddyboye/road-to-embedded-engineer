/*
 * Lesson 0.5: a floating input against a pulled-up one.
 * Wire a push button between BUTTON_GPIO and GND. Nothing else.
 * PULL_MODE 0 = floating, 1 = internal pull-up, 2 = internal pull-down.
 */
#include <stdio.h>
#include "sdkconfig.h"
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"

#if CONFIG_IDF_TARGET_ESP32
#define BUTTON_GPIO  GPIO_NUM_13   /* free on the ESP32-CAM while the SD card is unused */
#else
#define BUTTON_GPIO  GPIO_NUM_5
#endif
#define PULL_MODE    0

void app_main(void)
{
    gpio_config_t cfg = {
        .pin_bit_mask = 1ULL << BUTTON_GPIO,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = (PULL_MODE == 1) ? GPIO_PULLUP_ENABLE : GPIO_PULLUP_DISABLE,
        .pull_down_en = (PULL_MODE == 2) ? GPIO_PULLDOWN_ENABLE : GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&cfg);

    int last = gpio_get_level(BUTTON_GPIO);
    uint32_t changes = 0;

    for (int n = 0; ; n++) {
        int level = gpio_get_level(BUTTON_GPIO);
        if (level != last) {
            changes++;
            last = level;
        }
        if (n % 100 == 0) {                     /* one line per second at a 10 ms tick */
            printf("level=%d changes=%" PRIu32 "\n", level, changes);
        }
        vTaskDelay(1);                          /* one scheduler tick */
    }
}
