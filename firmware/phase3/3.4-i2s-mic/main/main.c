/*
 * Lesson 3.4: capture audio from an INMP441 I2S microphone and print the level.
 * BCLK (SCK) GPIO15, WS GPIO16, SD (data out of the microphone) GPIO17. Tie the microphone's L/R pin to GND: left channel.
 * 16 kHz, 32-bit slots; the microphone's 24 significant bits sit at the top of each slot.
 */
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/i2s_std.h"
#include "esp_err.h"

#define PIN_BCLK  15
#define PIN_WS    16
#define PIN_DIN   17
#define RATE_HZ   16000
#define BLOCK     1600              /* 100 ms of samples */

void app_main(void)
{
    i2s_chan_handle_t rx;
    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
    ESP_ERROR_CHECK(i2s_new_channel(&chan_cfg, NULL, &rx));

    i2s_std_config_t std_cfg = {
        .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(RATE_HZ),
        .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_32BIT, I2S_SLOT_MODE_MONO),
        .gpio_cfg = { .mclk = I2S_GPIO_UNUSED, .bclk = PIN_BCLK, .ws = PIN_WS, .dout = I2S_GPIO_UNUSED, .din = PIN_DIN },
    };
    std_cfg.slot_cfg.slot_mask = I2S_STD_SLOT_LEFT;
    ESP_ERROR_CHECK(i2s_channel_init_std_mode(rx, &std_cfg));
    ESP_ERROR_CHECK(i2s_channel_enable(rx));

    static int32_t samples[BLOCK];
    for (;;) {
        size_t got = 0;
        if (i2s_channel_read(rx, samples, sizeof samples, &got, pdMS_TO_TICKS(1000)) != ESP_OK) {
            printf("read timed out\n");
            continue;
        }
        int n = (int)(got / sizeof samples[0]);
        int32_t peak = 0;
        int64_t sum = 0;
        for (int i = 0; i < n; i++) {
            int32_t s = samples[i] >> 16;           /* keep the top 16 bits */
            sum += s;
            if (abs(s) > peak) {
                peak = abs(s);
            }
        }
        int bars = (int)(peak / 400);
        printf("peak %5d  mean %5d  %.*s\n", (int)peak, n ? (int)(sum / n) : 0, bars > 60 ? 60 : bars,
               "############################################################");
    }
}
