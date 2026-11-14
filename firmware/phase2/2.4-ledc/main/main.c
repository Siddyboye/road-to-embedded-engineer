/*
 * Lesson 2.4: PWM with the LEDC peripheral.
 * MODE 0: breathe an LED on OUT_GPIO using the hardware fade.
 * MODE 1: sweep a hobby servo on OUT_GPIO (50 Hz, pulse 1 ms to 2 ms). Power the servo from 5 V, not from a GPIO.
 */
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/ledc.h"
#include "esp_err.h"

#define MODE      0
#define OUT_GPIO  4

#if MODE == 0
#define FREQ_HZ   5000
#define RES_BITS  LEDC_TIMER_13_BIT
#define MAX_DUTY  ((1 << 13) - 1)
#else
#define FREQ_HZ   50
#define RES_BITS  LEDC_TIMER_14_BIT
#define MAX_DUTY  ((1 << 14) - 1)
#define PERIOD_US 20000
#endif

void app_main(void)
{
    ledc_timer_config_t timer = {
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .duty_resolution = RES_BITS,
        .timer_num = LEDC_TIMER_0,
        .freq_hz = FREQ_HZ,
        .clk_cfg = LEDC_AUTO_CLK,
    };
    ESP_ERROR_CHECK(ledc_timer_config(&timer));

    ledc_channel_config_t channel = {
        .gpio_num = OUT_GPIO,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel = LEDC_CHANNEL_0,
        .timer_sel = LEDC_TIMER_0,
        .duty = 0,
        .hpoint = 0,
    };
    ESP_ERROR_CHECK(ledc_channel_config(&channel));

#if MODE == 0
    ESP_ERROR_CHECK(ledc_fade_func_install(0));
    for (;;) {
        ledc_set_fade_with_time(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, MAX_DUTY, 1500);
        ledc_fade_start(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, LEDC_FADE_WAIT_DONE);
        ledc_set_fade_with_time(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, 0, 1500);
        ledc_fade_start(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, LEDC_FADE_WAIT_DONE);
    }
#else
    for (;;) {
        for (int pulse_us = 1000; pulse_us <= 2000; pulse_us += 250) {
            uint32_t duty = (uint32_t)pulse_us * (MAX_DUTY + 1) / PERIOD_US;    /* pulse width as a fraction of 20 ms */
            ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, duty);
            ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
            printf("pulse %d us -> duty %u of %d\n", pulse_us, (unsigned)duty, MAX_DUTY + 1);
            vTaskDelay(pdMS_TO_TICKS(700));
        }
    }
#endif
}
