/*
 * Lesson 3.1, sitting 2: a command shell on UART1, using the driver and the table-driven shell from firmware/host.
 * Connect a USB-UART adapter: adapter RX to GPIO17 (our TX), adapter TX to GPIO18 (our RX), grounds joined.
 * Open a terminal at 115200 8N1 and type "help".
 */
#include <stdio.h>
#include <string.h>
#include <stdarg.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "driver/uart.h"
#include "esp_timer.h"
#include "esp_system.h"
#include "esp_err.h"
#include "shell.h"

#define PORT     UART_NUM_1
#define TX_GPIO  GPIO_NUM_17
#define RX_GPIO  GPIO_NUM_18
#define LED_GPIO GPIO_NUM_4

static void say(const char *fmt, ...)
{
    char buf[128];
    va_list ap;
    va_start(ap, fmt);
    int n = vsnprintf(buf, sizeof buf, fmt, ap);
    va_end(ap);
    if (n > 0) {
        uart_write_bytes(PORT, buf, (size_t)(n < (int)sizeof buf ? n : (int)sizeof buf - 1));
    }
}

static int cmd_help(int argc, char **argv);
static int cmd_led(int argc, char **argv)
{
    if (argc != 2 || (strcmp(argv[1], "on") != 0 && strcmp(argv[1], "off") != 0)) {
        say("usage: led on|off\r\n");
        return 1;
    }
    gpio_set_level(LED_GPIO, strcmp(argv[1], "on") == 0);
    say("led %s\r\n", argv[1]);
    return 0;
}
static int cmd_heap(int argc, char **argv)
{
    (void)argc; (void)argv;
    say("free heap %" PRIu32 " bytes, lowest ever %" PRIu32 "\r\n", esp_get_free_heap_size(), esp_get_minimum_free_heap_size());
    return 0;
}
static int cmd_uptime(int argc, char **argv)
{
    (void)argc; (void)argv;
    say("up %lld ms\r\n", (long long)(esp_timer_get_time() / 1000));
    return 0;
}

static const shell_cmd_t commands[] = {
    { "help",   "list the commands",        cmd_help },
    { "led",    "led on|off",               cmd_led },
    { "heap",   "show free heap",           cmd_heap },
    { "uptime", "milliseconds since boot",  cmd_uptime },
};
#define N_COMMANDS (sizeof commands / sizeof commands[0])

static int cmd_help(int argc, char **argv)
{
    (void)argc; (void)argv;
    for (size_t i = 0; i < N_COMMANDS; i++) {
        say("  %-8s %s\r\n", commands[i].name, commands[i].help);
    }
    return 0;
}

void app_main(void)
{
    gpio_reset_pin(LED_GPIO);
    gpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);

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

    char line[80];
    size_t len = 0;
    say("\r\nshell ready\r\n> ");
    for (;;) {
        uint8_t c;
        if (uart_read_bytes(PORT, &c, 1, portMAX_DELAY) != 1) {
            continue;
        }
        if (c == '\r' || c == '\n') {
            say("\r\n");
            line[len] = '\0';
            if (shell_exec(line, commands, N_COMMANDS) == SHELL_UNKNOWN) {
                say("unknown command, try help\r\n");
            }
            len = 0;
            say("> ");
        } else if ((c == 0x08 || c == 0x7F) && len > 0) {       /* backspace */
            len--;
            say("\b \b");
        } else if (c >= 0x20 && c < 0x7F && len < sizeof line - 1) {
            line[len++] = (char)c;
            uart_write_bytes(PORT, &c, 1);                       /* echo */
        }
    }
}
