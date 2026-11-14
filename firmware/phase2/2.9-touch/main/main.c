/*
 * Lesson 2.9: capacitive touch on the ESP32-S3, with a threshold derived from the untouched baseline.
 * Attach a short jumper wire to the pin printed at start-up (touch channel 7 is GPIO7) and touch its free end.
 * Follows the structure of ESP-IDF v6.1's touch_sens_basic example, reduced to one channel.
 */
#include <stdio.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/touch_sens.h"
#include "driver/gpio.h"
#include "esp_attr.h"
#include "esp_err.h"

#define TOUCH_CHANNEL   7
#define LED_GPIO        GPIO_NUM_4
#define THRESHOLD_RATIO 0.015f          /* active when the reading rises 1.5% above the baseline; tune this */

static volatile bool touched;

static bool on_active(touch_sensor_handle_t sens, const touch_active_event_data_t *event, void *user_ctx)
{
    (void)sens; (void)event; (void)user_ctx;
    touched = true;
    gpio_set_level(LED_GPIO, 1);
    return false;
}

static bool on_inactive(touch_sensor_handle_t sens, const touch_inactive_event_data_t *event, void *user_ctx)
{
    (void)sens; (void)event; (void)user_ctx;
    touched = false;
    gpio_set_level(LED_GPIO, 0);
    return false;
}

void app_main(void)
{
    gpio_reset_pin(LED_GPIO);
    gpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);

    /* 1. The controller, with one sample configuration. */
    touch_sensor_handle_t sens = NULL;
    touch_sensor_sample_config_t sample_cfg[TOUCH_SAMPLE_CFG_NUM] = {
        TOUCH_SENSOR_V2_DEFAULT_SAMPLE_CONFIG(500, TOUCH_VOLT_LIM_L_0V5, TOUCH_VOLT_LIM_H_2V2)
    };
    touch_sensor_config_t sens_cfg = TOUCH_SENSOR_DEFAULT_BASIC_CONFIG(1, sample_cfg);
    ESP_ERROR_CHECK(touch_sensor_new_controller(&sens_cfg, &sens));

    /* 2. One channel, with a placeholder threshold that step 4 replaces. */
    touch_channel_handle_t chan = NULL;
    touch_channel_config_t chan_cfg = {
        .active_thresh = { 2000 },
        .charge_speed = TOUCH_CHARGE_SPEED_7,
        .init_charge_volt = TOUCH_INIT_CHARGE_VOLT_DEFAULT,
    };
    ESP_ERROR_CHECK(touch_sensor_new_channel(sens, TOUCH_CHANNEL, &chan_cfg, &chan));
    touch_chan_info_t info = { 0 };
    ESP_ERROR_CHECK(touch_sensor_get_channel_info(chan, &info));
    printf("touch channel %d is GPIO%d\n", TOUCH_CHANNEL, (int)info.chan_gpio);

    /* 3. The hardware filter that tracks the slowly drifting baseline ("benchmark"). */
    touch_sensor_filter_config_t filter_cfg = TOUCH_SENSOR_DEFAULT_FILTER_CONFIG();
    ESP_ERROR_CHECK(touch_sensor_config_filter(sens, &filter_cfg));

    /* 4. Scan a few times untouched, read the baseline, and set the threshold relative to it. Do not touch the wire yet. */
    ESP_ERROR_CHECK(touch_sensor_enable(sens));
    for (int i = 0; i < 3; i++) {
        ESP_ERROR_CHECK(touch_sensor_trigger_oneshot_scanning(sens, 2000));
    }
    ESP_ERROR_CHECK(touch_sensor_disable(sens));
    uint32_t benchmark[TOUCH_SAMPLE_CFG_NUM] = { 0 };
    ESP_ERROR_CHECK(touch_channel_read_data(chan, TOUCH_CHAN_DATA_TYPE_BENCHMARK, benchmark));
    chan_cfg.active_thresh[0] = (uint32_t)((float)benchmark[0] * THRESHOLD_RATIO);
    ESP_ERROR_CHECK(touch_sensor_reconfig_channel(chan, &chan_cfg));
    printf("baseline %" PRIu32 ", threshold %" PRIu32 " above it\n", benchmark[0], chan_cfg.active_thresh[0]);

    /* 5. Events, then continuous scanning. */
    touch_event_callbacks_t callbacks = { .on_active = on_active, .on_inactive = on_inactive };
    ESP_ERROR_CHECK(touch_sensor_register_callbacks(sens, &callbacks, NULL));
    ESP_ERROR_CHECK(touch_sensor_enable(sens));
    ESP_ERROR_CHECK(touch_sensor_start_continuous_scanning(sens));

    for (;;) {
        uint32_t smooth[TOUCH_SAMPLE_CFG_NUM] = { 0 };
        ESP_ERROR_CHECK(touch_channel_read_data(chan, TOUCH_CHAN_DATA_TYPE_BENCHMARK, benchmark));
        ESP_ERROR_CHECK(touch_channel_read_data(chan, TOUCH_CHAN_DATA_TYPE_SMOOTH, smooth));
        printf("baseline %6" PRIu32 "  reading %6" PRIu32 "  difference %6" PRId32 "  %s\n",
               benchmark[0], smooth[0], (int32_t)(smooth[0] - benchmark[0]), touched ? "TOUCHED" : "");
        vTaskDelay(pdMS_TO_TICKS(300));
    }
}
