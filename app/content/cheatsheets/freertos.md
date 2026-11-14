---
title: FreeRTOS quick reference
order: 5
---

The calls used in Phase 4, as provided by ESP-IDF. Stack sizes are in bytes here; a higher priority number is more urgent.

| Need | Call | Notes |
| --- | --- | --- |
| Create a task | `xTaskCreate(fn, "name", stack, arg, prio, &handle)` | `xTaskCreatePinnedToCore` adds a core |
| Steady period | `xTaskDelayUntil(&last, pdMS_TO_TICKS(ms))` | Measured from the last wake-up |
| Simple delay | `vTaskDelay(pdMS_TO_TICKS(ms))` | Measured from now: drifts |
| Stack headroom | `uxTaskGetStackHighWaterMark(NULL)` | Smallest free amount ever |
| Queue | `xQueueCreate(len, item_size)`, `xQueueSend`, `xQueueReceive` | Items are copied |
| From an ISR | `xQueueSendFromISR(q, &item, &woken)` then `portYIELD_FROM_ISR()` if woken | Only `FromISR` calls in an ISR |
| Mutex | `xSemaphoreCreateMutex()`, `xSemaphoreTake(m, ticks)`, `xSemaphoreGive(m)` | Has priority inheritance; never in an ISR |
| Binary semaphore | `xSemaphoreCreateBinary()` | A signal, not a lock |
| Notify a task | `xTaskNotifyGive(h)` / `ulTaskNotifyTake(pdTRUE, ticks)` | Fastest; one receiver |
| Notify with a value | `xTaskNotify` / `xTaskNotifyWait` | Bits or a value |
| Event group | `xEventGroupSetBits`, `xEventGroupWaitBits` | Wait for any or all of several bits |
| Software timer | `xTimerCreate`, `xTimerStart` | Callbacks share one task: keep them short |
| Stream buffer | `xStreamBufferSend`, `xStreamBufferReceive` | Bytes, one writer, one reader |
| Critical section | `taskENTER_CRITICAL(&lock)` … `taskEXIT_CRITICAL(&lock)` | `lock` is a `portMUX_TYPE`; a few instructions only |

**Choosing a primitive**

| Situation | Use |
| --- | --- |
| Pass data between tasks | Queue |
| Wake one task, no data | Task notification |
| Protect a shared resource | Mutex |
| Wait on several conditions | Event group |
| Share a few variables with an ISR | Critical section |
| Bytes from an ISR to a task | Stream buffer |

**Timeouts.** `0` returns at once; `portMAX_DELAY` waits for ever; anything between is a deliberate decision about what to do when the wait fails. The tick is 10 ms by default, so `pdMS_TO_TICKS(5)` is zero.
