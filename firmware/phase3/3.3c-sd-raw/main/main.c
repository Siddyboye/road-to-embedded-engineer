/*
 * Lesson 3.3, sitting 4: talk to an SD card in SPI mode by hand, as far as reading block 0.
 * SCK GPIO12, MOSI GPIO11, MISO GPIO13, CS GPIO10. Chip select is driven by the driver for every transaction,
 * which SD cards accept. For real file access use the SD and FAT components; this lab shows what they do first.
 */
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/spi_master.h"
#include "esp_err.h"

#define PIN_SCK   12
#define PIN_MOSI  11
#define PIN_MISO  13
#define PIN_CS    10

static spi_device_handle_t card;

static void xfer(const uint8_t *tx, uint8_t *rx, size_t n)
{
    spi_transaction_t t = { .length = n * 8, .tx_buffer = tx, .rx_buffer = rx };
    ESP_ERROR_CHECK(spi_device_polling_transmit(card, &t));
}

/* Sends a 6-byte command and clocks out `extra` more bytes. Returns the R1 status byte and copies what followed it. */
static uint8_t command(uint8_t index, uint32_t arg, uint8_t crc, uint8_t *after, size_t extra)
{
    uint8_t tx[6 + 10 + 8], rx[sizeof tx];
    memset(tx, 0xFF, sizeof tx);                    /* the card needs MOSI high while it answers */
    tx[0] = (uint8_t)(0x40 | index);
    tx[1] = (uint8_t)(arg >> 24); tx[2] = (uint8_t)(arg >> 16); tx[3] = (uint8_t)(arg >> 8); tx[4] = (uint8_t)arg;
    tx[5] = crc;
    size_t n = 6 + 10 + extra;
    xfer(tx, rx, n);
    for (size_t i = 6; i < 6 + 10; i++) {           /* R1 arrives within a few bytes; its top bit is 0 */
        if ((rx[i] & 0x80) == 0) {
            if (after && extra) {
                memcpy(after, &rx[i + 1], extra);
            }
            return rx[i];
        }
    }
    return 0xFF;
}

void app_main(void)
{
    spi_bus_config_t bus = { .mosi_io_num = PIN_MOSI, .miso_io_num = PIN_MISO, .sclk_io_num = PIN_SCK, .quadwp_io_num = -1, .quadhd_io_num = -1 };
    ESP_ERROR_CHECK(spi_bus_initialize(SPI2_HOST, &bus, SPI_DMA_CH_AUTO));
    spi_device_interface_config_t dev = { .clock_speed_hz = 400 * 1000, .mode = 0, .spics_io_num = PIN_CS, .queue_size = 1 };   /* 400 kHz while initialising */
    ESP_ERROR_CHECK(spi_bus_add_device(SPI2_HOST, &dev, &card));
    vTaskDelay(pdMS_TO_TICKS(10));

    /* A card wakes up in its native mode and needs at least 74 clocks with chip select HIGH before the first command.
     * A second "device" with no chip-select pin lets us clock the bus without selecting the card. */
    spi_device_handle_t unselected;
    spi_device_interface_config_t no_cs = { .clock_speed_hz = 400 * 1000, .mode = 0, .spics_io_num = -1, .queue_size = 1 };
    ESP_ERROR_CHECK(spi_bus_add_device(SPI2_HOST, &no_cs, &unselected));
    uint8_t ones[10];
    memset(ones, 0xFF, sizeof ones);
    spi_transaction_t wake = { .length = sizeof ones * 8, .tx_buffer = ones };
    ESP_ERROR_CHECK(spi_device_polling_transmit(unselected, &wake));

    uint8_t r1 = 0xFF;
    for (int i = 0; i < 10 && r1 != 0x01; i++) {
        r1 = command(0, 0, 0x95, NULL, 0);          /* CMD0: go idle. The CRC must be right for this one command */
    }
    printf("CMD0  -> 0x%02X (0x01 = idle, card present)\n", r1);
    if (r1 != 0x01) {
        printf("no card answered: check wiring, the 3.3 V supply and the pull-up on MISO\n");
        return;
    }

    uint8_t echo[4] = { 0 };
    r1 = command(8, 0x000001AA, 0x87, echo, 4);     /* CMD8: voltage check; version 2 cards echo 0x1AA */
    printf("CMD8  -> 0x%02X, echo %02X %02X %02X %02X\n", r1, echo[0], echo[1], echo[2], echo[3]);

    for (int i = 0; i < 200; i++) {                 /* ACMD41 = CMD55 then CMD41, repeated until the card leaves idle */
        command(55, 0, 0x01, NULL, 0);
        r1 = command(41, 0x40000000, 0x01, NULL, 0);
        if (r1 == 0x00) {
            break;
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }
    printf("ACMD41 -> 0x%02X (0x00 = ready)\n", r1);

    uint8_t ocr[4] = { 0 };
    command(58, 0, 0x01, ocr, 4);                   /* CMD58: read the OCR; bit 30 set means block addressing (SDHC) */
    printf("CMD58 OCR %02X %02X %02X %02X: %s\n", ocr[0], ocr[1], ocr[2], ocr[3], (ocr[0] & 0x40) ? "high capacity, block addressed" : "standard capacity, byte addressed");

    /* CMD17: read one block. After R1 the card sends 0xFF fill bytes, then the token 0xFE, 512 data bytes and a CRC. */
    static uint8_t tx[6 + 700], rx[sizeof tx];
    memset(tx, 0xFF, sizeof tx);
    tx[0] = 0x40 | 17; tx[1] = tx[2] = tx[3] = tx[4] = 0; tx[5] = 0x01;
    xfer(tx, rx, sizeof tx);
    for (size_t i = 6; i + 512 < sizeof rx; i++) {
        if (rx[i] == 0xFE) {
            const uint8_t *block = &rx[i + 1];
            printf("block 0 read. Last two bytes: %02X %02X (55 AA marks a valid boot sector)\n", block[510], block[511]);
            return;
        }
    }
    printf("no data token found after CMD17\n");
}
