# Host-side code and tests

Portable C for the Phase 1 lessons, built and tested on your computer. No board needed.

```
make test
```

Compiled with `-Wall -Wextra -Werror -Wconversion` and the address and undefined-behaviour sanitizers. These files were compiled and run with gcc 13 when they were written; all 93 checks passed.

| File | Lesson | What it is |
| --- | --- | --- |
| `ringbuf.c` | 1.8 | Single-producer, single-consumer ring buffer with free-running indices |
| `crc8.c` | 0.12, 1.14 | CRC-8, bit by bit and table-driven |
| `frame.c` | 1.9, 1.14 | Byte-at-a-time frame parser as a state machine, with resynchronisation |
| `convert.c` | 3.2, 3.3, 3.5 | BCD, DS18B20 and MPU6050 conversions, CRC-8/MAXIM, MCP3008 decode |
| `nmea.c` | 3.1 | NMEA checksum and field splitting |
| `modbus.c` | 3.7 | CRC-16, request builder, slave for holding registers with exception replies |
| `bmp280_comp.c` | 3.2 | Datasheet compensation for temperature and pressure, tested on the datasheet's worked example |
| `shell.c` | 1.12, 3.1 | Table-driven command dispatcher |
| `test_all.c` | 1.14 | A plain test runner; lesson 1.14 has you port it to Unity |

These are reference solutions. Write your own first; the lessons give the specification.
