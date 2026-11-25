---
title: Under the hood: what each call does
order: 7
---

Every ESP-IDF call you use, traced to the hardware. Each row was read in the ESP-IDF v6.1 source; the lesson that introduces a call adds its row here. A call missing from this page has not been traced yet: trace it yourself with the method below before you rely on what it costs.

## How to trace any call

1. **Header** (`components/<component>/include/...`): the signature and the comment. Note what it promises, not what it does.
2. **Driver** (`components/esp_driver_<x>/src/<x>.c`): argument checks, locks, memory, bookkeeping. Look for `portENTER_CRITICAL`, mutexes, `malloc`, `vTaskDelay`: these decide whether it blocks or may run in an ISR.
3. **HAL** (`components/esp_hal_<x>/include/hal/<x>_hal.h`): usually a macro that forwards to the LL.
4. **LL** (`components/esp_hal_<x>/esp32s3/include/hal/<x>_ll.h`): `static inline` functions that read and write register fields. This is where the work happens.
5. **Registers** (`components/soc/esp32s3/register/soc/<x>_reg.h` and `<x>_struct.h`): names and addresses, which match the Technical Reference Manual.

With PlatformIO the source is in `~/.platformio/packages/framework-espidf/components/`. In VS Code, F12 on a call goes to its definition; repeat until you reach a register.

Questions to answer for every call: which registers does it touch? Does it block, and on what? May an ISR call it? Is it in IRAM? What does it allocate? What happens on bad arguments?

## GPIO

| Call | Underneath | Blocks | ISR | Lesson |
| --- | --- | --- | --- | --- |
| `gpio_reset_pin` | Interrupt off, **pull-up on**, pull-down off, input and output off, RTC IO released, GPIO function selected, reservation dropped | No | No | 0.3, 0.14 |
| `gpio_set_direction` | Input: sets `FUN_IE` in the IO MUX register, clears the `GPIO_ENABLE` bit. Output: clears `FUN_IE`, routes signal 256 (plain GPIO) through the matrix, sets the `GPIO_ENABLE` bit. Both select the GPIO function | No | No | 0.3, 0.14 |
| `gpio_set_pull_mode` | Sets or clears `FUN_PU` and `FUN_PD` in the IO MUX register | No | No | 0.5, 0.14 |
| `gpio_config` | The above for every pin in the mask, plus interrupt type and enable. Sets the whole mode, not added to the old one. Warns on a pin already reserved | No | No | 0.5, 2.1 |
| `gpio_set_level` | One store to `GPIO_OUT_W1TS` or `GPIO_OUT_W1TC` (`OUT1` pair for pins 32 and up) | No | Yes; in IRAM only with `CONFIG_GPIO_CTRL_FUNC_IN_IRAM` | 0.3, 0.14 |
| `gpio_get_level` | One load of `GPIO_IN`. Reads 0 when the input path is off | No | Yes; in IRAM only with `CONFIG_GPIO_CTRL_FUNC_IN_IRAM` | 0.5, 0.14 |

## Time

| Call | Underneath | Blocks | ISR | Lesson |
| --- | --- | --- | --- | --- |
| `esp_timer_get_time` | Snapshots the 64-bit SYSTIMER counter, waits for valid, reads low, high, low until consistent, divides by 16 (16 MHz on the S3). Microseconds since boot, monotonic | No | Yes, in IRAM | 0.10, 0.14 |
| `esp_rom_delay_us` | Mask-ROM routine `ets_delay_us`: spins on the CPU cycle count. Interrupts stay enabled, so it can run long | Spins | Yes | 0.9, 0.14 |
| `vTaskDelay(t)` | Task to the delayed list for t ticks, then yield. 0 ticks is only a yield | Yes | No | 0.9, 0.10 |
| `pdMS_TO_TICKS(ms)` | Macro: `ms * configTICK_RATE_HZ / 1000`, integer. 100 Hz default: under 10 ms gives 0 | n/a | n/a | 0.10 |

## LEDC PWM

| Call | Underneath | Blocks | ISR | Lesson |
| --- | --- | --- | --- | --- |
| `ledc_timer_config` | Auto clock tries APB, XTAL, RC_FAST; divider = clock ÷ (frequency × 2^resolution) with 8 fractional bits, written to the timer | No | No | 2.4, 0.14 |
| `ledc_channel_config` | Reserves the pin, routes the channel through the GPIO matrix (`output_invert` is the matrix’s invert bit), sets the first duty. `intr_type` is deprecated in v6.1 | No | No | 2.4, 0.14 |
| `ledc_set_duty` | Critical section; writes `duty << 4` to the duty register. Output unchanged until an update | No | No | 2.4, 0.14 |
| `ledc_update_duty` | Sets `duty_start` and the low-speed update bit: new duty from the next PWM period | No | Yes; in IRAM only with `CONFIG_LEDC_CTRL_FUNC_IN_IRAM` | 2.4, 0.14 |
| `ledc_set_duty_and_update` | Both in one critical section, but fails with `ESP_FAIL` unless `ledc_fade_func_install` was called first | No | No | 2.4 |

## Startup and errors

| Call | Underneath | Lesson |
| --- | --- | --- |
| `app_main` | Called by `main_task` (`freertos/app_startup.c`), priority 1, stack `CONFIG_ESP_MAIN_TASK_STACK_SIZE` (3584 by default). Returning deletes the task; the rest of the system keeps running | 0.1, 1.7 |
| `ESP_ERROR_CHECK(x)` | On failure: prints error, file, line and expression, then aborts. With assertions disabled (`NDEBUG`) it evaluates x and checks nothing | 0.1, 1.13 |
| `printf` | C library formats into stdout; at a newline the line goes to the console driver, which may wait for the host | 0.1, 0.14 |
