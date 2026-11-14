/*
 * Lesson 3.3, sitting 4: MCP3008 10-bit ADC. SCK GPIO12, MOSI GPIO11, MISO GPIO13, CS GPIO10, mode 0.
 * A reading is one 3-byte transfer: a start bit, then "single-ended" plus the channel, then the result clocks out.
 */
#include <stdio.h>
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/spi_master.h"
#include "esp_err.h"
#include "convert.h"

static spi_device_handle_t adc;

static uint16_t read_channel(uint8_t channel)
{
    uint8_t tx[3] = { 0x01, (uint8_t)(0x80 | (channel << 4)), 0x00 }, rx[3] = { 0 };
    spi_transaction_t t = { .length = 24, .tx_buffer = tx, .rx_buffer = rx };
    ESP_ERROR_CHECK(spi_device_polling_transmit(adc, &t));
    return mcp3008_decode(rx);                      /* low two bits of byte 1, then all of byte 2 */
}

void app_main(void)
{
    spi_bus_config_t bus = { .mosi_io_num = 11, .miso_io_num = 13, .sclk_io_num = 12, .quadwp_io_num = -1, .quadhd_io_num = -1 };
    ESP_ERROR_CHECK(spi_bus_initialize(SPI2_HOST, &bus, SPI_DMA_CH_AUTO));
    spi_device_interface_config_t dev = { .clock_speed_hz = 1000 * 1000, .mode = 0, .spics_io_num = 10, .queue_size = 1 };
    ESP_ERROR_CHECK(spi_bus_add_device(SPI2_HOST, &dev, &adc));

    for (;;) {
        uint16_t raw = read_channel(0);
        printf("channel 0: %4u of 1023 = %u mV at a 3.3 V reference\n", raw, (unsigned)(raw * 3300u / 1023u));
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}
