/*
 * Lesson 3.1, sitting 3: framed messages with a CRC, and NMEA sentences.
 * Self-test: jumper GPIO17 (TX) to GPIO18 (RX). Then replace the jumper with a second board running the same code.
 * Frame: 0x7E, length, payload, CRC-8 over length and payload. The parser is firmware/host/frame.c.
 */
#include <stdio.h>
#include <string.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/uart.h"
#include "esp_err.h"
#include "frame.h"
#include "crc8.h"
#include "nmea.h"

#define PORT     UART_NUM_1
#define TX_GPIO  17
#define RX_GPIO  18

static void send_frame(const uint8_t *payload, uint8_t len)
{
    uint8_t out[FRAME_MAX + 3];
    out[0] = FRAME_SOF;
    out[1] = len;
    memcpy(&out[2], payload, len);
    out[2 + len] = crc8_bitwise(&out[1], (size_t)len + 1);       /* CRC covers the length byte and the payload */
    uart_write_bytes(PORT, out, (size_t)len + 3);
}

static void receiver(void *arg)
{
    (void)arg;
    frame_parser_t parser;
    frame_init(&parser);
    uint32_t good = 0, bad = 0;
    for (;;) {
        uint8_t byte;
        if (uart_read_bytes(PORT, &byte, 1, portMAX_DELAY) != 1) {
            continue;
        }
        switch (frame_feed(&parser, byte)) {
        case FRAME_OK:
            good++;
            printf("frame ok, %u bytes: %.*s   (good %" PRIu32 ", bad %" PRIu32 ")\n", (unsigned)parser.len, (int)parser.len, (const char *)parser.payload, good, bad);
            break;
        case FRAME_BAD_CRC:
        case FRAME_BAD_LENGTH:
            bad++;
            printf("frame rejected   (good %" PRIu32 ", bad %" PRIu32 ")\n", good, bad);
            break;
        default:
            break;
        }
    }
}

void app_main(void)
{
    /* NMEA: check and split one sentence, as a GPS module would send it. */
    char gga[] = "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47";
    printf("NMEA checksum %s\n", nmea_checksum_ok(gga) ? "ok" : "BAD");
    char *field[20];
    int n = nmea_split(gga, field, 20);
    printf("%d fields: type %s, time %s, latitude %s %s, satellites %s\n", n, field[0], field[1], field[2], field[3], field[7]);

    uart_config_t cfg = {
        .baud_rate = 115200,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };
    ESP_ERROR_CHECK(uart_driver_install(PORT, 1024, 0, 0, NULL, 0));
    ESP_ERROR_CHECK(uart_param_config(PORT, &cfg));
    ESP_ERROR_CHECK(uart_set_pin(PORT, TX_GPIO, RX_GPIO, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));
    xTaskCreate(receiver, "rx", 4096, NULL, 5, NULL);

    for (uint32_t i = 0; ; i++) {
        char text[24];
        int len = snprintf(text, sizeof text, "count %" PRIu32, i);
        send_frame((const uint8_t *)text, (uint8_t)len);
        if (i % 5 == 4) {                                        /* every fifth frame is sent corrupted on purpose */
            uint8_t junk[] = { FRAME_SOF, 3, 'b', 'a', 'd', 0x00 };
            uart_write_bytes(PORT, junk, sizeof junk);
        }
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}
