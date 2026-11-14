=== 2.1 | draft
@why
Pins are the product’s contact with the world. Which pin can do what, how hard it drives and whether it can share a wire decides whether a board works on the first spin.
@need
Two boards, a 4.7 kΩ resistor, lessons 0.5 and 0.13. 60 minutes.
@build
::widget reg

- [ ] Configure one pin on each of two boards as open-drain output with input enabled; join them with one wire and one pull-up to 3.3 V, plus a shared ground
- [ ] Let each board pull the line low on a button press. Read the line on both. When is it high?
- [ ] Reconfigure both as push-pull and reason about what happens when one drives high and the other low. Do not try it
- [ ] Change one pin’s drive strength with `gpio_set_drive_capability` and measure an edge on the analyzer, if you have one
@how
**IO MUX and GPIO matrix.** Each pad can be connected to a few peripheral signals directly through the IO MUX: fastest, fixed pins. Or through the GPIO matrix, which routes almost any signal to almost any pin at the cost of a small delay. That flexibility is why ESP32 pinouts are negotiable and why very fast signals prefer their dedicated pins.

**Push-pull** drives both levels. **Open-drain** only pulls low and lets a resistor pull high, so several outputs can share a line: any one can pull it low and none can fight. That is a wired-AND, and it is the electrical basis of I2C and 1-Wire.

**Drive strength** sets how much current the pin can deliver: stronger gives faster edges and more electrical noise. **Hold** latches a pin’s state through sleep.
@deep
- [ ] Find in the reference manual which signals have direct IO MUX pins on your S3. Where is SPI2?
- [ ] Why does an open-drain bus get slower as you add devices?
@when
| Signal | Mode |
| --- | --- |
| LED, chip select, clock out | Push-pull |
| Shared bus: I2C, 1-Wire, interrupt lines from several chips | Open-drain with a pull-up |
| Driving a higher-voltage input through a pull-up | Open-drain, if the pin tolerates that voltage: check first |
@break
- [ ] Remove the pull-up from the shared line and read it on both boards.
@check
1. What can open-drain outputs do together that push-pull outputs cannot?
2. What does routing through the GPIO matrix cost?
3. What is the trade in choosing a stronger drive?
@stretch
- Add a third board to the line. Predict the effect on rise time.
@read
ESP32-S3 Technical Reference Manual: “IO MUX and GPIO Matrix”. ESP-IDF guide: “GPIO & RTC GPIO”.
@pit
- **Two push-pull outputs on one wire.** A short circuit whenever they disagree.
- **Interview angle.** “Explain open-drain and where you would use it.”

=== 2.2 | draft
@why
Interrupts are how hardware gets the CPU’s attention within microseconds. They are also where most timing bugs, races and mysterious crashes come from.
@need
A button or a jumper between two pins, lessons 0.7 and 1.3. 75 minutes.
@build
- [ ] Wire an output pin to an input pin. Raise the output; in the input’s interrupt handler, raise a second output pin
- [ ] Measure the delay between the two rising edges on the logic analyzer over a thousand events: minimum, typical, maximum
- [ ] Add `printf` inside the handler and see what happens. Then remove it
- [ ] Move the real work out: the handler sends the pin number to a queue; a task receives it and prints

```c
static void IRAM_ATTR on_edge(void *arg)
{
    uint32_t pin = (uint32_t)arg;
    BaseType_t woken = pdFALSE;
    xQueueSendFromISR(events, &pin, &woken);
    if (woken) portYIELD_FROM_ISR();
}
```
@how
On an interrupt the CPU finishes its current instruction, saves its state, and jumps to a handler. **Latency** is the time from the event to the handler’s first line; it grows whenever interrupts are disabled or a higher-priority one is running.

**The rules.** Be short. Never block: no delays, no `printf`, no mutexes. Call only the `FromISR` variants of FreeRTOS functions. Share data through `volatile` variables or queues. On ESP32 chips, mark the handler `IRAM_ATTR` if it must run while flash is busy, because code in flash is unreachable during a flash write.

**Deferring.** The handler records what happened and wakes a task; the task does the work at leisure. Lesson 4.8 returns to this with task notifications.

