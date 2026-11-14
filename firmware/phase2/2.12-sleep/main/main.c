/*
 * Lesson 2.12: deep sleep with two wake sources, and state kept in RTC memory.
 * Wakes every 10 s, or when BUTTON_GPIO (a button to GND) is pulled low.
 * Measure the supply current while awake and while asleep.
 */
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "driver/rtc_io.h"
#include "esp_sleep.h"

#define BUTTON_GPIO  GPIO_NUM_5         /* must be an RTC-capable pin: GPIO0 to 21 on the ESP32-S3 */
#define SLEEP_US     (10 * 1000000ULL)

static RTC_DATA_ATTR int boots;         /* kept across deep sleep; lost on power-off */

void app_main(void)
{
    boots++;
    switch (esp_sleep_get_wakeup_cause()) {
    case ESP_SLEEP_WAKEUP_TIMER: printf("woke on the timer"); break;
    case ESP_SLEEP_WAKEUP_EXT0:  printf("woke on the button"); break;
    default:                     printf("cold start"); break;
    }
    printf(", boot number %d\n", boots);

    printf("awake for 3 s: measure the current now\n");
    vTaskDelay(pdMS_TO_TICKS(3000));

    esp_sleep_enable_timer_wakeup(SLEEP_US);
    rtc_gpio_pullup_en(BUTTON_GPIO);    /* the pull-up must come from the low-power domain to work during sleep */
    rtc_gpio_pulldown_dis(BUTTON_GPIO);
    esp_sleep_enable_ext0_wakeup(BUTTON_GPIO, 0);

    printf("entering deep sleep\n");
    esp_deep_sleep_start();             /* never returns: the next code to run is the bootloader */
}
