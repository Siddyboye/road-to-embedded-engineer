# Firmware

One buildable ESP-IDF project per lab: `firmware/<phase>/<lesson>-<name>/`.

- Baseline: ESP-IDF v6.1. CI also builds on v6.0.3. The Phase 0 labs use only APIs present since v5.3.
- Each lab has a `platformio.ini` (`framework = espidf`, sources in `main/`), pinned to `espressif32 @ ^8.0.0`, the platform release that ships ESP-IDF 6.1. In a lab folder: `pio run -t upload -t monitor`. These files have not been run by me.
- Every project carries `sdkconfig.defaults.esp32s3` and `sdkconfig.defaults.esp32`. ESP-IDF picks the file matching the target you set.
- `host/` holds portable C with tests that run on your computer: ring buffer, CRC-8, frame parser, conversions, NMEA, Modbus, BMP280 compensation and a command shell. Run `make test` there. This code was compiled and its 93 checks passed.
- `tools/` will hold Python host tools (serial drivers, log parsers), starting with lesson 1.16.

## Build status

A lab is listed as built only when the GitHub Actions workflow has compiled it. Nothing is assumed.

| Lab | Lessons | esp32s3 | esp32 | Notes |
| --- | --- | --- | --- | --- |
| phase0/0.1-hello | 0.1, 0.2 | not yet built | not yet built | |
| phase0/0.3-blink | 0.3 | not yet built | not yet built | GPIO33 on the ESP32-CAM, GPIO4 on the S3 |
| phase0/0.5-pin | 0.5 | not yet built | not yet built | Button on GPIO5 (S3) or GPIO13 (classic) |
| phase0/0.7-bounce | 0.7 | not yet built | not yet built | Button on GPIO5 (S3) or GPIO13 (classic) |
| phase0/0.8-adc | 0.8 | not yet built | not supported | S3 only: jumper GPIO6 to GPIO4 |
| phase0/0.9-wait | 0.9, 0.10 | not yet built | not yet built | Output on GPIO6 (S3) or GPIO13 (classic) |
| phase0/0.13-registers | 0.13 | not yet built | not yet built | LED on GPIO4; valid for pins 0 to 31 |
| phase0/0.14-ranger | 0.14 | not yet built | not yet built | S3: TRIG 18, ECHO 17 (through the divider), RGB on 4, 5, 21; register dump on the S3 only. Classic: TRIG 13, ECHO 14, RGB on 25, 26, 27 (DevKitC-VE) |

All eight were written against the ESP-IDF v6.1 API and have not been compiled. The first CI run decides; fix reports go into this table.

## Reference solutions for Phases 2 and 3

Written for the ESP32-S3 against the ESP-IDF v6 driver APIs. **None of these has been compiled:** neither ESP-IDF nor PlatformIO could be installed where they were written. What was checked: every source's brackets and preprocessor blocks balance, every header it includes has its component listed in `PRIV_REQUIRES`, and all protocol and conversion logic they share lives in `host/`, where it is compiled and passes 93 checks against published values (datasheet examples and CRC catalogue values).

A further check was run on all 37 lab sources (Phases 0, 2 and 3) against the real ESP-IDF v6.1 source, fetched from GitHub:

- every header a lab includes exists in v6.1;
- every ESP-IDF function, macro, enum constant, type and struct field name a lab uses exists in those headers;
- every component named in a lab's `PRIV_REQUIRES` exists in v6.1;
- the signatures of the riskiest calls were read by eye.

That rules out renamed or removed interfaces. It does not prove that argument types match everywhere or that a lab links, and it says nothing about behaviour on hardware. A real build is still the test: send me the first error a lab prints and I will fix it.

Write your own solution before opening one of these.

