/*
 * Lesson 3.6: CAN with the ESP32's TWAI controller, using the node API of ESP-IDF v6.1 (esp_twai.h).
 *
 * MODE 0, one board: self-test. The node needs no acknowledgement and hears its own frames.
 *         Fit a transceiver, or simply jumper TX_GPIO to RX_GPIO.
 * MODE 1, two boards: each needs an SN65HVD230. Transceiver TX pin to TX_GPIO, RX pin to RX_GPIO; CANH to CANH,
 *         CANL to CANL, grounds joined, and a 120 ohm resistor across CANH and CANL at each end.
 *         Give each board a different NODE_ID. Lower identifiers win arbitration.
 * A filter accepts identifiers 0x100 to 0x10F only. Unplug the other node in MODE 1 and watch the error counters.
 */
#include <stdio.h>
#include <string.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "driver/gpio.h"
#include "esp_twai.h"
#include "esp_twai_onchip.h"
#include "esp_attr.h"
#include "esp_err.h"

#define MODE      0
#define NODE_ID   0x101
#define TX_GPIO   GPIO_NUM_5
#define RX_GPIO   GPIO_NUM_6
#define BITRATE   500000

typedef struct { uint32_t id; uint8_t len; uint8_t data[8]; } can_msg_t;

static QueueHandle_t rx_queue;
static const char *const STATE[] = { "error-active", "error-warning", "error-passive", "bus-off" };

static bool IRAM_ATTR on_rx(twai_node_handle_t node, const twai_rx_done_event_data_t *edata, void *user_ctx)
{
    (void)edata; (void)user_ctx;
    can_msg_t msg = { 0 };
    twai_frame_t frame = { .buffer = msg.data, .buffer_len = sizeof msg.data };
    BaseType_t woken = pdFALSE;
    if (twai_node_receive_from_isr(node, &frame) == ESP_OK) {
        msg.id = frame.header.id;
        msg.len = (uint8_t)(frame.header.dlc > 8 ? 8 : frame.header.dlc);
        xQueueSendFromISR(rx_queue, &msg, &woken);
    }
    return woken == pdTRUE;
}

static void printer(void *arg)
{
    (void)arg;
    can_msg_t msg;
    for (;;) {
        if (xQueueReceive(rx_queue, &msg, portMAX_DELAY) == pdTRUE) {
            printf("rx id 0x%03" PRIX32 " len %u:", msg.id, msg.len);
            for (int i = 0; i < msg.len; i++) {
                printf(" %02X", msg.data[i]);
            }
            printf("\n");
        }
    }
}

void app_main(void)
{
    rx_queue = xQueueCreate(16, sizeof(can_msg_t));
    xTaskCreate(printer, "can_rx", 3072, NULL, 5, NULL);

    twai_node_handle_t node = NULL;
    twai_onchip_node_config_t cfg = {
        .io_cfg = { .tx = TX_GPIO, .rx = RX_GPIO, .quanta_clk_out = GPIO_NUM_NC, .bus_off_indicator = GPIO_NUM_NC },
        .bit_timing.bitrate = BITRATE,
        .tx_queue_depth = 4,
#if MODE == 0
        .flags.enable_self_test = true,         /* do not wait for another node to acknowledge */
        .flags.enable_loopback = true,          /* receive our own frames */
#endif
    };
    ESP_ERROR_CHECK(twai_new_node_onchip(&cfg, &node));

    twai_mask_filter_config_t filter = { .id = 0x100, .mask = 0x7F0, .is_ext = false };     /* top seven bits must equal 0x10x */
    ESP_ERROR_CHECK(twai_node_config_mask_filter(node, 0, &filter));

    twai_event_callbacks_t cbs = { .on_rx_done = on_rx };
    ESP_ERROR_CHECK(twai_node_register_event_callbacks(node, &cbs, NULL));
    ESP_ERROR_CHECK(twai_node_enable(node));
    printf("node 0x%03X up at %d bit/s, %s\n", NODE_ID, BITRATE, MODE == 0 ? "self-test" : "normal mode");

    static uint8_t payload[4];                  /* must stay valid until the frame has left the queue */
    for (uint32_t count = 0; ; count++) {
        twai_node_status_t status;
        twai_node_record_t record;
        ESP_ERROR_CHECK(twai_node_get_info(node, &status, &record));
        if (status.state == TWAI_ERROR_BUS_OFF) {
            printf("bus-off: this node has removed itself from the bus. Recovering...\n");
            ESP_ERROR_CHECK(twai_node_recover(node));
            vTaskDelay(pdMS_TO_TICKS(1000));
            continue;
        }

        payload[0] = (uint8_t)(count >> 24); payload[1] = (uint8_t)(count >> 16);
        payload[2] = (uint8_t)(count >> 8);  payload[3] = (uint8_t)count;
        twai_frame_t frame = { .header.id = NODE_ID, .buffer = payload, .buffer_len = sizeof payload };
        esp_err_t err = twai_node_transmit(node, &frame, 100);
        if (err == ESP_OK) {
            err = twai_node_transmit_wait_all_done(node, 200);
        }
        printf("tx %" PRIu32 " %s | state %s, tx errors %u, rx errors %u, bus errors %" PRIu32 "\n",
               count, err == ESP_OK ? "ok" : esp_err_to_name(err), STATE[status.state],
               (unsigned)status.tx_error_count, (unsigned)status.rx_error_count, record.bus_err_num);
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}
