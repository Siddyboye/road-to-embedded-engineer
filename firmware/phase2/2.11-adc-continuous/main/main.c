/*
 * Lesson 2.11: continuous ADC sampling by DMA. Samples arrive in blocks; the task wakes once per block.
 * Feed ADC_GPIO from a potentiometer, or from the PWM output of lab 0.8.
 * Follows ESP-IDF v6.1's continuous_read example.
 */
#include <stdio.h>
#include <string.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "soc/soc_caps.h"
#include "esp_adc/adc_continuous.h"
#include "esp_attr.h"
#include "esp_timer.h"
#include "esp_err.h"

#define ADC_GPIO        4
#define SAMPLE_RATE_HZ  20000
#define FRAME_BYTES     1024            /* bytes handed over per "conversion done" event */
#define MAX_SAMPLES     (FRAME_BYTES / SOC_ADC_DIGI_RESULT_BYTES)

static TaskHandle_t reader;

static bool IRAM_ATTR on_frame(adc_continuous_handle_t handle, const adc_continuous_evt_data_t *edata, void *user_data)
{
    (void)handle; (void)edata; (void)user_data;
    BaseType_t woken = pdFALSE;
    vTaskNotifyGiveFromISR(reader, &woken);     /* the ISR only wakes the task; the driver already moved the data */
    return woken == pdTRUE;
}

void app_main(void)
{
    reader = xTaskGetCurrentTaskHandle();

    adc_unit_t unit;
    adc_channel_t channel;
    ESP_ERROR_CHECK(adc_continuous_io_to_channel(ADC_GPIO, &unit, &channel));

    adc_continuous_handle_t adc = NULL;
    adc_continuous_handle_cfg_t handle_cfg = { .max_store_buf_size = 4 * FRAME_BYTES, .conv_frame_size = FRAME_BYTES };
    ESP_ERROR_CHECK(adc_continuous_new_handle(&handle_cfg, &adc));

    adc_digi_pattern_config_t pattern[1] = { {
        .atten = ADC_ATTEN_DB_12,
        .channel = channel & 0x7,
        .unit = unit,
        .bit_width = SOC_ADC_DIGI_MAX_BITWIDTH,
    } };
    adc_continuous_config_t cfg = {
        .sample_freq_hz = SAMPLE_RATE_HZ,
        .conv_mode = ADC_CONV_SINGLE_UNIT_1,
        .pattern_num = 1,
        .adc_pattern = pattern,
    };
    ESP_ERROR_CHECK(adc_continuous_config(adc, &cfg));

    adc_continuous_evt_cbs_t cbs = { .on_conv_done = on_frame };
    ESP_ERROR_CHECK(adc_continuous_register_event_callbacks(adc, &cbs, NULL));
    ESP_ERROR_CHECK(adc_continuous_start(adc));

    static uint8_t raw[FRAME_BYTES];
    static adc_continuous_data_t parsed[MAX_SAMPLES];
    uint32_t samples = 0, wakeups = 0, lo = UINT32_MAX, hi = 0;
    uint64_t sum = 0;
    int64_t t0 = esp_timer_get_time();

    for (;;) {
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
        wakeups++;
        uint32_t got = 0;
        while (adc_continuous_read(adc, raw, sizeof raw, &got, 0) == ESP_OK) {      /* drain everything that is ready */
            uint32_t n = 0;
            if (adc_continuous_parse_data(adc, raw, got, parsed, &n) != ESP_OK) {
                continue;
            }
            for (uint32_t i = 0; i < n; i++) {
                if (!parsed[i].valid) {
                    continue;
                }
                uint32_t v = parsed[i].raw_data;
                if (v < lo) lo = v;
                if (v > hi) hi = v;
                sum += v;
                samples++;
            }
        }
        if (esp_timer_get_time() - t0 >= 1000000) {
            printf("%" PRIu32 " samples/s in %" PRIu32 " wake-ups: min %" PRIu32 " max %" PRIu32 " mean %" PRIu32 "\n",
                   samples, wakeups, lo, hi, samples ? (uint32_t)(sum / samples) : 0);
            samples = wakeups = hi = 0;
            lo = UINT32_MAX;
            sum = 0;
            t0 = esp_timer_get_time();
        }
    }
}
