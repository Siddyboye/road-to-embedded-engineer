/*
 * Lesson 0.1: the smallest useful ESP-IDF program.
 * Prints what chip it is running on, how much heap is free, then ticks once a second.
 * Targets: esp32s3 (primary), esp32 (ESP32-CAM, DevKitC-VE).
 */
#include <stdio.h>
#include <inttypes.h>
#include "sdkconfig.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_chip_info.h"
#include "esp_system.h"

void app_main(void)
{
    esp_chip_info_t chip;
    esp_chip_info(&chip);

    printf("Hello from %s: %d core(s), silicon revision v%d.%d\n",
           CONFIG_IDF_TARGET, chip.cores, chip.revision / 100, chip.revision % 100);
    printf("Free heap: %" PRIu32 " bytes\n", esp_get_free_heap_size());

    for (int tick = 0; ; tick++) {
        printf("tick %d\n", tick);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}
