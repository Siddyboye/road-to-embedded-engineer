=== 7.1 | draft
@why
Logging is the first debugging tool and the easiest to misuse: too little and you are blind, too much and you change the timing you are trying to observe.
@need
Lesson 6.4. 2 hours.
@build
- [ ] Time one log line at 115200 baud with a pin toggle. Then at ten times the baud rate
- [ ] Log inside a 1 kHz task and measure its jitter with and without
- [ ] Buffer events in RAM during the critical section and print them afterwards
- [ ] Set the default level to warning and one tag to debug at run time
@how
A log line is formatted, then pushed out of a UART at a fixed rate: a hundred characters at 115200 baud is nearly nine milliseconds, during which the calling task waits.

So: log state changes, not steady state. Use levels and tags. Never log from an interrupt. For timing-sensitive paths, record compact events to a ring buffer and print later, or toggle a pin.
@deep
- [ ] Design a binary log format that takes eight bytes per event and is decoded on the computer.
@when
| Path | Observe with |
| --- | --- |
| Slow, rare | Logs |
| Fast, periodic | Pin and analyzer, or buffered events |
@break
- [ ] Add a verbose log to the I2S reader from lesson 3.4 and listen.
@check
1. Why is logging slow?
2. What should never log?
3. How do you observe a fast path?
@stretch
- Send logs over UDP instead of the UART.
@read
ESP-IDF guide: “Logging library”.
@pit
- **“It works when I add a print.”** You changed the timing.
- **Interview angle.** “How do you debug a timing-sensitive bug?”

=== 7.2 | draft
@why
A panic message is a complete crime-scene report if you can read it. Most engineers scroll past it.
@need
Lessons 1.11 and 6.4. 3 hours.
@build
Cause each, save the full output, and name the line of code from the output alone:
- [ ] A NULL pointer write
- [ ] A stack overflow
- [ ] A divide by zero
- [ ] A watchdog timeout
- [ ] A heap corruption: write one byte past an allocation, then free it
- [ ] An `abort()` from a failed error check
@how
A panic prints: the **exception cause**; the **registers**, including the program counter and the faulting address; and a **backtrace** of return addresses. The monitor turns addresses into file and line using the build’s symbol file.

Reading order: cause first, then the faulting address (near zero means a NULL dereference; a strange value means a wild pointer), then the top few backtrace frames in *your* code.

Heap corruption is the hard one: the crash happens later, in innocent code. Heap integrity checking and poisoning find the culprit earlier.
@deep
- [ ] Why does a stack overflow sometimes show up as a crash in a completely different task?
@when
Decode every panic before changing any code. Guessing costs more than reading.
@break
- [ ] Decode a backtrace against the wrong build and see the nonsense it produces.
@check
1. What three things does a panic report?
2. What does a faulting address near zero suggest?
3. Why is heap corruption hard to trace?
@stretch
- Enable comprehensive heap poisoning and repeat the corruption test.
@read
ESP-IDF guide: “Fatal Errors” and “Heap Memory Debugging”.
@pit
- **Fixing the line that crashed when the line that corrupted is elsewhere.**
- **Interview angle.** “Walk me through how you would diagnose this crash dump.”

=== 7.3 | draft
@why
Lesson 1.15 was the first session. This one covers what you reach for on a hard bug: conditions, watchpoints, threads and scripts.
@need
Lesson 1.15; an ESP-PROG if you want to debug the classic chip. 3 hours.
@build
- [ ] Stop only when a queue is full: a conditional breakpoint
- [ ] Find what writes a corrupted global: a watchpoint
- [ ] List all tasks, switch to one, and print its backtrace
- [ ] Attach to a running, hung device without resetting it and find where each task is stuck
- [ ] Write a three-line GDB script that prints a struct every time a function is entered and continues
@how
A **conditional breakpoint** evaluates an expression at each hit: precise, but slow in a hot loop. A **watchpoint** uses a hardware comparator and costs nothing until it fires.

OpenOCD understands FreeRTOS, so each task appears as a thread with its own stack. **Attaching** to a hung device, instead of restarting it, preserves the evidence.

GDB can run commands at a breakpoint and continue, turning it into a tracer that needs no rebuild.
@deep
- [ ] A bug appears once an hour. Which of these tools would you leave armed overnight?
@when
| Symptom | Tool |
| --- | --- |
| Variable has a wrong value | Watchpoint |
| Device hung | Attach and inspect every task |
| Rare path | Conditional breakpoint or scripted trace |
@break
- [ ] Set more hardware breakpoints than the chip has and read the error.
@check
1. Why is a watchpoint cheap?
2. Why attach instead of reset?
3. How do you inspect another task’s stack?
@stretch
- Debug the ESP32-CAM through an ESP-PROG and note the pin conflicts.
@read
ESP-IDF guide: “JTAG Debugging”, tips and quirks. The GDB manual on breakpoints.
@pit
- **Resetting a hung device before looking at it.**
- **Interview angle.** “Tell me about the hardest bug you debugged.”