**Edge versus level.** An edge interrupt fires once per transition and can be missed if two arrive close together. A level interrupt fires for as long as the line is asserted and must be cleared at the source.
@deep
- [ ] What made your worst-case latency so much longer than the typical one?
- [ ] A handler and a task both do `counter++`. Show the interleaving that loses a count.
@when
| Event | Handle with |
| --- | --- |
| Needs a response in microseconds | Interrupt, minimal handler |
| Needs a response in milliseconds | Interrupt that wakes a task |
| Slow, human-scale | Polling from a task is often simpler |
@break
- [ ] Remove `IRAM_ATTR` and write to flash (an NVS write will do) while interrupts arrive.
@check
1. Why must an ISR not block?
2. What is `IRAM_ATTR` for?
3. What does `portYIELD_FROM_ISR` achieve?
@stretch
- Compare the latency with Wi-Fi scanning in the background.
@read
ESP-IDF guide: “Interrupt Allocation”. *Mastering the FreeRTOS Real Time Kernel*, “Interrupt Management”.
@pit
- **Doing the work in the handler “because it is only a little”.**
- **Interview angle.** “What should and should not be done in an ISR?”

=== 2.3 | draft
@why
Anything that must happen at an exact rate, a control loop, a sampler, a software protocol, runs from a hardware timer. Lesson 0.9 showed why; this builds one.
@need
Lessons 0.9 and 2.2. 60 minutes.
@build
::widget timer

- [ ] Create a general-purpose timer with a resolution of 1 MHz, an alarm every 1000 counts with auto-reload, and a callback that toggles a pin
- [ ] Capture the pin: is the period 1 ms? What is the jitter, compared with your lesson 0.9 numbers?
- [ ] Change only the alarm count to get 50 Hz, then 20 kHz
- [ ] Use the free-running count to time how long a function takes

```c
gptimer_config_t cfg = { .clk_src = GPTIMER_CLK_SRC_DEFAULT, .direction = GPTIMER_COUNT_UP, .resolution_hz = 1000000 };
gptimer_new_timer(&cfg, &timer);
gptimer_alarm_config_t alarm = { .alarm_count = 1000, .reload_count = 0, .flags.auto_reload_on_alarm = true };
gptimer_set_alarm_action(timer, &alarm);
```
@how
You ask for a resolution; the driver picks the prescaler that divides the source clock down to it. The counter then counts those ticks. An **alarm** fires when the count reaches a value; with auto-reload the count restarts, giving a periodic event with no drift, because the reload happens in hardware and not in your code.

The callback runs in interrupt context, so the ISR rules of lesson 2.2 apply.

Do the arithmetic both ways: from the numbers to the period, and from a wanted period to the numbers. Period = alarm count ÷ resolution.
@deep
- [ ] Why does auto-reload not drift while “restart the timer in the callback” does?
- [ ] How long can a 64-bit counter at 1 MHz run before wrapping? And a 32-bit one?
@when
| Need | Use |
| --- | --- |
| Exact periodic interrupt, microsecond scale | General-purpose timer |
| Many loosely timed callbacks | `esp_timer` |
| Millisecond task scheduling | The RTOS tick |
| An output waveform | A PWM peripheral, not a timer interrupt toggling a pin |
@break
- [ ] Set the alarm count to 5 at 1 MHz. What happens to the rest of the system?
@check
1. With 1 MHz resolution, what alarm count gives 50 Hz?
2. Why is hardware auto-reload more accurate than restarting in software?
3. In what context does the alarm callback run?
@stretch
- Use the calculators’ timer tab to plan a 44.1 kHz audio sample clock.
@read
ESP-IDF guide: “General Purpose Timer (GPTimer)”.
@pit
- **An alarm rate faster than the handler can finish.** The system starves.
- **Interview angle.** “Compute the timer settings for a given interrupt rate.”

=== 2.4 | draft
@why
PWM dims lights, sets motor speed, positions servos and makes tones. It is the commonest “analog” output in embedded systems, and its settings trade against each other.
@need
An LED and resistor; a servo if you have one. Lesson 0.9. 60 minutes.
@build
- [ ] Drive an LED at 5 kHz with 13-bit resolution and step the duty through eight values
- [ ] Use the driver’s fade function to breathe the LED smoothly
- [ ] Step the duty linearly and watch: where does the brightness seem to change fastest? Apply a square or gamma curve and compare
- [ ] Servo: 50 Hz, pulse width from 1 ms to 2 ms. Compute the duty values at your resolution first
@how
A PWM channel compares a counter with a duty value, as in the timer lab. Resolution and frequency share one budget: the counter must complete 2^bits steps per period, so the product of frequency and steps cannot exceed the timer clock.