| Folder | Lesson | What it does | Status |
| --- | --- | --- | --- |
| `phase2/2.1-opendrain` | 2.1 | Two boards share an open-drain line | not yet built |
| `phase2/2.2-isr-queue` | 2.2 | Interrupt latency; ISR hands work to a task through a queue | not yet built |
| `phase2/2.3-gptimer` | 2.3 | 1 kHz hardware-timer interrupt with auto-reload | not yet built |
| `phase2/2.4-ledc` | 2.4 | LED fade and servo pulses | not yet built |
| `phase2/2.5-echo` | 2.5 | Ultrasonic echo timed by GPIO interrupt and by MCPWM capture | not yet built |
| `phase2/2.6-adc` | 2.6 | Calibrated ADC readings and their spread | not yet built |
| `phase2/2.7-ws2812` | 2.7 | Addressable LED from datasheet timing with RMT | not yet built |
| `phase2/2.8-encoder` | 2.8 | Quadrature decoding with the pulse counter | not yet built |
| `phase2/2.10-watchdog` | 2.10 | Task watchdog and reset reasons | not yet built |
| `phase2/2.12-sleep` | 2.12 | Deep sleep, two wake sources, RTC memory | not yet built |
| `phase3/3.1a-uart-bitbang` | 3.1 | UART transmit and receive by hand, checked against the peripheral | not yet built |
| `phase3/3.1b-uart-shell` | 3.1 | Command shell on UART1 | not yet built |
| `phase3/3.1c-uart-frames` | 3.1 | Framed messages with CRC; NMEA checksum and fields | not yet built |
| `phase3/3.2a-i2c-bitbang` | 3.2 | Bit-banged I2C master and bus scanner | not yet built |
| `phase3/3.2b-mpu6050` | 3.2 | I2C master driver; MPU6050 from its register map | not yet built |
| `phase3/3.2c-ssd1306` | 3.2 | SSD1306 OLED: init, framebuffer, digits | not yet built |
| `phase3/3.2d-bmp280` | 3.2 | BMP280/BME280 temperature and pressure with datasheet compensation | not yet built |
| `phase3/3.2e-ds3231` | 3.2 | DS3231 clock, BCD registers | not yet built |
| `phase3/3.3a-spi-bitbang` | 3.3 | Bit-banged SPI in all four modes, loopback-verified | not yet built |
| `phase3/3.3b-st7789` | 3.3 | ST7789 display from its command table | not yet built |
| `phase3/3.3c-sd-raw` | 3.3 | SD card initialised by hand; read block 0 | not yet built |
| `phase3/3.3d-mcp3008` | 3.3 | MCP3008 ADC in one 3-byte transfer | not yet built |
| `phase3/3.4-i2s-mic` | 3.4 | INMP441 microphone level meter | not yet built |
| `phase3/3.5-ds18b20` | 3.5 | 1-Wire from scratch; DS18B20 with CRC | not yet built |
| `phase3/3.7-modbus-slave` | 3.7 | Modbus RTU slave over RS-485 | not yet built |
| `phase3/3.11-stm32/blink_registers.c` | 3.11 | Register-only blink for a Nucleo-64 F4 board; a file to drop into a CubeIDE project | not yet built |

Five labs were added after checking the real interfaces: I downloaded the ESP-IDF v6.1 headers and official examples, and the esp32-camera component, and wrote these against them. They are still **not compiled**.

| Folder | Lesson | What it does | Written against | Status |
| --- | --- | --- | --- | --- |
| `phase2/2.9-touch` | 2.9 | Capacitive touch with a threshold set from the measured baseline | v6.1 `driver/touch_sens.h` and the `touch_sens_basic` example | not yet built |
| `phase2/2.11-adc-continuous` | 2.11 | 20 kHz sampling by DMA, one wake-up per block | v6.1 `esp_adc/adc_continuous.h` and the `continuous_read` example | not yet built |
| `phase3/3.6-can` | 3.6 | CAN node: self-test on one board, or two boards; filter, error counters, bus-off recovery | v6.1 `esp_twai.h`, `esp_twai_onchip.h` and the TWAI examples | not yet built |
| `phase3/3.8-usb-cdc` | 3.8 | The S3 as a USB serial device | v6.1 `tusb_serial_device` example, `esp_tinyusb` 2.x | not yet built |
| `phase3/3.10-camera` | 3.10 | JPEG frames from the ESP32-CAM; prints one for `tools/save_jpeg.py` | `esp32-camera` at its November 2026 head, including its AI-Thinker pin table | not yet built |

Lessons 2.13, 3.9 and 3.12 have no firmware. Lesson 3.8's keyboard and storage devices are left to you.

`components/course` compiles the files in `host/` into every lab that needs them, so the firmware and the host tests share one copy.
