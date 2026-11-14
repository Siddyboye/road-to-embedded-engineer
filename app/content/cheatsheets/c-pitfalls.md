---
title: C pitfalls
order: 4
---

The mistakes that survive code review. Each line is one a lesson made you cause on purpose.

| Pitfall | What happens | Instead | Lesson |
| --- | --- | --- | --- |
| `uint8_t a, b; a + b` | Computed as `int`: no wrap until you store it | Cast the result to the type you mean | 1.5 |
| `~mask` on a `uint8_t` | A 32-bit value with the top bits set | `(uint8_t)~mask` | 1.5 |
| Signed compared with unsigned | The signed side is converted; `-1 < 1u` is false | Keep both sides the same signedness | 1.5 |
| `1 << 31` | Signed overflow: undefined | `1u << 31` | 0.11 |
| Shift by the width or more | Undefined | Check the count | 1.5 |
| Signed overflow | Undefined; the compiler may delete your check | Unsigned maths, or check before adding | 1.5 |
| `sizeof` on an array parameter | Size of a pointer | Pass the length | 1.2 |
| Returning the address of a local | Dangling pointer | Caller supplies the buffer | 1.2 |
| Shared flag without `volatile` | Loop never sees the change at `-O2` | `volatile`, or a notification | 1.3 |
| `volatile` treated as atomic | `x++` still loses updates | Critical section or atomic type | 1.3, 4.8 |
| Struct sent over a wire | Padding and byte order differ | Encode and decode byte by byte | 1.4 |
| Bitfields for registers | Layout is compiler-defined | Masks and shifts | 1.4 |
| `REG = REG \| bit` shared with an ISR | Read-modify-write race | Set and clear registers | 0.13 |
| Large local array | Stack overflow, far from the cause | `static`, or allocate once | 1.11 |
| Unchecked `malloc` | Crash on the ten-millionth pass | Check; prefer static pools | 1.10 |
| `printf` in an ISR | Deadlock or watchdog reset | Queue the event to a task | 2.2 |
| Macro arguments used twice | `MAX(i++, j)` increments twice | `static inline` function | 1.6 |
| `=` in a condition | Assigns | Enable warnings as errors | 1.13 |
| `char` assumed signed | Differs by architecture | `int8_t` or `uint8_t` | 1.5 |
| Missing `break` | Falls through | Comment intended fall-through; warnings on | 1.13 |

Compile with `-Wall -Wextra -Werror -Wconversion -Wshadow` on the host and most of this table is caught for you.
