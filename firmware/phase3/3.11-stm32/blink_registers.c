/*
 * Lesson 3.11: blink on an STM32 Nucleo-64 with registers only.
 * Written for the F4 family boards with the user LED (LD2) on PA5: NUCLEO-F446RE and NUCLEO-F411RE.
 * This is a reference file, not a project: create an empty STM32CubeIDE project for your board and
 * replace main.c with it. Names come from the CMSIS device header ("stm32f4xx.h").
 * Check the pin against your board's user manual before using it on another Nucleo.
 */
#include "stm32f4xx.h"

static void delay(volatile uint32_t n) { while (n--) { } }      /* crude: lesson 2.3's timer is the real answer */

int main(void)
{
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;        /* 1. turn on the clock of port A: nothing works before this */
    (void)RCC->AHB1ENR;                         /*    read back so the enable has taken effect */

    GPIOA->MODER &= ~(3u << (5 * 2));           /* 2. clear the two mode bits of pin 5 ... */
    GPIOA->MODER |=  (1u << (5 * 2));           /*    ... and set them to 01: general-purpose output */

    for (;;) {
        GPIOA->BSRR = (1u << 5);                /* 3. bit set: one store, like GPIO_OUT_W1TS on the ESP32 */
        delay(800000);
        GPIOA->BSRR = (1u << (5 + 16));         /*    bit reset: the upper half of the same register, like W1TC */
        delay(800000);
    }
}
