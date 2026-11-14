/*
 * Lesson 2.6: one-shot ADC readings in millivolts, and how many bits are actually steady.
 * Wire a potentiometer between 3.3 V and GND with its wiper on ADC_GPIO (or use a two-resistor divider).
 */
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"
#include "esp_err.h"

#define ADC_GPIO  4
#define N         64

void app_main(void)
{
    adc_unit_t unit;
    adc_channel_t channel;
    ESP_ERROR_CHECK(adc_oneshot_io_to_channel(ADC_GPIO, &unit, &channel));

    adc_oneshot_unit_handle_t adc;
    adc_oneshot_unit_init_cfg_t unit_cfg = { .unit_id = unit };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&unit_cfg, &adc));
    adc_oneshot_chan_cfg_t chan_cfg = { .bitwidth = ADC_BITWIDTH_DEFAULT, .atten = ADC_ATTEN_DB_12 };
    ESP_ERROR_CHECK(adc_oneshot_config_channel(adc, channel, &chan_cfg));

    adc_cali_handle_t cali = NULL;
#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
    adc_cali_curve_fitting_config_t cali_cfg = { .unit_id = unit, .atten = ADC_ATTEN_DB_12, .bitwidth = ADC_BITWIDTH_DEFAULT };
    if (adc_cali_create_scheme_curve_fitting(&cali_cfg, &cali) != ESP_OK) {
        cali = NULL;
    }
#endif
    printf("calibration: %s\n", cali ? "factory data applied" : "not available, raw counts only");

    for (;;) {
        int min = 1 << 30, max = 0;
        long sum = 0;
        for (int i = 0; i < N; i++) {
            int raw = 0;
            ESP_ERROR_CHECK(adc_oneshot_read(adc, channel, &raw));
            if (raw < min) min = raw;
            if (raw > max) max = raw;
            sum += raw;
        }
        int mean = (int)(sum / N);
        int mv = 0;
        if (cali) {
            adc_cali_raw_to_voltage(cali, mean, &mv);
        }
        printf("raw mean %4d  min %4d  max %4d  spread %3d counts  ->  %d mV\n", mean, min, max, max - min, mv);
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}
