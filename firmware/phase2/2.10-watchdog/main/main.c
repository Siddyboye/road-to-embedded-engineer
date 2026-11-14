/*
 * Lesson 2.10: watchdogs and reset reasons.
 * MODE 0: this task subscribes to the task watchdog and resets it only after its "work" succeeded.
 * MODE 1: this task spins without yielding, starving the idle task: read what the watchdog reports.
 * MODE 2: this task subscribes and then stops resetting, as a hung task would.
 */
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_task_wdt.h"
#include "esp_system.h"
#include "esp_err.h"

#define MODE 0

static const char *reason_name(esp_reset_reason_t r)
{
    switch (r) {
    case ESP_RST_POWERON:  return "power-on";
    case ESP_RST_SW:       return "software restart";
    case ESP_RST_PANIC:    return "panic";
    case ESP_RST_INT_WDT:  return "interrupt watchdog";
    case ESP_RST_TASK_WDT: return "task watchdog";
    case ESP_RST_WDT:      return "other watchdog";
    case ESP_RST_DEEPSLEEP: return "wake from deep sleep";
    case ESP_RST_BROWNOUT: return "brown-out";
    default:               return "other";
    }
}

static bool do_work(int n)
{
    vTaskDelay(pdMS_TO_TICKS(500));
    return n >= 0;                  /* stands in for "the sensor answered and the message went out" */
}

void app_main(void)
{
    printf("last reset: %s\n", reason_name(esp_reset_reason()));

#if MODE == 1
    printf("spinning without yielding...\n");
    volatile unsigned long x = 0;
    for (;;) {
        x++;
    }
#else
    ESP_ERROR_CHECK(esp_task_wdt_add(NULL));        /* watch this task too, not only the idle tasks */
    for (int n = 0; ; n++) {
        if (do_work(n)) {
#if MODE == 0
            esp_task_wdt_reset();                   /* fed only on evidence that the real job was done */
#endif
            printf("work %d done\n", n);
        }
    }
#endif
}
