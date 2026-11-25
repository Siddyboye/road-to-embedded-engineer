/*
 * Lesson 0.14: an ultrasonic ranger with an RGB LED, and every call it makes traced to the hardware.
 *
 * HC-SR04 or HY-SRF05 on TRIG_GPIO and ECHO_GPIO. ECHO is a 5 V signal: bring it to ECHO_GPIO through
 * a divider (1 k from ECHO to the pin, 2 k from the pin to GND). TRIG can be driven at 3.3 V directly.
 * Common-anode RGB LED: anode to 3.3 V, each cathode through its own resistor to a pin. The outputs are
 * inverted in the GPIO matrix, so duty 255 means "fully on" in this code.
 *
 * On the S3, DUMP_REGISTERS prints the GPIO and IO MUX register bits that the driver calls changed,
 * so you can see what each call did underneath. Compare them with lesson 0.13.
 *
 * Written against ESP-IDF v6.1. Not yet compiled.
 */
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "driver/ledc.h"
#include "esp_err.h"
#include "esp_rom_sys.h"
#include "esp_timer.h"
#include "sdkconfig.h"

#if CONFIG_IDF_TARGET_ESP32S3
#include "soc/soc.h"
#include "soc/gpio_reg.h"
#include "soc/io_mux_reg.h"
#define DUMP_REGISTERS 1
#define TRIG_GPIO  GPIO_NUM_18
#define ECHO_GPIO  GPIO_NUM_17      /* not 19 or 20: those are the S3's USB pins */
#define RED_GPIO   4
#define GREEN_GPIO 5
#define BLUE_GPIO  21
#else
/* Classic ESP32 (DevKitC-VE). Avoid 16 and 17 on WROVER modules: they belong to the PSRAM. */
#define DUMP_REGISTERS 0
#define TRIG_GPIO  GPIO_NUM_13
#define ECHO_GPIO  GPIO_NUM_14
#define RED_GPIO   25
#define GREEN_GPIO 26
#define BLUE_GPIO  27
#endif

#define LEDC_MODE        LEDC_LOW_SPEED_MODE
#define LEDC_TIMER       LEDC_TIMER_0
#define PWM_HZ           5000
#define NEAR_CM          30

#define ECHO_START_US    30000      /* the burst takes well under this; no rising edge means no sensor */
#define ECHO_MAX_US      40000      /* longer than any echo the module reports, with margin: check your datasheet */
#define PING_PERIOD_MS   60         /* the HC-SR04 datasheet asks for at least 60 ms between pings */

static const ledc_channel_t channels[3] = { LEDC_CHANNEL_0, LEDC_CHANNEL_1, LEDC_CHANNEL_2 };

/* Wait until ECHO reads `level`. Returns the time it happened, or -1 after timeout_us. */
static int64_t wait_for_level(gpio_num_t pin, int level, int64_t timeout_us)
{
    const int64_t start = esp_timer_get_time();
    for (;;) {
        const int64_t now = esp_timer_get_time();
        if (gpio_get_level(pin) == level) {
            return now;
        }
        if (now - start > timeout_us) {
            return -1;
        }
    }
}

/* One measurement. Returns the echo pulse width in microseconds, or a negative error code.
 * Nothing in here prints: a printf between the trigger and the falling edge would be timed too. */
enum { ECHO_STUCK_HIGH = -1, ECHO_NO_START = -2, ECHO_TOO_LONG = -3 };

static int32_t ping_us(void)
{
    if (wait_for_level(ECHO_GPIO, 0, 10000) < 0) {
        return ECHO_STUCK_HIGH;
    }
    gpio_set_level(TRIG_GPIO, 1);
    esp_rom_delay_us(10);                       /* the datasheet's minimum trigger width */
    gpio_set_level(TRIG_GPIO, 0);

    const int64_t rise = wait_for_level(ECHO_GPIO, 1, ECHO_START_US);
    if (rise < 0) {
        return ECHO_NO_START;
    }
    const int64_t fall = wait_for_level(ECHO_GPIO, 0, ECHO_MAX_US);
    if (fall < 0) {
        return ECHO_TOO_LONG;
    }
    return (int32_t)(fall - rise);
}

