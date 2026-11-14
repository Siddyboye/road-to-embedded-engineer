---
title: Legacy to current ESP-IDF drivers
order: 2
---

ESP-IDF v6.0 removed most of the pre-v5 drivers. Tutorials written before 2026 often use the left-hand column and will not compile on v6. Source: the ESP-IDF v6.0 and v6.1 migration guides.

| Tutorial uses | State in v6 | Use instead |
| --- | --- | --- |
| `driver/i2c.h` | End of life; removal planned for v7.0 | `driver/i2c_master.h`, `driver/i2c_slave.h` |
| `driver/timer.h` | Removed | `driver/gptimer.h` |
| `driver/rmt.h` | Removed | `driver/rmt_tx.h`, `driver/rmt_rx.h`, `driver/rmt_encoder.h` |
| `driver/adc.h` | Removed | `esp_adc/adc_oneshot.h`, `esp_adc/adc_continuous.h`, `esp_adc/adc_cali.h` |
| `driver/pcnt.h` | Removed | `driver/pulse_cnt.h` |
| `driver/mcpwm.h` | Removed | `driver/mcpwm_prelude.h` |
| `driver/i2s.h` | Removed | `driver/i2s_std.h`, `driver/i2s_pdm.h`, `driver/i2s_tdm.h` |
| Legacy DAC driver | Removed | `driver/dac_oneshot.h`, `driver/dac_continuous.h`, `driver/dac_cosine.h` |
| `esp_dma_capable_malloc()` | Removed | `heap_caps_malloc()` with `MALLOC_CAP_DMA \| MALLOC_CAP_CACHE_ALIGNED` |
| Built-in `mqtt` component | Moved out in v6.1 | Add the managed component `espressif/mqtt` |
| FreeRTOS types appearing after including a driver header | Driver headers no longer include FreeRTOS | Include `freertos/FreeRTOS.h` yourself |

Two behaviour changes that bite silently:

- The new I2C master functions return `ESP_ERR_INVALID_RESPONSE` on a NACK, not `ESP_ERR_INVALID_STATE`.
- The default C library is Picolibc, not Newlib. Code that relied on Newlib-specific behaviour needs checking.
