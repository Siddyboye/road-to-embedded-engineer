/*
 * Lesson 2.7: drive an addressable RGB LED from its datasheet timing, with the RMT peripheral.
 * LED_GPIO is the on-board LED of most ESP32-S3 boards: 48 on DevKitC-1 v1.0, 38 on v1.1. Check yours.
 * Timing (WS2812 family): a 0 bit is a short high then a long low, a 1 bit the reverse; colours go out green, red, blue.
 */
#include <stdio.h>
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/rmt_tx.h"
#include "driver/rmt_encoder.h"
#include "esp_err.h"

#define LED_GPIO       48
#define RESOLUTION_HZ  10000000     /* 10 MHz: one tick = 100 ns */
#define T_SHORT        3            /* 0.3 us */
#define T_LONG         9            /* 0.9 us */

static rmt_channel_handle_t channel;
static rmt_encoder_handle_t encoder;

static void show(uint8_t r, uint8_t g, uint8_t b)
{
    uint8_t grb[3] = { g, r, b };
    rmt_transmit_config_t tx = { .loop_count = 0 };
    ESP_ERROR_CHECK(rmt_transmit(channel, encoder, grb, sizeof grb, &tx));
    ESP_ERROR_CHECK(rmt_tx_wait_all_done(channel, 100));
}

/* Hue 0..255 around the colour wheel, at low brightness so it is comfortable to look at. */
static void wheel(uint8_t hue, uint8_t *r, uint8_t *g, uint8_t *b)
{
    uint8_t region = hue / 86, x = (uint8_t)((hue % 86) * 3 / 8);       /* 0..31 */
    uint8_t up = x, down = (uint8_t)(31 - x);
    if (region == 0) { *r = down; *g = up; *b = 0; }
    else if (region == 1) { *r = 0; *g = down; *b = up; }
    else { *r = up; *g = 0; *b = down; }
}

void app_main(void)
{
    rmt_tx_channel_config_t chan_cfg = {
        .clk_src = RMT_CLK_SRC_DEFAULT,
        .gpio_num = LED_GPIO,
        .mem_block_symbols = 64,
        .resolution_hz = RESOLUTION_HZ,
        .trans_queue_depth = 4,
    };
    ESP_ERROR_CHECK(rmt_new_tx_channel(&chan_cfg, &channel));

    rmt_bytes_encoder_config_t enc_cfg = {
        .bit0 = { .level0 = 1, .duration0 = T_SHORT, .level1 = 0, .duration1 = T_LONG },
        .bit1 = { .level0 = 1, .duration0 = T_LONG, .level1 = 0, .duration1 = T_SHORT },
        .flags.msb_first = 1,
    };
    ESP_ERROR_CHECK(rmt_new_bytes_encoder(&enc_cfg, &encoder));
    ESP_ERROR_CHECK(rmt_enable(channel));

    for (uint8_t hue = 0; ; hue++) {
        uint8_t r, g, b;
        wheel(hue, &r, &g, &b);
        show(r, g, b);
        vTaskDelay(pdMS_TO_TICKS(20));      /* the line stays low between frames, far longer than the reset time */
    }
}
