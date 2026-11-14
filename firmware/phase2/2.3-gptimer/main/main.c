/*
 * Lesson 2.3: a 1 kHz interrupt from a general-purpose timer with hardware auto-reload.
 * OUT_GPIO toggles in the alarm callback, so it carries a 500 Hz square wave: measure its jitter.
 */
#include <stdio.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "driver/gptimer.h"
#include "esp_attr.h"
#include "esp_err.h"

#define OUT_GPIO      GPIO_NUM_6
#define RESOLUTION_HZ 1000000       /* one tick = 1 us */
#define ALARM_TICKS   1000          /* 1000 us -> 1 kHz */

static volatile uint32_t alarms;

static bool IRAM_ATTR on_alarm(gptimer_handle_t timer, const gptimer_alarm_event_data_t *edata, void *user_ctx)
{
    (void)timer; (void)edata; (void)user_ctx;
    static int level;
    level = !level;
    gpio_set_level(OUT_GPIO, level);
    alarms = alarms + 1;
    return false;                   /* no task was woken, so no context switch is needed */
}

void app_main(void)
{
    gpio_reset_pin(OUT_GPIO);
    gpio_set_direction(OUT_GPIO, GPIO_MODE_OUTPUT);

    gptimer_handle_t timer;
    gptimer_config_t cfg = {
        .clk_src = GPTIMER_CLK_SRC_DEFAULT,
        .direction = GPTIMER_COUNT_UP,
        .resolution_hz = RESOLUTION_HZ,
    };
    ESP_ERROR_CHECK(gptimer_new_timer(&cfg, &timer));

    gptimer_event_callbacks_t cbs = { .on_alarm = on_alarm };
    ESP_ERROR_CHECK(gptimer_register_event_callbacks(timer, &cbs, NULL));

    gptimer_alarm_config_t alarm = {
        .alarm_count = ALARM_TICKS,
        .reload_count = 0,
        .flags.auto_reload_on_alarm = true,
    };
    ESP_ERROR_CHECK(gptimer_set_alarm_action(timer, &alarm));
    ESP_ERROR_CHECK(gptimer_enable(timer));
    ESP_ERROR_CHECK(gptimer_start(timer));

    uint32_t before = 0;
    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(1000));
        uint32_t now = alarms;
        printf("%" PRIu32 " alarms in the last second (expect about 1000)\n", now - before);
        before = now;
    }
}