The eye is not linear. Equal duty steps look large at the dim end and invisible at the bright end; mapping through a gamma curve of about 2.2 makes steps look even.

A servo ignores duty cycle as such and reads the **pulse width**: about 1 ms to one end, 2 ms to the other, repeated every 20 ms. At 50 Hz you need many bits of resolution to get fine angle steps out of that narrow range.
@deep
- [ ] At 50 Hz and 14 bits, how many duty steps lie between 1 ms and 2 ms? What angle does one step represent on a 180° servo?
- [ ] Why does a motor driver use 20 kHz when an LED is content with 1 kHz?
@when
| Load | Frequency | Why |
| --- | --- | --- |
| LED | 1 kHz and up | Above visible flicker |
| DC motor | About 20 kHz | Above hearing |
| Servo | 50 Hz | The protocol |
| Buzzer | The note itself | Frequency is the signal |
@break
- [ ] Ask for 40 kHz at 13 bits and read what the driver reports.
@check
1. What limits resolution at a given frequency?
2. Why apply gamma correction to an LED?
3. What does a servo actually measure?
@stretch
- Play a scale on a piezo by changing frequency at fixed 50% duty.
@read
ESP-IDF guide: “LED Control (LEDC)”.
@pit
- **Choosing resolution first and discovering the frequency is unreachable.**
- **Interview angle.** “How would you dim an LED smoothly?” PWM, frequency choice, gamma.

=== 2.5 | draft
@why
Measuring when an edge happened, to the microsecond, is half of all sensing: ultrasonic ranging, tachometers, remote-control decoders. A capture peripheral does it in hardware, free of software jitter.
@need
The HC-SR04 with its echo divider. Lessons 0.5 and 2.3. 75 minutes.
@build
::widget echo

- [ ] Version A: time the echo pulse with a GPIO interrupt on both edges and `esp_timer_get_time()`
- [ ] Version B: time it with an MCPWM capture channel, which latches a hardware counter on each edge
- [ ] Take a hundred readings of a fixed target with each. Compare the spread
- [ ] Add a timeout for “no echo”, and convert to millimetres with the temperature as a parameter
@how
**Input capture** copies a free-running counter into a register at the instant an edge arrives. The interrupt that follows can be late; the captured value is not. Software timestamps, by contrast, include the interrupt latency you measured in lesson 2.2.

MCPWM is a motor-control peripheral. Besides capture it generates **complementary** PWM pairs for the two transistors of a half-bridge, with **dead time**: a short gap so both are never on together, which would short the supply.
@deep
- [ ] Your capture timer ticks at 80 MHz. What distance does one tick represent? What actually limits the sensor’s resolution?
- [ ] Why is dead time essential in a half-bridge, and what happens to the output voltage as you increase it?
@when
| Measuring | Use |
| --- | --- |
| Pulse width or period, precisely | Capture |
| Counting many pulses | Pulse counter (lesson 2.8) |
| A slow, rough interval | GPIO interrupt and a timestamp |
@break
- [ ] Point the sensor at open space and confirm your timeout path returns an error rather than a huge distance.
@check
1. Why is a captured timestamp better than one taken in the handler?
2. What is dead time for?
3. What sets the practical resolution of the ultrasonic sensor?
@stretch
- Median-filter five readings and compare the spread again.
@read
ESP-IDF guide: “Motor Control Pulse Width Modulator (MCPWM)”, capture section.
@pit
- **Forgetting the 5 V echo divider.**
- **Interview angle.** “How would you measure a pulse width accurately?”

=== 2.6 | draft
@why
Batteries, potentiometers, thermistors, light and current sensors all arrive as a voltage. Reading it well means knowing what the converter’s numbers are worth.
@need
A potentiometer or two resistors; a multimeter. Lesson 0.8. 75 minutes.
@build
- [ ] Read a potentiometer with the one-shot driver and print raw counts
- [ ] Create a calibration scheme and print millivolts beside the raw value; compare with the multimeter at five positions
- [ ] Take 64 readings at one position: print minimum, maximum and mean. How many bits are steady?
- [ ] Average 16 readings per sample and repeat
- [ ] Classic ESP32 only: output a sine from the DAC and capture it
@how
**Attenuation** sets the input range: more attenuation, wider range, less accuracy at the ends. **Calibration** uses factory data in the chip to correct offset and gain, turning counts into millivolts. Without it, two boards disagree.

