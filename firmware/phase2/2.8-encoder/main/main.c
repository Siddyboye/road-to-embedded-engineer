/*
 * Lesson 2.8: decode a rotary encoder with the pulse-counter peripheral in quadrature mode.
 * KY-040: CLK to A_GPIO, DT to B_GPIO, + to 3.3 V, GND to GND. Four counts per detent on most parts.
 */
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/pulse_cnt.h"
#include "esp_err.h"

#define A_GPIO  1
#define B_GPIO  2

void app_main(void)
{
    pcnt_unit_handle_t unit;
    pcnt_unit_config_t unit_cfg = { .high_limit = 10000, .low_limit = -10000 };
    ESP_ERROR_CHECK(pcnt_new_unit(&unit_cfg, &unit));

    pcnt_glitch_filter_config_t filter = { .max_glitch_ns = 1000 };     /* ignore pulses shorter than 1 us */
    ESP_ERROR_CHECK(pcnt_unit_set_glitch_filter(unit, &filter));

    /* Two channels, each watching one signal's edges and using the other as the direction. Together: 4 counts per cycle. */
    pcnt_channel_handle_t chan_a, chan_b;
    pcnt_chan_config_t a_cfg = { .edge_gpio_num = A_GPIO, .level_gpio_num = B_GPIO };
    pcnt_chan_config_t b_cfg = { .edge_gpio_num = B_GPIO, .level_gpio_num = A_GPIO };
    ESP_ERROR_CHECK(pcnt_new_channel(unit, &a_cfg, &chan_a));
    ESP_ERROR_CHECK(pcnt_new_channel(unit, &b_cfg, &chan_b));
    ESP_ERROR_CHECK(pcnt_channel_set_edge_action(chan_a, PCNT_CHANNEL_EDGE_ACTION_DECREASE, PCNT_CHANNEL_EDGE_ACTION_INCREASE));
    ESP_ERROR_CHECK(pcnt_channel_set_level_action(chan_a, PCNT_CHANNEL_LEVEL_ACTION_KEEP, PCNT_CHANNEL_LEVEL_ACTION_INVERSE));
    ESP_ERROR_CHECK(pcnt_channel_set_edge_action(chan_b, PCNT_CHANNEL_EDGE_ACTION_INCREASE, PCNT_CHANNEL_EDGE_ACTION_DECREASE));
    ESP_ERROR_CHECK(pcnt_channel_set_level_action(chan_b, PCNT_CHANNEL_LEVEL_ACTION_KEEP, PCNT_CHANNEL_LEVEL_ACTION_INVERSE));

    ESP_ERROR_CHECK(pcnt_unit_enable(unit));
    ESP_ERROR_CHECK(pcnt_unit_clear_count(unit));
    ESP_ERROR_CHECK(pcnt_unit_start(unit));

    int last = 0;
    for (;;) {
        int count = 0;
        ESP_ERROR_CHECK(pcnt_unit_get_count(unit, &count));
        if (count != last) {
            printf("count %d  (%+d since last print)\n", count, count - last);
            last = count;
        }
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
