---
title: ESP32-S3 N16R8 pin warnings
order: 1
---

Build your own pin table in lesson 0.6 and trust it over this page: clone boards differ. Rows marked † are from the datasheets as I know them and are re-checked against the Technical Reference Manual when lesson 0.6 is written.

| Pins | Status | Why |
| --- | --- | --- |
| GPIO35, 36, 37 | Do not use | Wired to the octal flash and PSRAM inside the module on R8 variants (Espressif DevKitC-1 user guide) |
| GPIO26 to 32 † | Not available | Flash and PSRAM bus; not broken out |
| GPIO19, GPIO20 | Reserve for USB | USB D− and D+ of the native USB port, which also carries the built-in JTAG |
| GPIO0, 3, 45, 46 † | Avoid | Strapping pins, sampled at reset. GPIO0 low at reset enters download mode |
| GPIO43, GPIO44 † | Avoid if you use the UART console | UART0 TX and RX, connected to the USB-UART bridge |
| GPIO48 or GPIO38 | On-board RGB LED | GPIO48 on DevKitC-1 v1.0, GPIO38 on v1.1; clones vary |
| GPIO39 to 42 † | Usable | Also the external JTAG pins, only relevant if you attach a probe |
| GPIO1, 2, 4 to 18, 21, 47 † | First choice | No boot, USB or memory role on the common variants |

Other rules worth memorising:

- The S3 is a 3.3 V device. A 5 V signal such as the HC-SR04 echo needs a divider or a level shifter.
- ADC2 is shared with Wi-Fi on Espressif chips; use ADC1 pins for analog inputs in any project that uses the radio †.
- The S3 has no DAC. The classic ESP32 has two, on GPIO25 and GPIO26.