**Noise.** The last bits of any reading move. Averaging N samples reduces random noise by about the square root of N, at N times the time. A small capacitor at the pin helps more than software for a high-impedance source.

**One-shot versus continuous.** One-shot converts when asked. Continuous mode samples at a fixed rate into a buffer by DMA, for audio or vibration.

On ESP32 chips, ADC2 is shared with Wi-Fi: prefer ADC1 pins in any radio project. The S3 has no DAC; the classic ESP32 has two 8-bit ones.
@deep
- [ ] A battery at 4.2 V must be read by a 3.3 V ADC. Design the divider with the calculator, then compute the current it wastes.
- [ ] Why does a divider of two 1 MΩ resistors read wrong, and what fixes it?
@when
| Source | Approach |
| --- | --- |
| Slow signal, moderate accuracy | One-shot, averaged, calibrated |
| Audio or vibration | Continuous with DMA |
| Millivolt signals or high precision | An external ADC over SPI or I2C |
@break
- [ ] Read the pin while it floats. Then explain why the reading is not zero.
@check
1. What does calibration correct?
2. How much does averaging 16 samples reduce noise?
3. Why avoid ADC2 when using Wi-Fi?
@stretch
- Measure your board’s own supply through a divider and log it for an hour.
@read
ESP-IDF guide: “ADC Oneshot Mode Driver” and “ADC Calibration Driver”.
@pit
- **Quoting 12 bits when four of them are noise.**
- **Interview angle.** “Resolution versus accuracy: what is the difference?”

=== 2.7 | draft
@why
Some devices need pulses timed to a few hundred nanoseconds, far beyond what a loop can do. Writing an addressable-LED driver from its datasheet is the classic proof that you can turn a timing table into code.
@need
The S3’s on-board RGB LED (GPIO48 or 38), or a WS2812 strip. Lessons 0.9 and 0.11. 90 minutes.
@build
- [ ] From the LED’s datasheet, write down the high and low times for a 0 bit and a 1 bit, their tolerances, the reset time, and the byte order of the colours
- [ ] Create an RMT transmit channel with 100 ns resolution
- [ ] Describe a 0 bit and a 1 bit as RMT symbols and send three bytes for one colour
- [ ] Capture the data pin and compare every duration with your table
- [ ] Fade through the hue wheel
@how
The RMT peripheral plays back a list of **symbols**: each is a level held for a duration, twice. You describe the waveform; hardware produces it with tick-level accuracy and no software in the timing path.

An addressable LED reads 24 bits per pixel on one wire. Every bit is a pulse; a short high means 0 and a long high means 1. After its 24 bits a pixel passes the rest of the stream on, and a long low resets the chain.

An **encoder** converts your bytes to symbols on the fly, so you do not build the whole waveform in RAM.
@deep
- [ ] One pixel takes 24 bits at about 1.25 µs each. How long does a 300-pixel strip take, and what refresh rate does that allow?
- [ ] Why could you not bit-bang this from a task while Wi-Fi is running?
@when
| Waveform | Use |
| --- | --- |
| Precise pulse trains: LED strips, infrared remotes, 1-Wire | RMT |
| Regular clocked data | SPI |
| A steady frequency | PWM |
@break
- [ ] Swap the 0 and 1 timings. Then send RGB to a GRB device.
@check
1. What is an RMT symbol?
2. How does a pixel know which bits are its own?
3. Why does this protocol need a hardware peripheral?
@stretch
- Drive the same LED from SPI by encoding each bit as several SPI bits, and compare.
@read
ESP-IDF guide: “Remote Control Transceiver (RMT)”. The WS2812B datasheet.
@pit
- **Trusting a library’s timings instead of the datasheet for your part.** Variants differ.
- **Interview angle.** Describe a driver you wrote from a datasheet, and how you verified it.

=== 2.8 | draft
@why
Knobs, wheels and motors report motion as two phase-shifted square waves. Decoding them without missing counts is the input half of every control loop.
@need
A rotary encoder (KY-040). Lesson 2.2. 75 minutes.
@build
- [ ] Capture the encoder’s A and B on the analyzer while turning slowly each way. Which leads?
- [ ] Decode it with the pulse-counter peripheral in quadrature mode, with a glitch filter
- [ ] Turn it fast. Compare the count against a GPIO-interrupt decoder you write yourself
- [ ] Use the count to step a menu on the OLED or to set a PWM duty

