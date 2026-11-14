/*
 * Lesson 3.10: capture frames from the OV2640 on an AI-Thinker ESP32-CAM with the esp32-camera component.
 * Pin numbers are the AI-Thinker set from the component's own example (camera_pinout.h).
 * At start-up one JPEG is printed as hex between two marker lines; firmware/tools/save_jpeg.py saves it to a file.
 * Then it reports frame size, where the buffer lives, and frames per second.
 * Power matters: feed the board 5 V from a supply that can deliver 500 mA or more, or it will brown out.
 */
#include <stdio.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_camera.h"
#include "esp_memory_utils.h"
#include "esp_timer.h"
#include "esp_err.h"

static const camera_config_t camera_config = {
    .pin_pwdn = 32, .pin_reset = -1, .pin_xclk = 0,
    .pin_sccb_sda = 26, .pin_sccb_scl = 27,             /* the control bus: I2C in all but name */
    .pin_d7 = 35, .pin_d6 = 34, .pin_d5 = 39, .pin_d4 = 36, .pin_d3 = 21, .pin_d2 = 19, .pin_d1 = 18, .pin_d0 = 5,
    .pin_vsync = 25, .pin_href = 23, .pin_pclk = 22,
    .xclk_freq_hz = 20000000,                           /* the master clock we supply to the sensor */
    .ledc_timer = LEDC_TIMER_0,
    .ledc_channel = LEDC_CHANNEL_0,
    .pixel_format = PIXFORMAT_JPEG,                     /* the sensor compresses; try PIXFORMAT_GRAYSCALE next */
    .frame_size = FRAMESIZE_QVGA,                       /* 320 x 240 */
    .jpeg_quality = 12,                                 /* 0 to 63, lower is better quality and a larger frame */
    .fb_count = 1,
    .fb_location = CAMERA_FB_IN_PSRAM,
    .grab_mode = CAMERA_GRAB_WHEN_EMPTY,
};

void app_main(void)
{
    esp_err_t err = esp_camera_init(&camera_config);
    if (err != ESP_OK) {
        printf("camera init failed: %s. Check the ribbon cable, the power supply and that PSRAM is enabled.\n", esp_err_to_name(err));
        return;
    }

    camera_fb_t *fb = esp_camera_fb_get();
    if (fb != NULL) {
        printf("===JPEG BEGIN %u===\n", (unsigned)fb->len);
        for (size_t i = 0; i < fb->len; i++) {
            printf("%02x", fb->buf[i]);
            if (i % 64 == 63) {
                printf("\n");
            }
        }
        printf("\n===JPEG END===\n");
        esp_camera_fb_return(fb);                       /* always hand the buffer back, or the next capture blocks */
    }

    for (;;) {
        int frames = 0, width = 0, height = 0;
        size_t bytes = 0;
        const uint8_t *where = NULL;
        int64_t t0 = esp_timer_get_time();
        while (esp_timer_get_time() - t0 < 2000000) {
            fb = esp_camera_fb_get();
            if (fb == NULL) {
                printf("capture failed\n");
                break;
            }
            frames++;
            bytes += fb->len;
            where = fb->buf;
            width = (int)fb->width;
            height = (int)fb->height;
            esp_camera_fb_return(fb);
        }
        if (frames > 0) {
            printf("%dx%d JPEG, about %u bytes a frame, %.1f frames/s, buffer at %p in %s\n",
                   width, height, (unsigned)(bytes / (size_t)frames), frames / 2.0,
                   (const void *)where, esp_ptr_external_ram(where) ? "PSRAM" : "internal RAM");
        }
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}
