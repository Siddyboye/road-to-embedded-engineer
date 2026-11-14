/*
 * Lesson 0.13: blink by writing the GPIO registers directly.
 * LED on GPIO4. On the ESP32-CAM that is the white flash LED: bright, do not look into it.
 * The driver is used once, to select the GPIO function and enable the output. The loop is two raw stores.
 * Valid for pins 0 to 31; higher pins use the GPIO_OUT1_* registers.
 */
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "soc/soc.h"
#include "soc/gpio_reg.h"

#define LED_GPIO  4

void app_main(void)
{
    gpio_reset_pin(LED_GPIO);
    gpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);

    for (;;) {
        REG_WRITE(GPIO_OUT_W1TS_REG, BIT(LED_GPIO));
        printf("OUT register after set:   bit %d = %d\n", LED_GPIO, (int)((REG_READ(GPIO_OUT_REG) >> LED_GPIO) & 1));
        vTaskDelay(pdMS_TO_TICKS(250));

        REG_WRITE(GPIO_OUT_W1TC_REG, BIT(LED_GPIO));
        printf("OUT register after clear: bit %d = %d\n", LED_GPIO, (int)((REG_READ(GPIO_OUT_REG) >> LED_GPIO) & 1));
        vTaskDelay(pdMS_TO_TICKS(250));
    }
}
