/*
 * Lesson 0.3: blink.
 * ESP32-CAM (common AI-Thinker layout): the small red LED is on GPIO33 and lights when the pin is LOW.
 * ESP32-S3: an external LED and resistor on GPIO4, lit when the pin is HIGH.
 */
#include <stdio.h>
#include "sdkconfig.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"

#if CONFIG_IDF_TARGET_ESP32
#define LED_GPIO   GPIO_NUM_33
#define LED_ON     0
#else
#define LED_GPIO   GPIO_NUM_4
#define LED_ON     1
#endif

void app_main(void)
{
    gpio_reset_pin(LED_GPIO);
    gpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);

    for (int n = 0; ; n++) {
        gpio_set_level(LED_GPIO, (n & 1) ? LED_ON : !LED_ON);
        printf("led %s\n", (n & 1) ? "on" : "off");
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}
