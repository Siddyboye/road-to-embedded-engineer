/*
 * Lessons 0.9 and 0.10: toggle a pin every WAIT_US microseconds in three different ways,
 * then measure the result on a logic analyzer.
 * WAIT_MODE 0 = periodic hardware-backed timer, 1 = busy-wait loop, 2 = vTaskDelay.
 */
#include <stdio.h>
#include "sdkconfig.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_timer.h"
#include "esp_rom_sys.h"
#include "esp_err.h"

#if CONFIG_IDF_TARGET_ESP32
#define OUT_GPIO   GPIO_NUM_13   /* GPIO6 to 11 carry the flash on the classic ESP32: never use them */
#else
#define OUT_GPIO   GPIO_NUM_6
#endif
#define WAIT_MODE  0
#define WAIT_US    1000

static int level;

static void toggle(void *arg)
{
    (void)arg;
    level = !level;
    gpio_set_level(OUT_GPIO, level);
}

void app_main(void)
{
    gpio_reset_pin(OUT_GPIO);
    gpio_set_direction(OUT_GPIO, GPIO_MODE_OUTPUT);
    printf("mode %d, toggling every %d us (tick period is %d ms)\n", WAIT_MODE, WAIT_US, (int)portTICK_PERIOD_MS);

#if WAIT_MODE == 0
    const esp_timer_create_args_t args = { .callback = toggle, .name = "toggle" };
    esp_timer_handle_t timer;
    ESP_ERROR_CHECK(esp_timer_create(&args, &timer));
    ESP_ERROR_CHECK(esp_timer_start_periodic(timer, WAIT_US));
    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
#elif WAIT_MODE == 1
    for (;;) {
        toggle(NULL);
        esp_rom_delay_us(WAIT_US);          /* spins: nothing of lower priority runs on this core */
    }
#else
    for (;;) {
        toggle(NULL);
        vTaskDelay(pdMS_TO_TICKS(WAIT_US / 1000));   /* truncates to whole ticks: 1 ms becomes 0 at a 10 ms tick */
    }
#endif
}