=== 7.4 | draft
@why
A leak of sixteen bytes an hour kills a device in a month. You cannot find it by reading code; you find it by measuring.
@need
Lesson 1.10. 3 hours.
@build
::widget heap

- [ ] Plant a leak in your MQTT node: one allocation per message that is freed on only one of two paths
- [ ] Log free heap and minimum free heap every minute for an hour and plot them
- [ ] Use heap tracing around the suspect code to list allocations that were never freed, with the call stack of each
- [ ] Fix it and show a flat line
- [ ] Distinguish a leak from fragmentation using the largest-free-block figure
@how
A **leak** makes free memory fall steadily. **Fragmentation** leaves free memory steady while the largest block shrinks. They need different fixes.

**Heap tracing** records every allocation and free between two points and reports what is left, with where it was allocated. It is the embedded equivalent of a leak checker.

The usual culprits: an error path that returns early; a buffer handed to a queue that nobody frees; a string built in a loop.
@deep
- [ ] Who owns a buffer passed through a queue? Write the rule down for your project.
@when
Track free heap and its minimum in every long-running product, and report both as telemetry.
@break
- [ ] Free the same pointer twice with heap poisoning enabled.
@check
1. How do a leak and fragmentation differ in the numbers?
2. What does heap tracing report?
3. Name two common causes of leaks.
@stretch
- Add a heap low-water alarm that logs and restarts cleanly.
@read
ESP-IDF guide: “Heap Memory Debugging”.
@pit
- **Testing for ten minutes and declaring no leak.**
- **Interview angle.** “How would you find a memory leak on a device with no OS tools?”

=== 7.5 | draft
@why
The glitch that happens once in a thousand transactions will not appear while you watch. Triggers and decoders let the instrument watch for you.
@need
The logic analyzer; a scope if you have one. Phase 3. 3 hours.
@build
- [ ] Capture ten seconds of I2C traffic with the protocol decoder on; export the decoded transactions
- [ ] Search the decode for NACKs
- [ ] Inject a fault: a second board briefly pulls SDA low at random. Find the corrupted transaction
- [ ] With a scope: probe the same line and compare a rising edge with what the analyzer showed
- [ ] Measure with a long ground lead and a short one and compare the ringing
@how
A **logic analyzer** sees only 0 and 1, on many channels, for a long time: ideal for protocols. A **decoder** turns edges back into bytes and flags framing errors. A **trigger** starts the capture on a condition, so you record the failure and not the hours before it.

An **oscilloscope** sees voltage against time: slow edges, ringing, noise and levels in the undefined band, which a logic analyzer hides by rounding.

Probing changes the circuit. A long ground lead adds inductance and invents ringing that is not there; the probe’s capacitance slows edges.
@deep
- [ ] Your analyzer samples at 24 MHz. What is the fastest SPI clock you can trust it on?
@when
| Question | Instrument |
| --- | --- |
| What bytes were sent, and when? | Logic analyzer |
| Is the signal electrically healthy? | Oscilloscope |
@break
- [ ] Sample a 10 MHz clock at 24 MHz and describe the capture.
@check
1. What does a logic analyzer hide?
2. What is a trigger for?
3. How can probing mislead you?
@stretch
- Write a script over the exported decode that checks every transaction against expected patterns.
@read
The sigrok and PulseView documentation on decoders and triggers.
@pit
- **Trusting a capture taken at too low a sample rate.**
- **Interview angle.** “Which instruments have you used, and for what?”

=== 7.6 | draft
@why
When the code is right and the chip misbehaves, the answer is in a document: the reference manual, or the list of the chip’s own bugs.
@need
The ESP32-S3 Technical Reference Manual and its errata. 2 hours.
@build
- [ ] Pick one peripheral you have used. Read its whole TRM chapter and list three things the driver hides
- [ ] Find its register summary and decode one register you have seen in a debugger
- [ ] Open the chip’s errata. Find one issue that affects a feature you use and the stated workaround
- [ ] Find your chip’s revision from the boot log and check which errata apply to it
@how
A reference-manual chapter has a fixed shape: overview, functional description with block diagrams, programming procedures, then the register list. Read the functional description for understanding and the register list for facts.

