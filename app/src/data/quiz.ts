// Question bank. Phase 0 is written out in full below; Phases 1 to 10 follow, built with small helpers.
export type QType = 'mcq' | 'multi' | 'predict' | 'register' | 'match' | 'short' | 'timing';
export type Question = {
  id: string; phase: number; lesson: string; tags: string[]; type: QType; level: 1 | 2 | 3;
  prompt: string; code?: string;
  options?: string[];          // mcq, multi
  answer: number | number[] | string; // mcq: index. multi: indices. predict: text. register/timing: number as string. short: model answer
  pairs?: [string, string][]; // match
  byte?: number;              // timing: UART frame to decode
  explain: string;
};

export const questions: Question[] = [
  { id: 'p0-ohm-led', phase: 0, lesson: '0.4', tags: ['electricity'], type: 'mcq', level: 1,
    prompt: 'A red LED with a 2.0 V forward drop is driven from a 3.3 V GPIO through a 330 Ω resistor. What current flows?',
    options: ['About 3.9 mA', 'About 10 mA', 'About 6.1 mA', 'About 0.39 mA'], answer: 0,
    explain: 'The resistor sees 3.3 − 2.0 = 1.3 V. I = 1.3 V / 330 Ω ≈ 3.9 mA.' },
  { id: 'p0-divider', phase: 0, lesson: '0.5', tags: ['electricity'], type: 'mcq', level: 1,
    prompt: 'A divider has 1 kΩ on top and 2 kΩ on the bottom, fed with 5 V. What is the output?',
    options: ['1.67 V', '2.50 V', '3.33 V', '3.75 V'], answer: 2,
    explain: 'Vout = Vin × R2 / (R1 + R2) = 5 × 2000 / 3000 = 3.33 V. This is the divider for a 5 V echo pin.' },
  { id: 'p0-floating', phase: 0, lesson: '0.5', tags: ['electricity', 'gpio'], type: 'mcq', level: 1,
    prompt: 'A button is wired between a GPIO and ground. The pin reads random values when the button is released. What is missing?',
    options: ['A current-limiting resistor in series', 'A pull-up, so the released pin has a defined level', 'A decoupling capacitor on the supply', 'A faster polling loop'], answer: 1,
    explain: 'With the button open nothing drives the pin, so it floats. A pull-up resistor (internal or external) holds it high until the button pulls it to ground.' },
  { id: 'p0-match-outputs', phase: 0, lesson: '0.5', tags: ['gpio'], type: 'match', level: 2,
    prompt: 'Match each term to what it means.',
    pairs: [['Push-pull', 'Drives the line both high and low'], ['Open-drain', 'Can only pull low; a resistor pulls the line high'], ['Floating', 'Not driven by anything; reads noise'], ['Pull-down', 'A resistor that holds an undriven line low']],
    answer: '', explain: 'Open-drain is what lets several I2C devices share one wire without fighting each other.' },
  { id: 'p0-mask', phase: 0, lesson: '0.11', tags: ['bits'], type: 'register', level: 1,
    prompt: 'Write the mask that has only bit 5 set, in hex.', answer: '0x20',
    explain: '1 << 5 = 32 = 0x20.' },
  { id: 'p0-twos', phase: 0, lesson: '0.11', tags: ['bits'], type: 'register', level: 2,
    prompt: 'What is the 8-bit two’s-complement representation of −3, in hex?', answer: '0xFD',
    explain: 'Invert 0x03 to get 0xFC and add one: 0xFD. Equivalently 256 − 3 = 253.' },
  { id: 'p0-wrap', phase: 0, lesson: '0.11', tags: ['c', 'bits'], type: 'predict', level: 2,
    prompt: 'What does this print?', code: 'uint8_t x = 250;\nx += 10;\nprintf("%u", x);', answer: '4',
    explain: 'A uint8_t holds 0 to 255. 260 wraps modulo 256 to 4. Unsigned wrap-around is defined behaviour; signed overflow is not.' },
  { id: 'p0-endian', phase: 0, lesson: '0.11', tags: ['c', 'bits'], type: 'predict', level: 2,
    prompt: 'On an ESP32 (little-endian), what does this print?', code: 'uint32_t v = 0x11223344;\nuint8_t *p = (uint8_t *)&v;\nprintf("%02x", p[0]);', answer: '44',
    explain: 'Little-endian stores the least significant byte at the lowest address, so p[0] is 0x44.' },
  { id: 'p0-uart-time', phase: 0, lesson: '0.9', tags: ['timing', 'uart'], type: 'mcq', level: 2,
    prompt: 'How long does one byte take on the wire at 115200 baud, 8N1?',
    options: ['About 8.7 µs', 'About 69 µs', 'About 87 µs', 'About 1 ms'], answer: 2,
    explain: '8N1 is 10 bits per byte: start, eight data, stop. 10 / 115200 ≈ 86.8 µs.' },
  { id: 'p0-uart-decode', phase: 0, lesson: '0.7', tags: ['timing', 'uart'], type: 'timing', level: 3,
    prompt: 'Decode the byte in this UART frame (8N1). Answer in hex.', byte: 0x53, answer: '0x53',
    explain: 'After the start bit the data bits arrive least significant first: 1 1 0 0 1 0 1 0. Read right to left: 0101 0011 = 0x53, the letter S.' },
  { id: 'p0-nyquist', phase: 0, lesson: '0.8', tags: ['signals'], type: 'mcq', level: 2,
    prompt: 'A 3 kHz tone is sampled at 4 kHz with no filter. Where does it appear in the sampled data?',
    options: ['At 3 kHz', 'At 1 kHz', 'At 7 kHz', 'It disappears'], answer: 1,
    explain: 'Anything above fs/2 = 2 kHz folds back: 4 kHz − 3 kHz = 1 kHz. The samples are indistinguishable from a real 1 kHz tone.' },
  { id: 'p0-pwm', phase: 0, lesson: '0.9', tags: ['timing'], type: 'mcq', level: 1,
    prompt: 'An 8-bit PWM channel is given a duty value of 64. What is the duty cycle?',
    options: ['6.4%', '25%', '50%', '64%'], answer: 1,
    explain: '8 bits give 256 steps. 64 / 256 = 25%.' },
  { id: 'p0-strapping', phase: 0, lesson: '0.6', tags: ['esp32-s3', 'pins'], type: 'multi', level: 2,
    prompt: 'Which of these are strapping pins on the ESP32-S3? Select all that apply.',
    options: ['GPIO0', 'GPIO2', 'GPIO3', 'GPIO12', 'GPIO45', 'GPIO46'], answer: [0, 2, 4, 5],
    explain: 'GPIO0, 3, 45 and 46 are sampled at reset on the S3. GPIO2 and GPIO12 are strapping pins on the classic ESP32, not the S3. Confirm in the ESP32-S3 datasheet, “Strapping Pins”.' },
  { id: 'p0-busywait', phase: 0, lesson: '0.10', tags: ['timing', 'rtos'], type: 'short', level: 2,
    prompt: 'In two sentences: why is a busy-wait delay a problem on a system running an RTOS?',
    answer: 'A busy loop keeps the CPU at full use and never yields, so lower-priority tasks cannot run and the idle task cannot feed the watchdog or enter a low-power state. A blocking delay such as vTaskDelay tells the scheduler the task has nothing to do, letting other work run.',
    explain: 'Short busy-waits of a few microseconds are sometimes necessary for bit timing; the problem is using them for long delays.' },
  { id: 'p0-boot-partition', phase: 0, lesson: '0.1', tags: ['boot'], type: 'mcq', level: 1,
    prompt: 'Which boot stage reads the partition table and chooses the application to start?',
    options: ['The ROM bootloader', 'The second-stage bootloader', 'FreeRTOS', 'app_main()'], answer: 1,
    explain: 'The ROM bootloader only loads the second stage. The second-stage bootloader, built with your project, reads the partition table and picks the app. That is also where OTA rollback is decided.' },
  { id: 'p0-n16r8', phase: 0, lesson: '0.1', tags: ['esp32-s3'], type: 'mcq', level: 1,
    prompt: 'What does “N16R8” in a module name mean?',
    options: ['16 GPIOs and 8 ADC channels', '16 MB of flash and 8 MB of PSRAM', '16-bit timers and 8-bit ADC', 'Hardware revision 16.8'], answer: 1,
    explain: 'N is flash, R is PSRAM. On the R8 variants the PSRAM uses GPIO35 to 37, which is why they are unavailable.' },
  { id: 'p0-sdkconfig', phase: 0, lesson: '0.2', tags: ['tools'], type: 'mcq', level: 1,
    prompt: 'Which file belongs in version control?',
    options: ['sdkconfig', 'sdkconfig.defaults', 'build/project_description.json', 'All of them'], answer: 1,
    explain: 'sdkconfig is generated and holds thousands of options. sdkconfig.defaults records only the choices you made.' },
  { id: 'p0-download-mode', phase: 0, lesson: '0.3', tags: ['boot', 'pins'], type: 'mcq', level: 1,
    prompt: 'On an ESP32-CAM, what puts the chip into download mode?',
    options: ['Holding GPIO0 low while it resets', 'Holding the reset pin low', 'Connecting 5 V to the 3.3 V pin', 'Sending a break on the serial line'], answer: 0,
    explain: 'The ROM bootloader samples GPIO0 at reset. Low means wait for a download; high means run from flash.' },
  { id: 'p0-blue-led', phase: 0, lesson: '0.4', tags: ['electricity'], type: 'mcq', level: 2,
    prompt: 'A blue LED (about 3.0 V forward drop) is driven from 3.3 V through 330 Ω. Roughly what current flows?',
    options: ['About 10 mA', 'About 4 mA', 'About 0.9 mA', 'None at all'], answer: 2,
    explain: 'Only 0.3 V is left for the resistor: 0.3 / 330 ≈ 0.9 mA. Lowering the resistor helps little because there is so little voltage to work with.' },
  { id: 'p0-echo-5v', phase: 0, lesson: '0.5', tags: ['electricity', 'pins'], type: 'mcq', level: 1,
    prompt: 'The HC-SR04 runs on 5 V. Which of its signals needs attention before it meets an ESP32?',
    options: ['TRIG, because 3.3 V is too low to trigger it', 'ECHO, because it drives 5 V into a 3.3 V input', 'Both need level shifters', 'Neither'], answer: 1,
    explain: 'ECHO is an output at 5 V and must be divided down. TRIG is an input to the sensor, and 3.3 V is high enough for it to read as 1.' },
  { id: 'p0-echo-time', phase: 0, lesson: '0.5', tags: ['timing'], type: 'mcq', level: 2,
    prompt: 'Sound travels about 343 m/s. How long is the echo pulse for an object 1 m away?',
    options: ['About 2.9 ms', 'About 5.8 ms', 'About 58 µs', 'About 29 ms'], answer: 1,
    explain: 'The sound travels there and back: 2 m at 343 m/s ≈ 5.8 ms. That is the “58 µs per centimetre” rule.' },
  { id: 'p0-debounce-cost', phase: 0, lesson: '0.7', tags: ['signals'], type: 'mcq', level: 1,
    prompt: 'What does a longer debounce window cost?',
    options: ['More flash', 'More latency on every real press', 'A higher chance of counting a press twice', 'More current'], answer: 1,
    explain: 'The level must hold for the whole window before it is accepted, so the window is added to every press.' },
  { id: 'p0-alias-num', phase: 0, lesson: '0.8', tags: ['signals'], type: 'register', level: 2,
    prompt: 'A 70 Hz signal is sampled at 100 Hz. At what frequency, in Hz, does it appear?', answer: '30',
    explain: 'The nearest multiple of the sample rate is 100 Hz, and 100 − 70 = 30 Hz.' },
  { id: 'p0-timer-freq', phase: 0, lesson: '0.9', tags: ['timing'], type: 'mcq', level: 2,
    prompt: 'A timer runs from an 80 MHz clock with a prescaler of 80 and a period of 1000 ticks. What is the output frequency?',
    options: ['1 MHz', '80 kHz', '1 kHz', '100 Hz'], answer: 2,
    explain: '80 MHz / 80 = 1 MHz tick rate. 1 MHz / 1000 = 1 kHz.' },
  { id: 'p0-ticks', phase: 0, lesson: '0.10', tags: ['timing', 'rtos'], type: 'register', level: 3,
    prompt: 'With the default 100 Hz tick, what does pdMS_TO_TICKS(5) evaluate to?', answer: '0',
    explain: 'One tick is 10 ms and the macro truncates, so 5 ms becomes 0 ticks and the delay returns almost immediately.' },
  { id: 'p0-float-limit', phase: 0, lesson: '0.12', tags: ['numbers'], type: 'mcq', level: 2,
    prompt: 'What is the largest value up to which a 32-bit float can represent every integer?',
    options: ['65,535', '16,777,216', '2,147,483,647', '4,294,967,295'], answer: 1,
    explain: 'A float has 24 bits of precision, so integers are exact up to 2^24 = 16,777,216. Above that the gap between neighbours is 2 or more.' },
  { id: 'p0-q88', phase: 0, lesson: '0.12', tags: ['numbers'], type: 'register', level: 2,
    prompt: 'In Q8.8 fixed point, what integer represents 1.5?', answer: '384',
    explain: '1.5 × 2^8 = 1.5 × 256 = 384.' },
  { id: 'p0-w1ts', phase: 0, lesson: '0.13', tags: ['registers'], type: 'mcq', level: 2,
    prompt: 'Why do chips provide a “write 1 to set” register alongside the plain output register?',
    options: ['It is faster to decode', 'It changes only the named bits in one store, so an interrupt cannot corrupt the update', 'It uses less power', 'It lets you write more than 32 pins at once'], answer: 1,
    explain: 'OUT |= mask is a read, a modify and a write. An interrupt between the read and the write is silently undone. A single store to W1TS cannot be interrupted part-way.' },
  { id: 'p0-enable', phase: 0, lesson: '0.13', tags: ['registers', 'gpio'], type: 'short', level: 2,
    prompt: 'A pin’s bit in the output register reads 1, but the pin measures 0 V. Name two things to check.',
    answer: 'The pin’s bit in the output-enable register (the pin may still be an input), and the function select in the IO MUX (the pin may be assigned to another peripheral). Also worth checking: a short to ground, or the wrong pin number.',
    explain: 'The output value only reaches the pad when the driver is enabled and the pad is routed to GPIO.' },
];

