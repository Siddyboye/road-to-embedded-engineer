/*
 * Lesson 2.2: interrupt latency, and deferring work from an ISR to a task.
 * Jumper OUT_GPIO to IN_GPIO. Probe OUT_GPIO and ACK_GPIO with the logic analyzer:
 * the delay from OUT rising to ACK rising is the interrupt latency.
 */
#include <stdio.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "driver/gpio.h"
#include "esp_attr.h"
#include "esp_timer.h"

#define OUT_GPIO  GPIO_NUM_6
#define IN_GPIO   GPIO_NUM_7
#define ACK_GPIO  GPIO_NUM_4

static QueueHandle_t events;

static void IRAM_ATTR on_edge(void *arg)
{
    (void)arg;
    gpio_set_level(ACK_GPIO, 1);                    /* the only work done here: mark the moment */
    int64_t now = esp_timer_get_time();
    BaseType_t woken = pdFALSE;
    xQueueSendFromISR(events, &now, &woken);
    if (woken) {
        portYIELD_FROM_ISR();                       /* run the waiting task as soon as the ISR returns */
    }
}

static void worker(void *arg)
{
    (void)arg;
    int64_t stamp;
    uint32_t count = 0;
    for (;;) {
        if (xQueueReceive(events, &stamp, portMAX_DELAY) == pdTRUE) {
            gpio_set_level(ACK_GPIO, 0);
            count++;
            if (count % 10 == 0) {
                printf("%" PRIu32 " edges, last handled %lld us after it was stamped\n", count, (long long)(esp_timer_get_time() - stamp));
            }
        }
    }
}

void app_main(void)
{
    events = xQueueCreate(8, sizeof(int64_t));
    gpio_reset_pin(OUT_GPIO);
    gpio_set_direction(OUT_GPIO, GPIO_MODE_OUTPUT);
    gpio_reset_pin(ACK_GPIO);
    gpio_set_direction(ACK_GPIO, GPIO_MODE_OUTPUT);

    gpio_config_t in = {
        .pin_bit_mask = 1ULL << IN_GPIO,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .intr_type = GPIO_INTR_POSEDGE,
    };
    gpio_config(&in);
    gpio_install_isr_service(0);
    gpio_isr_handler_add(IN_GPIO, on_edge, NULL);
    xTaskCreate(worker, "worker", 3072, NULL, 10, NULL);

    for (;;) {
        gpio_set_level(OUT_GPIO, 1);
        vTaskDelay(pdMS_TO_TICKS(50));
        gpio_set_level(OUT_GPIO, 0);
        vTaskDelay(pdMS_TO_TICKS(50));
    }
}