Then close a loop in simulation:

::widget pid
@how
**Quadrature.** Two outputs, a quarter-cycle apart. The order in which they change gives direction; the number of changes gives distance. Counting every edge of both signals gives four counts per cycle.

The pulse counter does this in hardware, including a **glitch filter** that ignores pulses shorter than a threshold: contact bounce on a mechanical encoder, noise on a motor’s.

**Control.** Measured speed is the change in count per fixed interval. A PID loop compares it with a target and adjusts the drive: proportional to the error now, integral of past error, derivative of its trend. Run it from a hardware timer, because a loop with irregular timing behaves as if its gains were changing.
@deep
- [ ] In the PID lab, find gains that settle in under 0.3 s with less than 5% overshoot.
- [ ] At low speed, counts per interval become 0 or 1. What does that do to the speed estimate, and what is the alternative?
@when
| Sensor | Decode with |
| --- | --- |
| Hand-turned knob | Pulse counter with filter, or interrupts |
| Motor encoder, thousands of counts a second | Pulse counter only |
| Absolute position after power-up | An absolute encoder; quadrature only counts changes |
@break
- [ ] Disable the glitch filter on the mechanical encoder and turn it one click.
@check
1. How is direction determined?
2. Why four counts per cycle?
3. Why must a control loop run at a fixed rate?
@stretch
- Build the motor project: driver, encoder, PID from a timer, step response plotted.
@read
ESP-IDF guide: “Pulse Counter (PCNT)”. *Making Embedded Systems* on motors and control.
@pit
- **Integral wind-up.** The integral keeps growing while the output is saturated.
- **Interview angle.** “Explain PID in plain words.”

=== 2.9 | draft
@why
A touch button has no moving parts, costs a patch of copper, and works through a sealed enclosure. It is also an analog measurement that drifts, which makes it a good lesson in thresholds and baselines.
@need
A jumper wire on a touch-capable pin of the S3. 45 minutes.
@build
- [ ] Find which pins of the S3 support touch in the datasheet
- [ ] With the `touch_sens` driver (`driver/touch_sens.h`; the older `touch_pad` interface no longer exists in ESP-IDF 6), create a controller and one channel, and print the reading and the baseline the hardware tracks
- [ ] Record the reading untouched, touched, and with your hand near
- [ ] Derive a threshold from the untouched baseline, not a fixed number, and light an LED on touch
@how
The pin and its wire form a small capacitor. The peripheral charges and discharges it and measures how long that takes. A finger adds capacitance and the measurement changes.

The absolute value depends on wire length, humidity and temperature. So a robust design tracks a slowly moving **baseline** and looks for a sudden change relative to it, with **hysteresis** so the output does not chatter near the threshold.
@deep
- [ ] Why does a fixed threshold that works on your desk fail in a humid room?
- [ ] Touch can wake the chip from deep sleep. What would that cost in current, according to the datasheet?
@when
| Input | Use |
| --- | --- |
| Sealed or wipe-clean panel | Touch |
| Gloves, wet hands, safety functions | A mechanical switch |
@break
- [ ] Attach a 30 cm wire and repeat the readings.
@check
1. What physical quantity is being measured?
2. Why track a baseline?
3. What is hysteresis for?
@stretch
- Make a two-pad slider by comparing the two readings.
@read
ESP-IDF guide: the capacitive touch sensor driver for your version.
@pit
- **A hard-coded threshold.**
- **Interview angle.** “How do you make a threshold-based detector robust?” Baseline, hysteresis, debounce.

=== 2.10 | draft
@why
All firmware eventually hangs. A watchdog turns “frozen until someone notices” into “recovered in a few seconds, with a record of why”. Designing how it is fed is a real engineering decision.
@need
Lessons 0.10 and 2.2. 45 minutes.
@build
- [ ] Spin in a loop in a task without yielding. Read the task-watchdog report: which task does it name?
- [ ] Disable interrupts for too long and compare the interrupt-watchdog report
- [ ] Subscribe your own task to the task watchdog and reset it from the main loop; then stop resetting it
- [ ] After each reset, print `esp_reset_reason()`
@how
A watchdog is a timer that resets the system unless software restarts it in time. ESP-IDF has several. The **task watchdog** checks that chosen tasks, by default the idle tasks, get to run: it catches a task hogging the CPU. The **interrupt watchdog** checks that interrupts are being serviced: it catches interrupts left disabled. A low-level **RTC watchdog** covers start-up and total lock-ups.

