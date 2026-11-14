/*
 * Lesson 0.8: sample a 100 Hz square wave at a rate you choose, and watch it alias.
 * Wire WAVE_GPIO to ADC_GPIO with one jumper. ESP32-S3 only: both pins are ADC1-capable there.
 * Try SAMPLE_HZ 2000, then 110, then 100.
 */
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/ledc.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_timer.h"
#include "esp_err.h"

#define WAVE_GPIO   6
#define ADC_GPIO    4
#define WAVE_HZ     100
#define SAMPLE_HZ   2000
#define N_SAMPLES   200

static adc_oneshot_unit_handle_t adc;
static adc_channel_t channel;
static int samples[N_SAMPLES];
static volatile int count;

static void take_sample(void *arg)
{
    (void)arg;
    if (count < N_SAMPLES) {
        int raw = 0;
        adc_oneshot_read(adc, channel, &raw);
        samples[count] = raw;
        count = count + 1;
    }
}

void app_main(void)
{
    /* 100 Hz, 50% duty square wave from the LEDC timer peripheral. */
    ledc_timer_config_t timer = {
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .duty_resolution = LEDC_TIMER_10_BIT,
        .timer_num = LEDC_TIMER_0,
        .freq_hz = WAVE_HZ,
        .clk_cfg = LEDC_AUTO_CLK,
    };
    ESP_ERROR_CHECK(ledc_timer_config(&timer));
    ledc_channel_config_t wave = {
        .gpio_num = WAVE_GPIO,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel = LEDC_CHANNEL_0,
        .timer_sel = LEDC_TIMER_0,
        .duty = 512,
        .hpoint = 0,
    };
    ESP_ERROR_CHECK(ledc_channel_config(&wave));

    /* One-shot ADC on the pin's own unit and channel. */
    adc_unit_t unit;
    ESP_ERROR_CHECK(adc_oneshot_io_to_channel(ADC_GPIO, &unit, &channel));
    adc_oneshot_unit_init_cfg_t unit_cfg = { .unit_id = unit };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&unit_cfg, &adc));
    adc_oneshot_chan_cfg_t chan_cfg = { .bitwidth = ADC_BITWIDTH_DEFAULT, .atten = ADC_ATTEN_DB_12 };
    ESP_ERROR_CHECK(adc_oneshot_config_channel(adc, channel, &chan_cfg));

    /* Sample from a periodic hardware-backed timer so the sample instants are evenly spaced. */
    const esp_timer_create_args_t args = { .callback = take_sample, .name = "sample" };
    esp_timer_handle_t sampler;
    ESP_ERROR_CHECK(esp_timer_create(&args, &sampler));

    for (;;) {
        count = 0;
        ESP_ERROR_CHECK(esp_timer_start_periodic(sampler, 1000000 / SAMPLE_HZ));
        while (count < N_SAMPLES) {
            vTaskDelay(1);
        }
        ESP_ERROR_CHECK(esp_timer_stop(sampler));

        printf("--- %d samples at %d Hz of a %d Hz wave ---\n", N_SAMPLES, SAMPLE_HZ, WAVE_HZ);
        for (int i = 0; i < N_SAMPLES; i++) {
            printf("%d\n", samples[i]);
        }
        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}
