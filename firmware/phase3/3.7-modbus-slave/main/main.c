/*
 * Lesson 3.7: a Modbus RTU slave serving four holding registers. The protocol logic is firmware/host/modbus.c.
 * RS-485 module: DI to GPIO17 (TX), RO to GPIO18 (RX), DE and RE joined to GPIO21. 9600 8N1, unit address 1.
 * Test from a PC with any Modbus master tool: read 4 holding registers from address 0.
 * Frames are delimited by silence. This lab uses a 20 ms gap, coarser than the standard's 3.5 character times,
 * which is fine for a master that polls no faster than every 50 ms.
 */
#include <stdio.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/uart.h"
#include "esp_timer.h"
#include "esp_system.h"
#include "esp_err.h"
#include "modbus.h"

#define PORT     UART_NUM_1
#define TX_GPIO  17
#define RX_GPIO  18
#define DE_GPIO  21
#define UNIT     1

static uint16_t holding[4];     /* 0: uptime in seconds, 1: free heap in KB, 2 and 3: writable by the master */

void app_main(void)
{
    uart_config_t cfg = {
        .baud_rate = 9600,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };
    ESP_ERROR_CHECK(uart_driver_install(PORT, 512, 0, 0, NULL, 0));
    ESP_ERROR_CHECK(uart_param_config(PORT, &cfg));
    ESP_ERROR_CHECK(uart_set_pin(PORT, TX_GPIO, RX_GPIO, DE_GPIO, UART_PIN_NO_CHANGE));       /* RTS drives the transceiver's enable */
    ESP_ERROR_CHECK(uart_set_mode(PORT, UART_MODE_RS485_HALF_DUPLEX));

    uint8_t req[64], resp[64];
    uint32_t served = 0;
    for (;;) {
        int len = uart_read_bytes(PORT, req, 1, portMAX_DELAY);         /* wait for the first byte of a frame */
        while (len > 0 && len < (int)sizeof req) {
            int more = uart_read_bytes(PORT, &req[len], sizeof req - (size_t)len, pdMS_TO_TICKS(20));
            if (more <= 0) {
                break;                                                  /* silence: the frame is complete */
            }
            len += more;
        }
        holding[0] = (uint16_t)(esp_timer_get_time() / 1000000);
        holding[1] = (uint16_t)(esp_get_free_heap_size() / 1024);

        size_t n = modbus_slave_handle(UNIT, req, (size_t)len, holding, 4, resp, sizeof resp);
        if (n > 0) {
            uart_write_bytes(PORT, resp, n);
            served++;
            printf("request of %d bytes, function 0x%02X, replied %u bytes (%" PRIu32 " served)\n", len, req[1], (unsigned)n, served);
        } else {
            printf("ignored %d bytes: another unit, a bad CRC, or noise\n", len);
        }
    }
}