**Feed it from evidence of health.** Resetting the watchdog from a timer interrupt proves only that the timer works. Reset it where the system has just done its real job: after a sensor read succeeded and a message went out.

**Record why.** The reset reason, and ideally a core dump, turn a field reset into a diagnosis.
@deep
- [ ] Design the feeding scheme for a device with a sensor task, a network task and a control task. What must each prove before the watchdog is reset?
- [ ] Why is a brown-out reset not a watchdog reset, and why does it matter in the log?
@when
| Product | Watchdog |
| --- | --- |
| Anything unattended | Always on, fed from health checks |
| While debugging with a halted CPU | Paused or disabled by the debugger configuration |
@break
- [ ] “Fix” the first experiment by raising the watchdog timeout. Explain why that is not a fix.
@check
1. What does the task watchdog detect?
2. Why not feed a watchdog from a timer interrupt?
3. What should firmware record after a watchdog reset?
@stretch
- Count resets by reason in NVS and print the totals at boot.
@read
ESP-IDF guide: “Watchdogs”. *Making Embedded Systems* on watchdogs.
@pit
- **Disabling the watchdog to make a problem go away.**
- **Interview angle.** “How would you design a watchdog strategy for a multi-task system?”

=== 2.11 | draft
@why
Moving a megabyte of camera or audio data one byte per interrupt would stall everything else. DMA lets a peripheral fill memory by itself, and it comes with rules about which memory.
@need
Lessons 1.10 and 2.6. 60 minutes.
@build
- [ ] Set up the continuous ADC driver at 20 kHz on one pin: samples arrive in blocks, not one at a time
- [ ] Print how many samples arrive per second and how often your task wakes
- [ ] Compare the CPU load with a one-shot loop at the same rate, using run-time stats or a toggled pin
- [ ] Allocate a transfer buffer from PSRAM and from internal RAM; note which the driver accepts
@how
With **direct memory access** a controller copies data between a peripheral and RAM while the CPU does something else. You hand it a buffer; it interrupts once when the buffer is full or empty.

Buffers are described by a chain of **descriptors**: address, length, next. A circular chain gives continuous streaming with a half-full callback, the standard pattern for audio.

**The rules.** The buffer must be memory the DMA controller can reach, often internal RAM, and aligned as the driver requires. It must stay valid until the transfer completes: never a local variable of a function that returns. And you must not touch it while the hardware owns it.

In ESP-IDF, SPI, I2S, continuous ADC, the camera and LCD interfaces and high-speed UART all use DMA underneath.
@deep
- [ ] Sketch double buffering for audio: which buffer does the hardware own at each moment?
- [ ] What is a cache-coherency problem, and why does it appear with DMA into cached memory?
@when
| Data rate | Method |
| --- | --- |
| A few bytes now and then | Polling or per-byte interrupts |
| Kilobytes per second and up | DMA |
@break
- [ ] Pass a stack buffer to an asynchronous transfer and return from the function.
@check
1. What does DMA save?
2. Why must a DMA buffer outlive the call that starts the transfer?
3. What is a descriptor?
@stretch
- Find the DMA-capable allocation flags in the heap documentation and where the SPI driver checks them.
@read
ESP-IDF guide: “ADC Continuous Mode Driver”; the memory-capability section of “Heap Memory Allocation”.
@pit
- **Reading a buffer the hardware is still filling.**
- **Interview angle.** “What is DMA and when would you use it?”

=== 2.12 | draft
@why
Battery life is a firmware feature. The same hardware lasts a day or a year depending on how long it stays awake.
@need
An S3 board, a USB power meter or a multimeter in series. Lesson 0.10. 75 minutes.
@build
::widget power

- [ ] In the lab, enter 90 mA awake for 3 s every 10 minutes and 12 µA asleep. Then halve the awake time. Then halve the sleep current. Which helped more?
- [ ] On the board: measure current while idle in a loop, in light sleep, and in deep sleep
- [ ] Deep-sleep for 10 s on a timer; on waking, print the wake-up cause and a counter kept in RTC memory
- [ ] Wake from deep sleep with a button
- [ ] Compare your deep-sleep reading with the chip’s datasheet figure and explain the gap

