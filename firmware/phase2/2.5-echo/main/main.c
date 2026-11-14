/*
 * Lesson 2.5: time the HC-SR04 echo pulse two ways.
 * VERSION 0: a GPIO interrupt on both edges, timestamped in software with esp_timer.
 * VERSION 1: an MCPWM capture channel, which latches a hardware counter on each edge.
 * TRIG_GPIO drives the sensor directly. ECHO is 5 V: bring it to ECHO_GPIO through a divider (1 k over 2 k).
 */
#include <stdio.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "driver/mcpwm_cap.h"
#include "esp_attr.h"
#include "esp_timer.h"
#include "esp_rom_sys.h"
#include "esp_err.h"

#define VERSION    0
#define TRIG_GPIO  GPIO_NUM_6
#define ECHO_GPIO  GPIO_NUM_7

static TaskHandle_t waiter;

#if VERSION == 0
static void IRAM_ATTR on_echo(void *arg)
{
    (void)arg;
    static int64_t rise;
    int64_t now = esp_timer_get_time();
    if (gpio_get_level(ECHO_GPIO)) {
        rise = now;
    } else {
        BaseType_t woken = pdFALSE;
        xTaskNotifyFromISR(waiter, (uint32_t)(now - rise), eSetValueWithOverwrite, &woken);
        if (woken) {
            portYIELD_FROM_ISR();
        }
    }
}
static uint32_t ticks_per_us = 1;
#else
static uint32_t ticks_per_us;

static bool IRAM_ATTR on_capture(mcpwm_cap_channel_handle_t chan, const mcpwm_capture_event_data_t *edata, void *user)
{
    (void)chan; (void)user;
    static uint32_t rise;
    BaseType_t woken = pdFALSE;
    if (edata->cap_edge == MCPWM_CAP_EDGE_POS) {
        rise = edata->cap_value;
    } else {
        xTaskNotifyFromISR(waiter, edata->cap_value - rise, eSetValueWithOverwrite, &woken);
    }
    return woken == pdTRUE;
}
#endif

void app_main(void)
{
    waiter = xTaskGetCurrentTaskHandle();
    gpio_reset_pin(TRIG_GPIO);
    gpio_set_direction(TRIG_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(TRIG_GPIO, 0);

#if VERSION == 0
    gpio_config_t echo = {
        .pin_bit_mask = 1ULL << ECHO_GPIO,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_ANYEDGE,
    };
    gpio_config(&echo);
    gpio_install_isr_service(0);
    gpio_isr_handler_add(ECHO_GPIO, on_echo, NULL);
#else
    mcpwm_cap_timer_handle_t cap_timer;
    mcpwm_capture_timer_config_t timer_cfg = { .group_id = 0, .clk_src = MCPWM_CAPTURE_CLK_SRC_DEFAULT };
    ESP_ERROR_CHECK(mcpwm_new_capture_timer(&timer_cfg, &cap_timer));

    mcpwm_cap_channel_handle_t cap_chan;
    mcpwm_capture_channel_config_t chan_cfg = {
        .gpio_num = ECHO_GPIO,
        .prescale = 1,
        .flags.pos_edge = true,
        .flags.neg_edge = true,
    };
    ESP_ERROR_CHECK(mcpwm_new_capture_channel(cap_timer, &chan_cfg, &cap_chan));
    mcpwm_capture_event_callbacks_t cbs = { .on_cap = on_capture };
    ESP_ERROR_CHECK(mcpwm_capture_channel_register_event_callbacks(cap_chan, &cbs, NULL));
    ESP_ERROR_CHECK(mcpwm_capture_channel_enable(cap_chan));
    ESP_ERROR_CHECK(mcpwm_capture_timer_enable(cap_timer));
    ESP_ERROR_CHECK(mcpwm_capture_timer_start(cap_timer));

    uint32_t hz = 0;
    ESP_ERROR_CHECK(mcpwm_capture_timer_get_resolution(cap_timer, &hz));
    ticks_per_us = hz / 1000000;
    printf("capture timer resolution: %" PRIu32 " Hz\n", hz);
#endif

    for (;;) {
        gpio_set_level(TRIG_GPIO, 1);
        esp_rom_delay_us(10);                           /* the sensor needs a trigger of at least 10 us */
        gpio_set_level(TRIG_GPIO, 0);

        uint32_t width = 0;
        if (xTaskNotifyWait(0, 0, &width, pdMS_TO_TICKS(50)) == pdTRUE) {
            uint32_t us = width / ticks_per_us;
            /* sound covers about 0.343 mm per microsecond at 20 C, and the pulse is the round trip */
            printf("echo %" PRIu32 " us -> %" PRIu32 " mm\n", us, us * 343 / 2000);
        } else {
            printf("no echo within 50 ms: nothing in range, or the wiring is wrong\n");
        }
        vTaskDelay(pdMS_TO_TICKS(200));
    }
}
