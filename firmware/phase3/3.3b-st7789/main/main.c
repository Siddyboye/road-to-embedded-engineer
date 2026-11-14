/*
 * Lesson 3.3, sitting 3: an ST7789 240x240 display from its command table, over the SPI master driver.
 * SCK GPIO12, MOSI GPIO11, CS GPIO10, DC GPIO14, RST GPIO15. The DC pin says whether a byte is a command or data.
 * Modules without a CS pin usually need SPI mode 3: change SPI_MODE and tie nothing to CS.
 */
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "driver/spi_master.h"
#include "esp_timer.h"
#include "esp_err.h"

#define PIN_SCK   12
#define PIN_MOSI  11
#define PIN_CS    10
#define PIN_DC    GPIO_NUM_14
#define PIN_RST   GPIO_NUM_15
#define SPI_MODE  0
#define W 240
#define H 240

static spi_device_handle_t lcd;

static void send(int is_data, const uint8_t *bytes, size_t n)
{
    gpio_set_level(PIN_DC, is_data);
    spi_transaction_t t = { .length = n * 8, .tx_buffer = bytes };
    ESP_ERROR_CHECK(spi_device_polling_transmit(lcd, &t));
}
static void cmd(uint8_t c) { send(0, &c, 1); }
static void cmd_data(uint8_t c, const uint8_t *d, size_t n) { cmd(c); send(1, d, n); }

static void window(int x0, int y0, int x1, int y1)
{
    const uint8_t cols[4] = { (uint8_t)(x0 >> 8), (uint8_t)x0, (uint8_t)(x1 >> 8), (uint8_t)x1 };   /* big-endian */
    const uint8_t rows[4] = { (uint8_t)(y0 >> 8), (uint8_t)y0, (uint8_t)(y1 >> 8), (uint8_t)y1 };
    cmd_data(0x2A, cols, 4);        /* CASET: column address set */
    cmd_data(0x2B, rows, 4);        /* RASET: row address set */
    cmd(0x2C);                      /* RAMWR: pixels follow */
}

/* RGB565, sent high byte first: the panel is big-endian and the ESP32 is not. */
static void fill(int x, int y, int w, int h, uint16_t colour)
{
    static uint8_t line[W * 2];
    for (int i = 0; i < w; i++) {
        line[2 * i] = (uint8_t)(colour >> 8);
        line[2 * i + 1] = (uint8_t)colour;
    }
    window(x, y, x + w - 1, y + h - 1);
    for (int row = 0; row < h; row++) {
        send(1, line, (size_t)w * 2);
    }
}

void app_main(void)
{
    gpio_config_t pins = { .pin_bit_mask = (1ULL << PIN_DC) | (1ULL << PIN_RST), .mode = GPIO_MODE_OUTPUT };
    gpio_config(&pins);

    spi_bus_config_t bus = { .mosi_io_num = PIN_MOSI, .miso_io_num = -1, .sclk_io_num = PIN_SCK, .quadwp_io_num = -1, .quadhd_io_num = -1, .max_transfer_sz = W * 2 };
    ESP_ERROR_CHECK(spi_bus_initialize(SPI2_HOST, &bus, SPI_DMA_CH_AUTO));
    spi_device_interface_config_t dev = { .clock_speed_hz = 20 * 1000 * 1000, .mode = SPI_MODE, .spics_io_num = PIN_CS, .queue_size = 1 };
    ESP_ERROR_CHECK(spi_bus_add_device(SPI2_HOST, &dev, &lcd));

    gpio_set_level(PIN_RST, 0); vTaskDelay(pdMS_TO_TICKS(20));
    gpio_set_level(PIN_RST, 1); vTaskDelay(pdMS_TO_TICKS(120));
    cmd(0x01); vTaskDelay(pdMS_TO_TICKS(150));                  /* SWRESET */
    cmd(0x11); vTaskDelay(pdMS_TO_TICKS(120));                  /* SLPOUT: leave sleep */
    cmd_data(0x3A, (const uint8_t[]){ 0x55 }, 1);               /* COLMOD: 16 bits per pixel */
    cmd_data(0x36, (const uint8_t[]){ 0x00 }, 1);               /* MADCTL: default orientation, RGB order */
    cmd(0x21);                                                  /* INVON: most ST7789 panels need inversion on */
    cmd(0x13);                                                  /* NORON */
    cmd(0x29);                                                  /* DISPON */

    const uint16_t colours[] = { 0xF800, 0x07E0, 0x001F, 0xFFFF, 0x0000 };     /* red, green, blue, white, black */
    for (int i = 0; ; i = (i + 1) % 5) {
        int64_t t0 = esp_timer_get_time();
        fill(0, 0, W, H, colours[i]);
        printf("full-screen fill in %lld ms\n", (long long)((esp_timer_get_time() - t0) / 1000));
        fill(60, 60, 120, 120, colours[(i + 1) % 5]);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}