**Errata** document where the silicon differs from the manual, by chip revision, with workarounds. The framework often applies them silently, which is one reason to stay on supported versions.
@deep
- [ ] Find in ESP-IDF’s source one workaround that names a silicon revision.
@when
Open the TRM when a driver’s behaviour surprises you; open the errata when it still does.
@break
- [ ] Find a statement in a tutorial that contradicts the reference manual.
@check
1. What is an erratum?
2. Where is a peripheral’s exact behaviour defined?
3. Why does chip revision matter?
@stretch
- Read the errata of the classic ESP32 for comparison.
@read
The TRM and the “SoC Errata” document for your chip.
@pit
- **Assuming the silicon is perfect.**
- **Interview angle.** “Have you ever hit a hardware bug? How did you confirm it?”

=== 7.7 | draft
@why
Every repetitive check you do by hand is a script waiting to be written. Automation is what lets one engineer look after a product.
@need
Lessons 1.16 and 6.8. 3 hours.
@build
- [ ] Turn your serial test script into `pytest` cases with fixtures that open the port and reset the board
- [ ] Parametrise one test over ten inputs
- [ ] Write a Bash script that builds, flashes, runs the tests and exits non-zero on failure
- [ ] Add a soak test: run the node for an hour and assert the heap never falls below a limit
- [ ] Produce a one-page report
@how
`pytest` discovers test functions, sets up shared resources through **fixtures**, and reports failures precisely. A serial port, a power switch and a second board as stimulus are all just fixtures.

Shell scripts glue tools together and must fail loudly: stop on the first error and return a status the caller can check.

A **regression suite** is the set of tests that must pass before any release. Every field bug should add one.
@deep
- [ ] Which of your manual checks from Phases 3 to 6 can now be automated?
@when
Automate anything you have done by hand three times.
@break
- [ ] Write a test that passes when the board is unplugged. Then fix the test.
@check
1. What is a fixture?
2. Why must scripts return a status?
3. What goes into a regression suite?
@stretch
- Control the board’s power from the script with a relay or USB hub.
@read
The pytest documentation’s getting-started and fixtures chapters.
@pit
- **Tests that cannot fail.**
- **Interview angle.** “How do you automate testing of an embedded device?”

=== 7.8 | draft
@why
“It builds on my machine” ends careers slowly. A container makes the toolchain part of the repository.
@need
Docker on your computer. Lesson 6.9. 2 hours.
@build
- [ ] Build a lab inside the official ESP-IDF image with one command, mounting your project
- [ ] Write a small Dockerfile that adds your Python test dependencies on top
- [ ] Pin the image by version, not “latest”
- [ ] Use the same image in your CI workflow
@how
An image is a frozen file system with the compiler, the framework and the tools at exact versions. A container is a running instance with your source mounted in. Everyone, and CI, builds with identical tools.

Flashing from a container needs access to the USB device, which is straightforward on Linux and awkward elsewhere; many teams build in the container and flash from the host.
@deep
- [ ] What is not captured by the image, and could still differ between two builds?
@when
For any project with more than one contributor or a life longer than a year.
@break
- [ ] Build with two different image versions and compare the binaries.
@check
1. What does a container guarantee?
2. Why pin the image version?
3. What is awkward about flashing from a container?
@stretch
- Make the build reproducible to the byte.
@read
ESP-IDF guide: “IDF Docker Image”.
@pit
- **“latest” in a Dockerfile.**
- **Interview angle.** “How do you make builds reproducible?”

=== 7.9 | draft
@why
Simulation lets you test without a board, in CI, and in situations that are hard to create on a bench.
@need
Lesson 6.8. 2 hours.
@build
- [ ] Run the 0.1 firmware in Espressif’s QEMU and see its output
- [ ] Run your host-tested parser inside it as an on-target test
- [ ] Build one Phase 0 lab in Wokwi with a virtual LED and button
- [ ] List what each simulator does not model
@how
**QEMU** emulates the processor and a few peripherals, so real firmware binaries run unmodified: good for logic, start-up and tests in CI. **Wokwi** simulates a board with common parts in a browser: good for trying wiring and simple drivers.

Neither models real timing, analog behaviour, radio or most peripherals faithfully. Simulation complements the board; it does not replace measurement.
@deep
- [ ] Which Phase 3 bug could a simulator never have shown you?
@when
| Use | Tool |
| --- | --- |
| Automated tests without hardware | QEMU, host builds |
| Trying an idea before parts arrive | Wokwi |
| Timing, electrical, radio | The real board |
@break
- [ ] Run a timing-critical lab in simulation and compare with your capture.
@check
1. What does QEMU run?
2. What do simulators model poorly?
3. Where does simulation fit in the test pyramid?
@stretch
- Add a QEMU test job to CI.
@read
ESP-IDF guide: “QEMU Emulator”. Wokwi’s ESP32 documentation.
@pit
- **Believing a simulated timing result.**
- **Interview angle.** “How do you test firmware without hardware?”
