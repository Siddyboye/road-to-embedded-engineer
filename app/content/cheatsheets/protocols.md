---
title: Serial protocols at a glance
order: 3
---

Typical figures for choosing a bus. Each protocol’s Phase 3 module gives the exact limits with their sources.

| Bus | Signal wires | Typical speed | Reach | Devices | Clock | Pick it when |
| --- | --- | --- | --- | --- | --- | --- |
| UART | 2 (TX, RX) | 9600 to a few Mbit/s | Board to board; metres with RS-232 | 2, point to point | None: both ends agree on the baud rate | Debug consoles, GPS, modems, linking two processors |
| RS-485 | 1 differential pair | Up to about 10 Mbit/s over short runs | Hundreds of metres at low speed | Dozens on one pair | None | Industrial sensors, Modbus, noisy environments |
| I2C | 2 (SDA, SCL), open-drain | 100 kbit/s, 400 kbit/s, 1 Mbit/s | One board; limited by bus capacitance | Many, by 7-bit address | Master | Several low-speed sensors on few pins |
| SPI | 3 plus one chip select per device | 1 to tens of Mbit/s | One board | One per chip-select line | Master | Displays, SD cards, fast ADCs, flash memory |
| I2S | 3 (clock, word select, data) | Set by audio rate | One board | Usually one in, one out | Master | Digital audio to and from microphones and amplifiers |
| 1-Wire | 1 plus ground | About 16 kbit/s | Metres | Many, by 64-bit ID | None: timed slots | A few temperature sensors on a long wire |
| CAN | 1 differential pair | Up to 1 Mbit/s (classic) | 40 m at 1 Mbit/s, longer when slower | Many, any can transmit | None: bit-timed with arbitration | Vehicles, robots, anything safety-related |
| USB | 1 differential pair | 12 Mbit/s full speed on the S3 | A few metres | Host plus devices | Embedded in the data | Talking to a computer or phone |

Use the diagram below to see why I2C and SPI differ: change the protocol, scrub through the frame, and read the note under it.

::widget timing
