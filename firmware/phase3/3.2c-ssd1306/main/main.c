/*
 * Lesson 3.2, sitting 4: an SSD1306 128x64 OLED from its datasheet. SDA GPIO8, SCL GPIO9, address 0x3C.
 * Every transfer starts with a control byte: 0x00 means "commands follow", 0x40 means "display data follows".
 * Draws a counter in a tiny 3x5 digit font, scaled up, and a moving bar.
 */
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/i2c_master.h"
#include "esp_err.h"

#define SDA_GPIO  8
#define SCL_GPIO  9
#define OLED_ADDR 0x3C
#define W 128
#define H 64

static i2c_master_bus_handle_t bus;
static i2c_master_dev_handle_t dev;

static void bus_open(uint8_t address)
{
    i2c_master_bus_config_t bus_cfg = {
        .i2c_port = I2C_NUM_0,
        .sda_io_num = SDA_GPIO,
        .scl_io_num = SCL_GPIO,
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .glitch_ignore_cnt = 7,
        .flags.enable_internal_pullup = true,
    };
    ESP_ERROR_CHECK(i2c_new_master_bus(&bus_cfg, &bus));
    i2c_device_config_t dev_cfg = { .dev_addr_length = I2C_ADDR_BIT_LEN_7, .device_address = address, .scl_speed_hz = 400000 };
    ESP_ERROR_CHECK(i2c_master_bus_add_device(bus, &dev_cfg, &dev));
}

static uint8_t frame[1 + W * H / 8];               /* control byte, then one bit per pixel in 8 pages of 128 columns */
#define FB (&frame[1])

static void commands(const uint8_t *cmd, size_t n)
{
    uint8_t out[32] = { 0x00 };
    memcpy(&out[1], cmd, n);
    ESP_ERROR_CHECK(i2c_master_transmit(dev, out, n + 1, 100));
}

static void flush(void)
{
    const uint8_t window[] = { 0x21, 0, W - 1, 0x22, 0, H / 8 - 1 };    /* column range, page range */
    commands(window, sizeof window);
    frame[0] = 0x40;
    ESP_ERROR_CHECK(i2c_master_transmit(dev, frame, sizeof frame, 200));
}

static void pixel(int x, int y, int on)
{
    if (x < 0 || x >= W || y < 0 || y >= H) {
        return;
    }
    if (on) FB[x + (y / 8) * W] |= (uint8_t)(1u << (y % 8));
    else    FB[x + (y / 8) * W] &= (uint8_t)~(1u << (y % 8));
}

static void rect(int x, int y, int w, int h)
{
    for (int j = 0; j < h; j++) for (int i = 0; i < w; i++) pixel(x + i, y + j, 1);
}

/* Digits 0 to 9, five rows of three bits each, top row first. */
static const uint8_t DIGIT[10][5] = {
    {7,5,5,5,7}, {2,6,2,2,7}, {7,1,7,4,7}, {7,1,7,1,7}, {5,5,7,1,1},
    {7,4,7,1,7}, {7,4,7,5,7}, {7,1,1,1,1}, {7,5,7,5,7}, {7,5,7,1,7},
};
static void digit(int x, int y, int d, int scale)
{
    for (int row = 0; row < 5; row++) for (int col = 0; col < 3; col++) {
        if (DIGIT[d][row] & (4 >> col)) rect(x + col * scale, y + row * scale, scale, scale);
    }
}
static void number(int x, int y, unsigned value, int scale)
{
    char text[8];
    int n = snprintf(text, sizeof text, "%04u", value % 10000);
    for (int i = 0; i < n; i++) digit(x + i * 4 * scale, y, text[i] - '0', scale);
}

void app_main(void)
{
    bus_open(OLED_ADDR);
    /* Initialisation for a 128x64 panel with the internal charge pump, from the SSD1306 application note. */
    const uint8_t init[] = {
        0xAE,             /* display off */
        0xD5, 0x80,       /* clock divide */
        0xA8, 0x3F,       /* multiplex ratio: 64 rows */
        0xD3, 0x00,       /* display offset */
        0x40,             /* start line 0 */
        0x8D, 0x14,       /* charge pump on */
        0x20, 0x00,       /* horizontal addressing mode */
        0xA1, 0xC8,       /* segment remap, COM scan direction: puts (0,0) top left */
        0xDA, 0x12,       /* COM pin configuration */
        0x81, 0xCF,       /* contrast */
        0xD9, 0xF1,       /* pre-charge */
        0xDB, 0x40,       /* VCOMH level */
        0xA4, 0xA6,       /* follow RAM, not inverted */
        0xAF,             /* display on */
    };
    commands(init, sizeof init);

    for (unsigned n = 0; ; n++) {
        memset(FB, 0, W * H / 8);
        number(8, 8, n, 7);                         /* 4 digits, each 21x35 pixels */
        rect(0, 56, (int)(n % W), 6);               /* a bar that grows across the bottom */
        flush();
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