export const phaseHasQuiz = (phase: number) => questions.some(q => q.phase === phase);

// ---- Phases 1 to 10: a first bank per phase, written with small helpers ----
const mc = (id: string, lesson: string, tags: string[], level: 1 | 2 | 3, prompt: string, options: string[], answer: number, explain: string): Question =>
  ({ id, phase: Number(lesson.split('.')[0]), lesson, tags, type: 'mcq', level, prompt, options, answer, explain });
const multi = (id: string, lesson: string, tags: string[], level: 1 | 2 | 3, prompt: string, options: string[], answer: number[], explain: string): Question =>
  ({ id, phase: Number(lesson.split('.')[0]), lesson, tags, type: 'multi', level, prompt, options, answer, explain });
const num = (id: string, lesson: string, tags: string[], level: 1 | 2 | 3, prompt: string, answer: string, explain: string): Question =>
  ({ id, phase: Number(lesson.split('.')[0]), lesson, tags, type: 'register', level, prompt, answer, explain });
const out = (id: string, lesson: string, tags: string[], level: 1 | 2 | 3, prompt: string, code: string, answer: string, explain: string): Question =>
  ({ id, phase: Number(lesson.split('.')[0]), lesson, tags, type: 'predict', level, prompt, code, answer, explain });
const say = (id: string, lesson: string, tags: string[], level: 1 | 2 | 3, prompt: string, answer: string, explain: string): Question =>
  ({ id, phase: Number(lesson.split('.')[0]), lesson, tags, type: 'short', level, prompt, answer, explain });

