/*
 * Lesson 0.7: count the falling edges of a real button with an interrupt.
 * Wire a push button between BUTTON_GPIO and GND. Press it ten times and compare with the count.
 */
#include <stdio.h>
#include "sdkconfig.h"
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_attr.h"

#if CONFIG_IDF_TARGET_ESP32
#define BUTTON_GPIO  GPIO_NUM_13   /* free on the ESP32-CAM while the SD card is unused */
#else
#define BUTTON_GPIO  GPIO_NUM_5
#endif

static volatile uint32_t edges;

static void IRAM_ATTR on_edge(void *arg)
{
    (void)arg;
    edges++;
}

void app_main(void)
{
    gpio_config_t cfg = {
        .pin_bit_mask = 1ULL << BUTTON_GPIO,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_NEGEDGE,
    };
    gpio_config(&cfg);
    gpio_install_isr_service(0);
    gpio_isr_handler_add(BUTTON_GPIO, on_edge, NULL);

    uint32_t shown = 0;
    for (;;) {
        uint32_t now = edges;
        if (now != shown) {
            shown = now;
            printf("edges=%" PRIu32 "\n", now);
        }
        vTaskDelay(pdMS_TO_TICKS(200));
    }
}
