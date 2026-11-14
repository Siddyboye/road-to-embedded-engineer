/*
 * Lesson 3.8: the ESP32-S3 as a USB serial device (CDC-ACM), using the TinyUSB component.
 * Use TWO cables: the UART port for flashing and logs, and the port marked USB for this lab.
 * A new serial port appears on your computer. Open it and type: characters come back in upper case,
 * and "!" toggles the LED. Follows ESP-IDF v6.1's tusb_serial_device example (esp_tinyusb 2.x).
 */
#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "driver/gpio.h"
#include "tinyusb.h"
#include "tinyusb_default_config.h"
#include "tinyusb_cdc_acm.h"
#include "sdkconfig.h"
#include "esp_err.h"

#define LED_GPIO GPIO_NUM_4

typedef struct { uint8_t buf[CONFIG_TINYUSB_CDC_RX_BUFSIZE + 1]; size_t len; int itf; } chunk_t;

static QueueHandle_t chunks;
static uint8_t rx_buf[CONFIG_TINYUSB_CDC_RX_BUFSIZE + 1];

/* Called by the USB task when bytes arrive. Keep it short: copy them out and let app_main do the work. */
static void on_rx(int itf, cdcacm_event_t *event)
{
    (void)event;
    size_t n = 0;
    if (tinyusb_cdcacm_read(itf, rx_buf, CONFIG_TINYUSB_CDC_RX_BUFSIZE, &n) == ESP_OK && n > 0) {
        chunk_t c = { .len = n, .itf = itf };
        memcpy(c.buf, rx_buf, n);
        xQueueSend(chunks, &c, 0);
    }
}

/* The host raises DTR when a terminal opens the port. */
static void on_line_state(int itf, cdcacm_event_t *event)
{
    printf("port %d: terminal %s\n", itf, event->line_state_changed_data.dtr ? "opened" : "closed");
}

void app_main(void)
{
    gpio_reset_pin(LED_GPIO);
    gpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);
    chunks = xQueueCreate(5, sizeof(chunk_t));

    const tinyusb_config_t usb_cfg = TINYUSB_DEFAULT_CONFIG();      /* default descriptors: a CDC device */
    ESP_ERROR_CHECK(tinyusb_driver_install(&usb_cfg));

    tinyusb_config_cdcacm_t acm_cfg = { .cdc_port = TINYUSB_CDC_ACM_0, .callback_rx = &on_rx };
    ESP_ERROR_CHECK(tinyusb_cdcacm_init(&acm_cfg));
    ESP_ERROR_CHECK(tinyusb_cdcacm_register_callback(TINYUSB_CDC_ACM_0, CDC_EVENT_LINE_STATE_CHANGED, &on_line_state));
    printf("USB device started: look for a new serial port on your computer\n");

    int led = 0;
    uint32_t total = 0;
    chunk_t c;
    for (;;) {
        if (xQueueReceive(chunks, &c, portMAX_DELAY) != pdTRUE) {
            continue;
        }
        total += (uint32_t)c.len;
        for (size_t i = 0; i < c.len; i++) {
            if (c.buf[i] == '!') {
                led = !led;
                gpio_set_level(LED_GPIO, led);
            }
            c.buf[i] = (uint8_t)toupper(c.buf[i]);
        }
        tinyusb_cdcacm_write_queue(c.itf, c.buf, c.len);
        tinyusb_cdcacm_write_flush(c.itf, 0);
        printf("echoed %u bytes, %" PRIu32 " in total\n", (unsigned)c.len, total);
    }
}