questions.push(
  // Phase 1
  mc('p1-bss', '1.1', ['memory'], 1, 'Where does `static uint8_t buf[1024];` live, and what does it cost?', ['.data: RAM and flash', '.bss: RAM only', '.rodata: flash only', 'The stack'], 1, 'Zero-initialised statics go in .bss. They take RAM but add nothing to the binary, because start-up code simply clears the region.'),
  out('p1-ptr', '1.2', ['c', 'pointers'], 1, 'What does this print?', 'uint16_t a[4] = { 10, 20, 30, 40 };\nuint16_t *p = a;\nprintf("%u", *(p + 2));', '30', 'Pointer arithmetic moves in units of the pointed-to type, so p + 2 is the third element.'),
  mc('p1-volatile', '1.3', ['c'], 2, 'What does `volatile` NOT do?', ['Stop the compiler caching the value in a register', 'Force every read and write to happen', 'Make `x++` atomic with respect to interrupts', 'Suit a memory-mapped register'], 2, 'volatile only controls optimisation. x++ is still read, add, write, and an interrupt can land between the steps.'),
  num('p1-sizeof', '1.4', ['c', 'memory'], 2, 'On a typical 32-bit target, what is `sizeof(struct { char a; int b; char c; })`?', '12', 'a at 0, three bytes of padding, b at 4 to 7, c at 8, then three bytes of tail padding so the size is a multiple of 4.'),
  out('p1-promote', '1.5', ['c'], 2, 'What does this print?', 'uint8_t a = 200, b = 100;\nprintf("%d", a + b);', '300', 'Both operands are promoted to int before the addition, so nothing wraps. Assigning the result back to a uint8_t would give 44.'),
  out('p1-signed', '1.5', ['c'], 3, 'What does this print?', 'int i = -1;\nunsigned u = 1;\nprintf("%d", i < u);', '0', 'The int is converted to unsigned, becoming a very large number, so the comparison is false.'),
  mc('p1-ring', '1.8', ['data-structures'], 2, 'A ring buffer keeps free-running `head` and `tail` counters. How many items does it hold?', ['head + tail', 'head − tail, in unsigned arithmetic', 'tail − head', 'head modulo capacity'], 1, 'Unsigned subtraction stays correct even after the counters wrap, which is why the reference implementation needs no “one empty slot” rule.'),
  say('p1-layers', '1.12', ['design'], 2, 'In one or two sentences: how do you decide what goes into a HAL?', 'Only the operations your drivers actually need from the hardware, expressed without any vendor types: for the ultrasonic driver, set a pin, read a pin, read the time, wait. It should be small enough to re-implement for a new chip or a test fake in an hour.', 'A HAL that mirrors the vendor API abstracts nothing.'),
  // Phase 2
  mc('p2-od', '2.1', ['gpio'], 1, 'Why can several open-drain outputs share one wire safely?', ['They take turns under software control', 'Each can only pull the line low; a resistor pulls it high, so they never fight', 'They have built-in current limiters', 'They are slower'], 1, 'No output ever drives high, so two outputs disagreeing cannot short the supply. This is the basis of I2C and 1-Wire.'),
  multi('p2-isr', '2.2', ['interrupts', 'rtos'], 2, 'Which of these are acceptable inside an interrupt handler? Select all that apply.', ['xQueueSendFromISR()', 'printf()', 'vTaskDelay()', 'Setting a volatile flag', 'Taking a mutex'], [0, 3], 'An ISR must be short and must never block. Only FromISR functions and simple writes to shared variables qualify.'),
  num('p2-alarm', '2.3', ['timing'], 2, 'A timer has a resolution of 1 MHz. What alarm count gives a 50 Hz interrupt?', '20000', '1,000,000 ticks per second divided by 50 is 20,000 ticks per period.'),
  mc('p2-servo', '2.4', ['timing'], 1, 'What does a hobby servo read from its control signal?', ['The duty cycle as a percentage', 'The pulse width, about 1 to 2 ms', 'The frequency', 'The voltage'], 1, 'The pulse repeats every 20 ms; its width, not its duty percentage, encodes the angle.'),
  mc('p2-wdt', '2.10', ['reliability'], 2, 'Where should a watchdog be reset?', ['In a periodic timer interrupt', 'At the start of every task', 'After the system has just done its real job successfully', 'Nowhere: disable it in production'], 2, 'A timer interrupt keeps firing while the application is hung, so feeding from it proves nothing.'),
  mc('p2-sleep', '2.12', ['power'], 1, 'What survives deep sleep on an ESP32?', ['All RAM', 'Only variables in RTC memory, and the RTC timer', 'The stack of the running task', 'Nothing at all'], 1, 'Main RAM is powered down. Waking is a reboot; RTC_DATA_ATTR variables are what carry state across.'),
  // Phase 3
  num('p3-addr', '3.2', ['i2c'], 1, 'A device has the 7-bit I2C address 0x68. What is the first byte on the wire for a write, in hex?', '0xD0', 'The address is shifted left one bit and the read/write bit, 0 for write, is appended: 0x68 << 1 = 0xD0.'),
  mc('p3-ack', '3.2', ['i2c'], 2, 'While the master is reading bytes from a device, who drives the acknowledge bit?', ['The device', 'The master', 'Nobody', 'Whoever sent the start'], 1, 'The receiver of each byte acknowledges it. During a read that is the master, which sends NACK after the last byte it wants.'),
  mc('p3-spi', '3.3', ['spi'], 2, 'In SPI mode 0, when is data sampled?', ['On the falling edge, clock idles high', 'On the rising edge, clock idles low', 'On both edges', 'While chip select rises'], 1, 'Mode 0 is CPOL 0 (idle low) and CPHA 0 (sample on the first, rising edge).'),
  { id: 'p3-uart-decode', phase: 3, lesson: '3.1', tags: ['uart', 'timing'], type: 'timing', level: 3, prompt: 'Decode the byte in this UART frame (8N1). Answer in hex.', byte: 0x4b, answer: '0x4B', explain: 'After the start bit the bits arrive least significant first: 1 1 0 1 0 0 1 0. Reversed, that is 0100 1011 = 0x4B.' },
  mc('p3-can', '3.6', ['can'], 2, 'Nodes with identifiers 0x123 and 0x0F0 start transmitting together. What happens?', ['Both frames are destroyed and retried', '0x123 wins: higher number, higher priority', '0x0F0 wins and its frame is undamaged; the other backs off', 'The bus enters an error state'], 2, 'A dominant 0 overrides a recessive 1, so the lower identifier wins arbitration without any corruption.'),
  mc('p3-modbus', '3.7', ['modbus'], 2, 'In a Modbus RTU frame, how is the CRC transmitted?', ['High byte first, like the data', 'Low byte first, unlike the data', 'As ASCII hex', 'It is optional'], 1, 'Register values are big-endian but the CRC goes low byte first: an inconsistency worth memorising.'),
  mc('p3-pick', '3.12', ['protocols'], 2, 'Which bus suits a 320×240 colour display refreshed 30 times a second?', ['I2C', 'UART', 'SPI', '1-Wire'], 2, 'That is over four megabytes a second. Only SPI, of these, has the speed.'),
  // Phase 4
  mc('p4-rule', '4.2', ['rtos'], 1, 'Which task does a preemptive priority scheduler run?', ['The one that has waited longest', 'The highest-priority task that is ready', 'Tasks in creation order', 'The one with the shortest remaining time'], 1, 'Everything else about the scheduler follows from this one rule.'),
  mc('p4-until', '4.2', ['rtos', 'timing'], 2, 'A task does 3 ms of work and then calls vTaskDelay for 10 ms. What is its period?', ['Exactly 10 ms', 'About 13 ms, and it drifts with the work time', '7 ms', '3 ms'], 1, 'vTaskDelay waits from now. xTaskDelayUntil waits until a fixed interval after the previous wake-up, giving a steady 10 ms.'),
  mc('p4-inv', '4.5', ['rtos', 'concurrency'], 2, 'What fixes priority inversion?', ['Raising the tick rate', 'Priority inheritance: the lock holder temporarily runs at the waiter’s priority', 'Using a binary semaphore instead of a mutex', 'Disabling the medium-priority task'], 1, 'FreeRTOS mutexes implement inheritance. Binary semaphores do not, which is why a semaphore should not be used as a lock.'),
  multi('p4-deadlock', '4.5', ['rtos', 'concurrency'], 2, 'Which practices prevent deadlock? Select all that apply.', ['Always taking locks in the same global order', 'Using timeouts and backing off', 'Raising every task’s priority', 'Giving the resource to one task and sending it requests by queue'], [0, 1, 3], 'Deadlock needs a cycle of waiting. Ordering, timeouts and single ownership each break the cycle; priorities do not.'),
  mc('p4-isr-mutex', '4.8', ['rtos', 'interrupts'], 2, 'Why can an interrupt handler not take a mutex?', ['Mutexes are too slow', 'An ISR cannot block, and a mutex belongs to a task', 'ISRs run on the other core', 'It can, with FromISR'], 1, 'If the mutex were held, the ISR would have to wait, which it cannot do. Signal a task instead.'),
  say('p4-smp', '4.9', ['rtos', 'concurrency'], 3, 'On a dual-core chip, why is “my task has the highest priority” no longer a guarantee of exclusive access to shared data?', 'Because a lower-priority task can be running at the same instant on the other core. Priority decides who gets a core, not whether another core is executing code that touches the same data, so real locking is required.', 'This is the commonest bug when single-core code moves to the S3.'),
  // Phase 5
  mc('p5-tcp', '5.3', ['networking'], 2, 'You send two 100-byte messages over TCP. What may the receiver get from one recv call?', ['Always exactly one message', 'Any number of bytes: part of one, or both joined', 'Nothing until both arrive', 'An error'], 1, 'TCP is a byte stream with no message boundaries. Your own framing restores them.'),
  mc('p5-tls', '5.4', ['security', 'networking'], 2, 'What does disabling certificate verification allow?', ['Faster handshakes with no downside', 'Anyone on the path to impersonate the server while the link still looks encrypted', 'Nothing, if the password is strong', 'Use of older servers only'], 1, 'Encryption without authentication protects you from nobody who can intercept the connection.'),
  mc('p5-qos', '5.5', ['mqtt'], 2, 'What does MQTT QoS 1 guarantee?', ['Delivery at most once', 'Delivery at least once; duplicates are possible', 'Delivery exactly once', 'Ordered delivery across topics'], 1, 'The message is retried until acknowledged, so a lost acknowledgement produces a duplicate. Commands should be idempotent.'),
  mc('p5-lwt', '5.5', ['mqtt'], 1, 'What is an MQTT last-will message?', ['The final message a device sends before sleeping', 'A message the broker publishes on the device’s behalf if it disconnects unexpectedly', 'A retained configuration', 'An error code'], 1, 'It is registered at connect time and is how other clients learn that a device has died.'),
  mc('p5-gatt', '5.7', ['ble'], 1, 'In BLE, what is a characteristic?', ['A radio channel', 'A named value with permissions that a central can read, write or subscribe to', 'A pairing key', 'An advertising packet'], 1, 'GATT exposes data as a table of characteristics grouped into services.'),
  mc('p5-ota', '5.9', ['ota'], 2, 'With rollback enabled, when should new firmware mark itself valid?', ['As the first line of app_main', 'After its self-test passes, for example after reconnecting', 'Never: the bootloader does it', 'Before the download'], 1, 'Marking valid immediately defeats rollback: an image that crashes ten seconds later would stay installed.'),
  // Phase 6
  mc('p6-flash', '6.1', ['storage'], 1, 'Why does NVS append new entries instead of overwriting old ones?', ['Appending is faster to code', 'Flash can only be erased a whole block at a time and wears out, so writes are spread out', 'To keep a history for debugging', 'Because RAM is limited'], 1, 'Erase-before-write and limited erase cycles are why every flash store is log-structured with wear levelling.'),
  mc('p6-fs', '6.2', ['storage'], 1, 'Which file system is designed to survive power loss on internal flash?', ['FAT', 'LittleFS', 'ext2', 'None can'], 1, 'LittleFS is copy-on-write and wear-levelled. FAT is for compatibility with computers, on SD cards.'),
  num('p6-avg', '6.5', ['power'], 2, 'A node draws 90 mA for 3 s every 10 minutes and nothing in between. What is its average current in microamps?', '450', '90 mA × 3 s / 600 s = 0.45 mA = 450 µA. A 2000 mAh cell would last about six months on that alone.'),
  mc('p6-brownout', '6.5', ['power'], 2, 'What typically causes a brown-out reset during a radio transmission?', ['A firmware bug in the Wi-Fi stack', 'The supply voltage dipping under the peak current', 'Overheating', 'The watchdog'], 1, 'Transmit bursts draw hundreds of milliamps. A weak supply or long thin wires let the voltage sag below the detector’s threshold.'),
  mc('p6-table', '6.3', ['storage', 'ota'], 2, 'Why should app partitions be sized generously at the start?', ['Larger partitions boot faster', 'An OTA update replaces an app slot, not the partition table, so the layout is effectively permanent', 'The linker requires it', 'To leave room for logs'], 1, 'Changing the table on deployed devices is a risky migration. Leave headroom.'),
  // Phase 7
  mc('p7-null', '7.2', ['debugging'], 1, 'A panic reports a faulting address of 0x00000008. What is the likeliest cause?', ['Stack overflow', 'A NULL pointer to a struct, with a field at offset 8 accessed', 'Heap exhaustion', 'A watchdog timeout'], 1, 'An address just above zero is a member access through a NULL pointer.'),
  mc('p7-leak', '7.4', ['debugging', 'memory'], 2, 'Free heap is steady over a week, but the largest free block keeps shrinking. What is happening?', ['A memory leak', 'Fragmentation', 'A stack overflow', 'Nothing of concern'], 1, 'A leak lowers total free memory. Fragmentation leaves the total alone and breaks it into smaller pieces.'),
  mc('p7-watch', '7.3', ['debugging'], 2, 'A global is being corrupted and you do not know by what. Which tool finds it fastest?', ['A breakpoint in main', 'A watchpoint on the variable', 'More logging', 'A larger stack'], 1, 'A hardware watchpoint stops execution at the exact instruction that writes the location.'),
  mc('p7-la', '7.5', ['debugging', 'tools'], 1, 'What does a logic analyzer hide that an oscilloscope shows?', ['Timing between channels', 'The actual voltage: slow edges, ringing and levels in the undefined band', 'Protocol bytes', 'Long captures'], 1, 'An analyzer rounds every sample to 0 or 1.'),
  // Phase 8
  mc('p8-proc', '8.1', ['linux'], 1, 'What does a process have that a thread within it does not?', ['Its own stack', 'Its own virtual address space', 'A priority', 'A program counter'], 1, 'Threads share their process’s memory; processes are isolated from each other by the MMU.'),
  mc('p8-dt', '8.2', ['linux'], 1, 'What is the device tree for?', ['Listing files on the root file system', 'Describing the board’s hardware to the kernel so one kernel binary can run on many boards', 'Scheduling processes', 'Storing kernel logs'], 1, 'Buses, addresses and pins live in data, not in driver code.'),
  mc('p8-probe', '8.6', ['linux', 'drivers'], 2, 'What causes the kernel to call an I2C client driver’s probe function?', ['Loading the module', 'A device-tree node whose compatible string matches the driver', 'A user opening a file', 'An interrupt'], 1, 'Matching is by the compatible string; probe then receives the bus and address from the tree.'),
  mc('p8-user', '8.4', ['linux'], 2, 'Why is bit-banging a microsecond-level protocol from Linux userspace unreliable?', ['The GPIO functions are too slow', 'The process can be descheduled at any moment', 'Userspace cannot access GPIO', 'The kernel blocks it'], 1, 'Linux is not real-time by default. That is why a microcontroller sits beside the Linux computer.'),
  // Phase 9
  mc('p9-split', '9.1', ['ml'], 2, 'Why split a dataset by recording session and not by window?', ['Sessions are smaller', 'Windows from one recording are near-duplicates, so splitting by window leaks the test data into training', 'It trains faster', 'Keras requires it'], 1, 'Leakage inflates the score. The honest test is data from a session, day or person the model has never seen.'),
  mc('p9-acc', '9.1', ['ml'], 1, 'A detector sees 900 background windows and 100 events and always answers “background”. What is its accuracy?', ['0%', '10%', '50%', '90%'], 3, '900 of 1000 are right, and it detects nothing. Accuracy alone is meaningless on unbalanced data; quote recall and false alarms.'),
  num('p9-quant', '9.4', ['ml', 'numbers'], 2, 'A tensor has scale 0.5 and zero-point 10. What real value does the stored integer 14 represent?', '2', 'real = scale × (q − zero_point) = 0.5 × (14 − 10) = 2.'),
  mc('p9-arena', '9.6', ['ml', 'memory'], 2, 'What mainly determines the tensor arena size a model needs?', ['The number of weights', 'The largest activation tensors that must exist at the same time', 'The size of the model file', 'The number of classes'], 1, 'Weights stay in flash. RAM holds activations, and the peak is set by the biggest input-output pair of any layer.'),
  mc('p9-feat', '9.2', ['ml', 'signals'], 2, 'A model scores well in the notebook and poorly on the device with the same recorded input. What do you check first?', ['The learning rate', 'That feature extraction and input quantization on the device match training exactly', 'The Wi-Fi signal', 'The stack size'], 1, 'A mismatch in window length, scaling or channel order is the commonest cause.'),
  mc('p9-race', '9.10', ['ml', 'power'], 2, 'What does “race to idle” mean?', ['Run slowly to save power', 'Finish the work quickly at higher power so the chip can sleep sooner, using less energy overall', 'Skip inferences when busy', 'Lower the sample rate'], 1, 'Energy is power × time; the fixed overhead of being awake usually makes faster cheaper.'),
  // Phase 10
  mc('p10-bullet', '10.8', ['career'], 1, 'Which résumé bullet is strongest?', ['Worked on low-power firmware', 'Familiar with ESP32, FreeRTOS, I2C, SPI', 'Cut deep-sleep current from 2 mA to 18 µA by gating the sensor rail, extending battery life from 3 weeks to 14 months (measured)', 'Passionate about embedded systems'], 2, 'Action, method and a measured result. Each number is also an invitation to a conversation you can win.'),
  mc('p10-reset', '10.6', ['career', 'debugging'], 1, 'A device “resets every few hours”. What do you look at first?', ['Rewrite the main loop', 'The recorded reset reason, logs and any core dump', 'Replace the power supply', 'Increase the watchdog timeout'], 1, 'Evidence before hypotheses. The reset reason alone separates brown-out, watchdog, panic and deliberate restart.'),
);
