/* Compensation formulas for the BMP280 and the temperature and pressure parts of the BME280,
 * as given in the Bosch datasheet (integer versions). Lesson 3.2. */
#ifndef BMP280_COMP_H
#define BMP280_COMP_H

#include <stdint.h>

typedef struct {
    uint16_t T1; int16_t T2, T3;
    uint16_t P1; int16_t P2, P3, P4, P5, P6, P7, P8, P9;
} bmp280_calib_t;

int32_t  bmp280_temp_centi_c(const bmp280_calib_t *c, int32_t adc_T, int32_t *t_fine);   /* 2508 means 25.08 C */
uint32_t bmp280_press_q24_8(const bmp280_calib_t *c, int32_t adc_P, int32_t t_fine);     /* pascals times 256 */

#endif
