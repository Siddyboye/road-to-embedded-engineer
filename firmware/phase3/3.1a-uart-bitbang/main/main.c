/*
 * Lesson 3.1, sitting 1: UART by hand, checked against the hardware UART.
 * Jumper A: SOFT_TX (GPIO6)  -> UART1 RX (GPIO7).   Our bit-banged transmitter, received by the peripheral.
 * Jumper B: UART1 TX (GPIO17) -> SOFT_RX (GPIO18).  The peripheral transmits, our bit-banged receiver decodes.
 * 9600 baud, 8N1. Put the logic analyzer on both jumpers.
 */
#include <stdio.h>
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "driver/uart.h"
#include "esp_rom_sys.h"
#include "esp_timer.h"
#include "esp_err.h"

#define SOFT_TX   GPIO_NUM_6
#define HARD_RX   GPIO_NUM_7
#define HARD_TX   GPIO_NUM_17
#define SOFT_RX   GPIO_NUM_18
#define BAUD      9600
#define BIT_US    (1000000 / BAUD)

static portMUX_TYPE lock = portMUX_INITIALIZER_UNLOCKED;

static void soft_tx(uint8_t byte)
{
    taskENTER_CRITICAL(&lock);                      /* an interrupt inside a bit would stretch it */
    gpio_set_level(SOFT_TX, 0);                     /* start bit */
    esp_rom_delay_us(BIT_US);
    for (int i = 0; i < 8; i++) {                   /* least significant bit first */
        gpio_set_level(SOFT_TX, (byte >> i) & 1);
        esp_rom_delay_us(BIT_US);
    }
    gpio_set_level(SOFT_TX, 1);                     /* stop bit, and back to idle */
    esp_rom_delay_us(BIT_US);
    taskEXIT_CRITICAL(&lock);
}

/* Waits up to timeout_us for a start bit, then samples eight bits in the middle of each. Returns -1 on timeout or framing error. */
static int soft_rx(int timeout_us)
{
    int64_t deadline = esp_timer_get_time() + timeout_us;
    while (gpio_get_level(SOFT_RX) == 1) {
        if (esp_timer_get_time() > deadline) {
            return -1;
        }
    }
    taskENTER_CRITICAL(&lock);
    esp_rom_delay_us(BIT_US + BIT_US / 2);          /* skip the start bit and land mid-way through bit 0 */
    int byte = 0;
    for (int i = 0; i < 8; i++) {
        byte |= gpio_get_level(SOFT_RX) << i;
        esp_rom_delay_us(BIT_US);
    }
    int stop = gpio_get_level(SOFT_RX);
    taskEXIT_CRITICAL(&lock);
    return stop ? byte : -1;                        /* a low stop bit is a framing error */
}

void app_main(void)
{
    gpio_reset_pin(SOFT_TX);
    gpio_set_direction(SOFT_TX, GPIO_MODE_OUTPUT);
    gpio_set_level(SOFT_TX, 1);                     /* idle high */
    gpio_reset_pin(SOFT_RX);
    gpio_set_direction(SOFT_RX, GPIO_MODE_INPUT);
    gpio_set_pull_mode(SOFT_RX, GPIO_PULLUP_ONLY);

    uart_config_t cfg = {
        .baud_rate = BAUD,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };
    ESP_ERROR_CHECK(uart_driver_install(UART_NUM_1, 256, 0, 0, NULL, 0));
    ESP_ERROR_CHECK(uart_param_config(UART_NUM_1, &cfg));
    ESP_ERROR_CHECK(uart_set_pin(UART_NUM_1, HARD_TX, HARD_RX, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));

    for (uint8_t value = 0x41; ; value = (value == 0x5A) ? 0x41 : (uint8_t)(value + 1)) {
        /* Direction 1: we transmit by hand, the peripheral receives. */
        soft_tx(value);
        uint8_t got = 0;
        int n = uart_read_bytes(UART_NUM_1, &got, 1, pdMS_TO_TICKS(50));
        printf("soft tx 0x%02X -> hard rx %s0x%02X   ", value, n == 1 ? "" : "nothing, last ", got);

        /* Direction 2: the peripheral transmits, we receive by hand. */
        uart_write_bytes(UART_NUM_1, &value, 1);
        int r = soft_rx(50000);
        printf("hard tx 0x%02X -> soft rx %d %s\n", value, r, r == value ? "ok" : "MISMATCH");
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}
