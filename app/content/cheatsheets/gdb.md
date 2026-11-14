---
title: GDB commands
order: 6
---

Start a session with `idf.py openocd` and `idf.py gdb`, or from PlatformIO with `debug_tool = esp-builtin`. Lessons 1.15 and 7.3.

| Do | Command |
| --- | --- |
| Stop at a function | `break app_main` (`b`) |
| Stop at a line | `break main.c:42` |
| Stop only when a condition holds | `break main.c:42 if count == 5` |
| Stop when a variable is written | `watch tick` |
| Run on | `continue` (`c`) |
| Step over a line | `next` (`n`) |
| Step into a call | `step` (`s`) |
| Run until the current function returns | `finish` |
| Print a value | `print tick` (`p`), `p/x value` for hex |
| Print a struct through a pointer | `p *cfg` |
| Change a value | `set var tick = 0` |
| Show the call stack | `backtrace` (`bt`) |
| List tasks | `info threads` |
| Switch to a task | `thread 3` |
| Registers | `info registers` |
| Memory: four words in hex | `x/4xw 0x60004004` |
| Memory: a string | `x/s ptr` |
| List breakpoints; delete one | `info breakpoints`, `delete 2` |
| Run commands at a breakpoint | `commands 1`, then lines, then `end` |
| Reset and halt the chip | `monitor reset halt` |
| Leave | `quit` |

**Notes for the ESP32**

- Code in flash uses hardware breakpoints, and the chip has only a few. Delete those you are not using.
- “optimized out” means the compiler removed or merged the variable. Build with the debug optimisation level for a debugging session.
- Halting the CPU stops the radio and the watchdog feeding. Timing-sensitive bugs need a logic analyzer or logs.
- On the S3, JTAG is on the native USB port, not the UART one.