/* Round trip at 343 m/s (about 20 °C): distance_mm = us * 343 / 2000. Integer only. */
static int32_t us_to_mm(int32_t us)
{
    return (int32_t)(((int64_t)us * 343) / 2000);
}

static void rgb_init(void)
{
    const ledc_timer_config_t timer = {
        .speed_mode = LEDC_MODE,
        .duty_resolution = LEDC_TIMER_8_BIT,
        .timer_num = LEDC_TIMER,
        .freq_hz = PWM_HZ,
        .clk_cfg = LEDC_AUTO_CLK,
    };
    ESP_ERROR_CHECK(ledc_timer_config(&timer));

    const int pins[3] = { RED_GPIO, GREEN_GPIO, BLUE_GPIO };
    for (int i = 0; i < 3; i++) {
        const ledc_channel_config_t ch = {
            .gpio_num = pins[i],
            .speed_mode = LEDC_MODE,
            .channel = channels[i],
            .timer_sel = LEDC_TIMER,
            .duty = 0,
            .hpoint = 0,
            .flags.output_invert = 1,           /* common anode: the pin sinks current */
        };
        ESP_ERROR_CHECK(ledc_channel_config(&ch));
    }
}

static void rgb_set(uint8_t r, uint8_t g, uint8_t b)
{
    const uint8_t duty[3] = { r, g, b };
    for (int i = 0; i < 3; i++) {
        ESP_ERROR_CHECK(ledc_set_duty(LEDC_MODE, channels[i], duty[i]));   /* stages the value */
        ESP_ERROR_CHECK(ledc_update_duty(LEDC_MODE, channels[i]));         /* latches it at the next period */
    }
}

#if DUMP_REGISTERS
static void dump_pin(const char *name, int pin)
{
    const uint32_t mux = REG_READ(IO_MUX_GPIO0_REG + (uint32_t)pin * 4);
    const uint32_t out_sel = REG_READ(GPIO_FUNC0_OUT_SEL_CFG_REG + (uint32_t)pin * 4);
    printf("%-5s GPIO%-2d  ENABLE=%d  IN=%d  mux: FUN_IE=%d FUN_PU=%d FUN_PD=%d MCU_SEL=%d  out_sel=%3d inv=%d\n",
           name, pin,
           (int)((REG_READ(GPIO_ENABLE_REG) >> pin) & 1),
           (int)((REG_READ(GPIO_IN_REG) >> pin) & 1),
           (mux & FUN_IE) ? 1 : 0, (mux & FUN_PU) ? 1 : 0, (mux & FUN_PD) ? 1 : 0,
           (int)((mux >> MCU_SEL_S) & MCU_SEL_V),
           (int)(out_sel & GPIO_FUNC0_OUT_SEL_V),
           (out_sel & GPIO_FUNC0_OUT_INV_SEL) ? 1 : 0);
}

static void dump_all(const char *when)
{
    printf("--- registers %s\n", when);
    dump_pin("TRIG", TRIG_GPIO);
    dump_pin("ECHO", ECHO_GPIO);
    dump_pin("RED", RED_GPIO);
}
#else
static void dump_all(const char *when) { (void)when; }
#endif

void app_main(void)
{
    dump_all("at reset");

    gpio_reset_pin(TRIG_GPIO);
    gpio_set_direction(TRIG_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(TRIG_GPIO, 0);

    gpio_reset_pin(ECHO_GPIO);
    gpio_set_direction(ECHO_GPIO, GPIO_MODE_INPUT);
    gpio_set_pull_mode(ECHO_GPIO, GPIO_PULLDOWN_ONLY);   /* a missing sensor reads 0, not noise */

    rgb_init();
    dump_all("after init");

    for (;;) {
        const int32_t us = ping_us();
        if (us < 0) {
            printf("ping error %" PRId32 "\n", us);
            rgb_set(0, 0, 0);
        } else {
            const int32_t mm = us_to_mm(us);
            printf("echo %" PRId32 " us  %" PRId32 " mm\n", us, mm);
            if (mm < NEAR_CM * 10) {
                rgb_set(255, 0, 0);
            } else {
                rgb_set(0, 32, 0);
            }
        }
        vTaskDelay(pdMS_TO_TICKS(PING_PERIOD_MS));
    }
}