```c
static RTC_DATA_ATTR int boots;            /* survives deep sleep */
esp_sleep_enable_timer_wakeup(10 * 1000000ULL);
esp_deep_sleep_start();                    /* does not return: the next thing to run is the bootloader */
```
@how
**Modes.** Active: everything on, tens of milliamps, far more with the radio transmitting. **Light sleep:** clocks stopped, RAM kept, wake in under a millisecond and carry on. **Deep sleep:** almost everything off; only the low-power domain and RTC memory remain. Waking is a reboot: `app_main` starts again.

**Wake sources:** a timer, a pin level, a touch pad, and on some chips a tiny low-power coprocessor.

**Average current** is what the battery sees: each mode’s current weighted by the time spent in it. A node that wakes for three seconds every ten minutes is asleep 99.5% of the time, and yet the awake burst usually dominates.

Your measurement will be far above the datasheet’s microamps. The board’s regulator, its USB bridge and its power LED all draw current that the chip’s figure excludes. Products are designed around that.
@deep
- [ ] What must be saved before deep sleep, and where can it go?
- [ ] Wi-Fi connection takes most of the awake time. List three ways to shorten it.
@when
| Device | Strategy |
| --- | --- |
| Mains powered | Stay awake; perhaps reduce CPU frequency |
| Battery, reports every few minutes | Deep sleep between reports |
| Battery, must react to events quickly | Light sleep with wake sources |
@break
- [ ] Leave a GPIO driving an LED through deep sleep and measure again.
@check
1. What survives deep sleep?
2. Why is waking from deep sleep like a reset?
3. Why does your board draw more than the datasheet says?
@stretch
- Estimate the battery life of your lesson 0.5 ranger if it measured once a minute.
@read
ESP-IDF guide: “Sleep Modes”. The power-consumption tables in the ESP32-S3 datasheet.
@pit
- **Optimising sleep current while the device spends five seconds awake connecting.**
- **Interview angle.** “Design the power strategy for a battery sensor node.”

=== 2.13 | draft
@why
A device that cannot be updated cannot be fixed. A device whose update can fail half-way becomes a brick. The mechanism that prevents that is simple, and interviewers like to hear it explained.
@need
Lesson 1.7. No hardware. 45 minutes.
@build
::widget memory

- [ ] Load the “factory plus two OTA slots” layout in the lab and label what each partition is for
- [ ] On paper, walk through an update: which slot is running, where the new image is written, what changes last
- [ ] Walk through a power cut at each step. In which states can the device still boot?
- [ ] Walk through a new image that boots but crashes after ten seconds. How does the device recover?
@how
**A/B slots.** The running application never overwrites itself. A new image is written to the other slot and verified. Only then is one small record, the `otadata` partition, changed to point at it. A power cut before that change leaves the old image in charge; after it, the new one.

**Rollback.** The new image starts in a “pending” state. It must declare itself healthy, after connecting and passing its self-checks. If it resets before doing so, the bootloader returns to the previous slot.

**Anti-rollback** refuses images older than a version stored in eFuse, so a patched vulnerability cannot be reintroduced.

**DFU** is updating over USB with a standard protocol, with the chip’s ROM acting as the device. It needs no working application, which makes it the recovery path.

The hands-on version, over Wi-Fi, is lesson 5.9.
@deep
- [ ] What should the “I am healthy” check include for a device whose job is to report over MQTT?
- [ ] An update changes the format of stored settings. What can go wrong on rollback?
@when
| Update path | For |
| --- | --- |
| Over the air, A/B | Deployed, connected devices |
| USB DFU or serial | Factory programming and recovery |
| Single slot, overwrite in place | Only when a failed update is acceptable |
@break
- [ ] Design a way to brick a single-slot device with one badly timed power cut, then show that A/B survives it.
@check
1. What is the last thing written during an A/B update?
2. How does the bootloader know a new image is bad?
3. What does anti-rollback prevent?
@stretch
- Read how ESP-IDF marks an image valid and find the function you would call.
@read
ESP-IDF guide: “Over The Air Updates (OTA)” and “Bootloader”.
@pit
- **Marking the image valid immediately at boot.** It defeats rollback.
- **Interview angle.** “How do you make firmware updates safe against power loss?”
