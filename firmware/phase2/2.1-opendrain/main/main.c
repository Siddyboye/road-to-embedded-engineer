/*
 * Lesson 2.1: an open-drain line shared by two boards (wired-AND).
 * Flash this on both boards. Join LINE_GPIO on each with one wire, join the grounds,
 * and put ONE 4.7 kOhm resistor from the line to 3.3 V. A button on each board goes from BUTTON_GPIO to GND.
 * Either board can pull the line low; it is high only when neither does.
 */
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"

#define LINE_GPIO    GPIO_NUM_7
#define BUTTON_GPIO  GPIO_NUM_5

void app_main(void)
{
    gpio_config_t line = {
        .pin_bit_mask = 1ULL << LINE_GPIO,
        .mode = GPIO_MODE_INPUT_OUTPUT_OD,          /* drives low only, and can read the line back */
        .pull_up_en = GPIO_PULLUP_DISABLE,          /* the external resistor is the pull-up */
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&line);
    gpio_set_level(LINE_GPIO, 1);                   /* 1 = release the line */

    gpio_config_t button = {
        .pin_bit_mask = 1ULL << BUTTON_GPIO,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&button);

    int last = -1;
    for (;;) {
        int pressed = (gpio_get_level(BUTTON_GPIO) == 0);
        gpio_set_level(LINE_GPIO, pressed ? 0 : 1);
        int level = gpio_get_level(LINE_GPIO);
        if (level != last) {
            last = level;
            printf("line=%d (%s)\n", level, pressed ? "I am pulling it low" : level ? "released by everyone" : "the other board is pulling it low");
        }
        vTaskDelay(pdMS_TO_TICKS(20));
    }
}
