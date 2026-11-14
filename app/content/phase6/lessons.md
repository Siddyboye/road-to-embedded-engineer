=== 6.1 | draft
@why
Settings, calibration and counters must survive power loss. NVS is the small, safe key-value store every ESP-IDF product uses for that.
@need
Lesson 1.7. 2 hours.
@build
- [ ] Store a boot counter and increment it each start
- [ ] Store a settings struct as a blob with a version number in it
- [ ] Pull the power during a write, many times. Is the data ever corrupt?
- [ ] Fill the partition and handle the error
- [ ] Erase NVS from the command line and confirm the defaults return
@how
NVS stores named values in a flash partition. Flash can only be erased a block at a time and wears out, so NVS appends new entries and reclaims old pages later: a small log-structured store with **wear levelling** built in. Writes become durable when you commit.

Version your stored data. A firmware update that reads last year’s struct layout is a common field failure, and rollback makes it two-directional.
@deep
- [ ] Your settings struct gains a field. Write the migration, and say what an older firmware does when it meets the new format.
@when
| Data | Store in |
| --- | --- |
| Small settings, keys, counters | NVS |
| Files, logs, assets | A file system |
| Values that change every second | RAM, saved occasionally |
@break
- [ ] Write a value a thousand times a second and compute how long the flash would last.
@check
1. Why can flash not be overwritten in place?
2. What is wear levelling?
3. Why version stored data?
@stretch
- Keep factory calibration in a separate, read-only NVS partition.
@read
ESP-IDF guide: “Non-Volatile Storage Library”.
@pit
- **Saving on every change.**
- **Interview angle.** “How do you store configuration reliably on flash?”

=== 6.2 | draft
@why
Logs, web pages, audio and models are files. Three file systems are on offer and they fail differently when the power goes.
@need
Lessons 3.3 and 6.1; an SD card. 4 hours.
@build
- [ ] Mount LittleFS on a flash partition; write, read and list files with the standard C functions
- [ ] Mount FAT on the SD card and do the same
- [ ] Time writing 1 MB in 64-byte chunks and in 4 KB chunks on each
- [ ] Cut power during writes fifty times. Which file system needs repair?
- [ ] Log sensor data with a pattern that survives power loss: append, flush, rotate files
@how
A file system maps names to blocks and survives, or does not, an interrupted write.

**FAT** is readable by every computer, which is why SD cards use it. It was not designed for power cuts and can lose files or corrupt its tables. **LittleFS** was designed for microcontrollers: it is power-loss safe and wear-levelled. **SPIFFS** is older and has no real directories.

SD cards connect by SPI or by the faster native SDMMC interface, and contain their own controller that sometimes pauses for tens of milliseconds.

Write in large blocks. Small writes are slow and wear flash faster.
@deep
- [ ] How do you make “replace this file with a new version” safe against power loss at any instant?
@when
| Need | Use |
| --- | --- |
| Internal flash, robustness | LittleFS |
| Removable card, PC-readable | FAT |
@break
- [ ] Pull the SD card out during a write.
@check
1. Why is FAT risky on a device that loses power?
2. Why write in large blocks?
3. What does the write-then-rename pattern achieve?
@stretch
- Serve the files over the web server from lesson 5.6.
@read
ESP-IDF guide: “FAT Filesystem Support”, “SD/SDIO/MMC Driver”. The LittleFS design notes.
@pit
- **Never calling flush.**
- **Interview angle.** “How do you log data so a power cut loses at most one record?”

=== 6.3 | draft
@why
Flash is a fixed budget you divide once. A layout that leaves no room for the next feature, or for the app to grow, cannot be changed on deployed devices.
@need
Lessons 1.7 and 5.9. 90 minutes.
@build
::widget memory

- [ ] Design a 16 MB layout for the capstone: two app slots, NVS, factory NVS, a file system, a core-dump partition
- [ ] Leave each app slot at least half as large again as today’s binary
- [ ] Build with it and print the table at boot
- [ ] Write down what you would do if the app outgrew its slot after shipping
@how
List what must be stored, estimate each with growth, then place them: small fixed things first, apps aligned to 64 KB, the file system last so it can take the remainder.

The partition table is effectively permanent: an OTA update replaces an app slot, not the table. Changing it in the field means a risky multi-step migration.
@deep
- [ ] Which partitions must never be erased by a factory reset?
@when
| Partition | Size by |
| --- | --- |
| App slots | Current binary plus generous growth |
| NVS | Number of keys and write frequency |
| File system | Data kept, plus free space for wear levelling |
@break
- [ ] Shrink the app slot to exactly today’s size and add one feature.
@check
1. Why is the layout hard to change later?
2. How much headroom should an app slot have?
3. What goes in a factory-data partition?
@stretch
- Add a script to CI that fails when the binary exceeds 80% of its slot.
@read
ESP-IDF guide: “Partition Tables”.
@pit
- **Slots sized to fit today’s build.**
- **Interview angle.** “How would you lay out flash for an OTA-capable product?”

=== 6.4 | draft
@why
The crash that matters happens in a customer’s house with no cable attached. Logs and core dumps are how the device tells you what went wrong afterwards.
@need
Lessons 1.15 and 6.3. 3 hours.
@build
- [ ] Give each module its own log tag; set levels per tag at run time
- [ ] Enable core dumps to flash. Cause a crash, reboot, and extract the dump
- [ ] Open it with the analysis tool: see every task’s backtrace and the faulting line
- [ ] Record the reset reason and a boot counter; report both over MQTT after reconnecting
- [ ] Measure how long a log line takes, and what verbose logging does to a timing-critical task
@how
**Logging** has levels (error, warning, info, debug, verbose) and tags. Levels compiled out cost nothing; levels filtered at run time still cost a check. A log line is a slow, blocking write to a UART.

A **core dump** is a snapshot of every task’s stack and registers at the moment of a crash, saved to a flash partition. With the matching build files, the tools reconstruct backtraces as if you had been debugging live. Keep the build outputs of every released version.

Field diagnostics are a pipeline: detect, capture, survive the reboot, upload, and match to a firmware version.
@deep
- [ ] What must you archive at release time to be able to read a dump a year later?
@when
| Tool | Use |
| --- | --- |
| Logs | Normal operation, expected errors |
| Core dump | Crashes |
| Counters and reset reasons | Fleet-wide health |
@break
- [ ] Try to analyse a dump with the build files from a different version.
@check
1. What does a core dump contain?
2. Why keep build outputs for every release?
3. What does logging cost at run time?
@stretch
- Upload dumps automatically after the next successful connection.
@read
ESP-IDF guide: “Core Dump” and “Logging library”.
@pit
- **Logging secrets.**
- **Interview angle.** “How do you debug a crash you cannot reproduce?”

=== 6.5 | draft
@why
“How long will the battery last?” has an answer you can compute before building and measure afterwards. Being within 15% is the mark of someone who understands the whole system.
@need
A battery, a protected charger board, a power meter or INA219. Lesson 2.12. 5 hours.
@build
::widget power

- [ ] List every state of your node (sleep, wake, sense, connect, transmit) with its current and duration, measured, not assumed
- [ ] Enter them in the lab and predict battery life
- [ ] Run the node for a day and compare consumed charge with the prediction
- [ ] Find the largest contributor and halve it
- [ ] Trigger a brown-out by supplying the board through a long thin wire and transmitting; read the reset reason
@how
Average current is the sum of each state’s current times its share of time. The battery’s capacity divided by that is the life, reduced by self-discharge, temperature and the regulator’s efficiency.

**Peak current** matters separately: a radio burst of hundreds of milliamps makes the battery voltage dip. If it falls below the chip’s limit, the **brown-out detector** resets the system. Capacitors near the chip supply the peak.

Lithium cells are dangerous when over-charged, over-discharged or shorted. Use cells with a **protection circuit**, a proper charger chip, and never charge unattended.
@deep
- [ ] The regulator on your dev board wastes more than the chip uses in sleep. What would you change on a custom board?
@when
| Lever | Typical gain |
| --- | --- |
| Shorter awake time | Large |
| Longer sleep interval | Large |
| Lower sleep current | Matters only once the above are done |
@break
- [ ] Leave Wi-Fi modem sleep off and remeasure.
@check
1. How is average current computed?
2. What causes a brown-out reset?
3. Why does peak current matter as well as average?
@stretch
- Report battery voltage with each message and plot the discharge curve.
@read
The power-consumption section of the ESP32-S3 datasheet. *Making Embedded Systems*, “Reducing Power Consumption”.
@pit
- **Trusting datasheet currents for a dev board.**
- **Interview angle.** “Estimate the battery life of this design.”

=== 6.6 | draft
@why
Firmware that works on the desk and resets next to a motor is failing an electrical test. You do not need to be an EMC engineer; you need to recognise the symptoms.
@need
A motor or relay, a scope if you have one. 2 hours.
@build
- [ ] Switch a small motor or relay near your I2C wires and count bus errors
- [ ] Wind three turns of wire onto a scope probe as a pickup loop and move it over the board while transmitting
- [ ] Add a diode across the relay coil and a capacitor across the motor; repeat the test
- [ ] Shorten and twist the sensor wires; repeat
@how
Fast-changing currents radiate and couple into nearby wires. Long wires are antennas, both ways. The usual fixes are physical: short return paths, a solid ground, decoupling capacitors, twisted pairs, a diode across every coil.

**ESD** is the spark from your finger: thousands of volts for nanoseconds. It can reset a device or damage a pin permanently. Connectors exposed to users need protection parts.

Firmware’s share: filter inputs, check CRCs, retry, and recover with a watchdog. And do not make noise: slower edges where speed is not needed.
@deep
- [ ] Why does a diode across a coil stop the spike?
@when
Suspect EMC when a fault correlates with something else switching, with cable length, or with touching the device.
@break
- [ ] Remove the decoupling capacitor nearest a sensor.
@check
1. What makes a wire an antenna?
2. What is ESD?
3. Name two firmware defences against electrical noise.
@stretch
- Read the layout guidelines in Espressif’s hardware design guide.
@read
Espressif’s “Hardware Design Guidelines” for the ESP32-S3.
@pit
- **Fixing a hardware problem with a software retry and calling it done.**
- **Interview angle.** “The device resets when the motor starts. Where do you look?”

=== 6.7 | draft
@why
You will work with hardware engineers and review their schematics. Designing one small board teaches you what to ask for and what your firmware depends on.
@need
KiCad on your computer. Lessons 0.6 and 6.6. 8 hours.
@build
- [ ] Draw the schematic of a carrier for an S3 module: USB connector, regulator, reset and boot buttons, one I2C sensor, an LED
- [ ] Copy the module’s reference circuit from Espressif’s guide; note every part you do not understand and look it up
- [ ] Add decoupling capacitors at every supply pin and pull-ups where the datasheet requires
- [ ] Lay out the board on two layers: ground plane, short decoupling paths, nothing under the antenna
- [ ] Run the design-rule check to zero errors
- [ ] Write the pin table your firmware will need
@how
A **schematic** says what connects to what. A **layout** decides where the copper goes, which determines whether it works at speed and near a radio.

The essentials for a module-based design: follow the reference circuit; decouple every supply pin close to it; keep the **antenna keep-out** clear of copper and parts; give USB’s two data lines a matched, short route; choose strapping-pin connections so the board boots.

Bring out test points for power, reset, the boot pin and the serial lines. Firmware bring-up starts there.
@deep
- [ ] Which firmware features would be impossible if a strapping pin were tied the wrong way?
@when
| Stage | Hardware |
| --- | --- |
| Learning, prototyping | Dev boards and breadboards |
| Field trials, small production | A custom board around a certified module |
@break
- [ ] Put a ground pour under the antenna in the layout and read what the guide says it does.
@check
1. What is an antenna keep-out?
2. Why place decoupling capacitors close to pins?
3. What should a firmware engineer ask to be added to a board?
@stretch
- Order five boards and bring one up.
@read
Espressif’s hardware design guidelines. Phil’s Lab’s KiCad series.
@pit
- **No test points.**
- **Interview angle.** “How do you work with the hardware team during bring-up?”

=== 6.8 | draft
@why
Unit tests cover logic. Products fail at the seams: the driver against the real chip, the firmware against the real server. A test strategy says what is tested where.
@need
Lessons 1.14 and 1.16. 4 hours.
@build
- [ ] Sort every check you can think of for the capstone into: host unit test, on-target test, hardware-in-the-loop, manual
- [ ] Write an on-target test with the Unity component for the I2C driver against the real sensor
- [ ] Write a Python test that flashes the board, sends shell commands and asserts on the replies
- [ ] Add one hardware-in-the-loop check: the script toggles a pin through a second board and expects a reaction
- [ ] Run the lot with one command
@how
The **test pyramid**: many fast unit tests on the host; fewer integration tests on the chip; a few end-to-end tests of the whole device.

**Hardware-in-the-loop** drives the real device’s inputs and checks its outputs automatically. **Software-in-the-loop** runs the real code against a simulated world, as with QEMU or a fake HAL.

Each level catches what the one below cannot: a unit test cannot find a wrong pull-up, and an end-to-end test cannot tell you which line is wrong.
@deep
- [ ] Which bug from earlier phases would each level have caught first?
@when
| Risk | Test at |
| --- | --- |
| Logic, parsing, maths | Host |
| Register sequences, timing | Target |
| Behaviour as a product | Hardware-in-the-loop |
@break
- [ ] Make the HIL test flaky on purpose with a race, then make it deterministic.
@check
1. What does each layer of the pyramid catch?
2. What is hardware-in-the-loop testing?
3. Why not test everything end to end?
@stretch
- Try Espressif’s pytest plug-in for embedded targets.
@read
*Test-Driven Development for Embedded C*, the later chapters. ESP-IDF guide: “Unit Testing”.
@pit
- **Only manual testing.**
- **Interview angle.** “What is your testing strategy for firmware?”

=== 6.9 | draft
@why
A build that works only on your laptop is a liability. Continuous integration builds and tests every change the same way, every time.
@need
A GitHub repository with the course’s firmware. Lesson 6.8. 3 hours.
@build
- [ ] Push the repository and watch the firmware workflow build every lab for both chips
- [ ] Add a job that runs the host tests with sanitizers
- [ ] Add static analysis and make warnings fail the build
- [ ] Build inside the official ESP-IDF container locally and confirm you get the same binary size
- [ ] Break a lab on a branch and see the pull request blocked
@how
**CI** runs on every push: build, test, analyse, report. Its value is that it is boring and always on.

A **container** pins the toolchain, so “works on my machine” and “works in CI” are the same statement. The same image can run on your computer.

Build artefacts (binaries, map files, the files needed to read core dumps) should be produced and archived by CI, not by a developer’s laptop.
@deep
- [ ] Which checks should run on every push, and which only nightly?
@when
From the first commit. Adding it later means fixing months of accumulated warnings.
@break
- [ ] Use an unpinned “latest” toolchain image and describe the day it changes under you.
@check
1. What does CI guarantee?
2. Why build in a container?
3. What should CI archive for each release?
@stretch
- Add a self-hosted runner with a board attached and run the HIL tests.
@read
GitHub Actions documentation. Espressif’s CI action README.
@pit
- **A CI that is red for weeks.**
- **Interview angle.** “Describe your build and release pipeline.”

=== 6.10 | draft
@why
Firmware lives for years and passes between people. History, versions and reviews are how a team knows what is running on a device and why.
@need
Your repository. 2 hours.
@build
- [ ] Rewrite your last five commit messages as you wish you had written them: what changed and why
- [ ] Work one feature on a branch; open a pull request against your own main and review it line by line
- [ ] Tag a release with a semantic version; embed the version and Git hash in the firmware and print it at boot
- [ ] Write a changelog entry and a README section a stranger could follow
@how
Small commits that each do one thing make history searchable and `git bisect` possible. A commit message explains *why*; the diff already shows what.

A **version** printed at boot, tied to a tag and a hash, is how a log from the field is matched to source.

**Code review** catches design problems and spreads knowledge. Review for correctness, error handling, concurrency and clarity, in that order.
@deep
- [ ] Use `git bisect` to find which commit introduced a deliberate bug.
@when
Always. The habit matters more than the tool.
@break
- [ ] Try to answer “what changed between the build on this device and the previous one?” without tags.
@check
1. What belongs in a commit message?
2. Why embed the Git hash in firmware?
3. What do you look for first in a review?
@stretch
- Write a contributing guide for your repository.
@read
“How to Write a Git Commit Message”, Chris Beams. Semantic Versioning’s specification.
@pit
- **One giant commit named “updates”.**
- **Interview angle.** “Walk me through your Git workflow.”

=== 6.11 | draft
@why
Regulated industries, automotive above all, wrap engineering in processes and standards. You will not master them here; you will know what the acronyms mean when a posting lists them.
@need
None. 2 hours of reading.
@build
- [ ] Map your capstone onto a V-model: requirements, design, implementation on the way down; unit, integration and system tests on the way up, each paired with its level
- [ ] Write three requirements for the capstone that are testable, with the test for each
- [ ] Pick five MISRA C rules and find a violation of each in your own code
- [ ] Write two sentences each on ISO 26262, IEC 61508 and AUTOSAR
@how
**Agile and Scrum** organise work into short iterations with a prioritised backlog. The **V-model** pairs every design stage with a verification stage, and is the shape regulated projects must demonstrate.

**IEC 61508** is the general standard for functional safety of electronic systems. **ISO 26262** adapts it to road vehicles and defines integrity levels, ASIL A to D, that dictate how rigorous development must be. **MISRA C** is a coding standard that restricts C to a safer subset.

**AUTOSAR** is a standardised software architecture for vehicle control units: applications sit above a run-time layer and standardised basic software, so components move between suppliers.

The common thread is **traceability**: every requirement linked to its design, code and test.
@deep
- [ ] Which practices from this course would a safety auditor ask to see evidence of?
@when
| Domain | Expect |
| --- | --- |
| Consumer IoT | Agile, light process |
| Automotive, medical, industrial safety | V-model, standards, audits |
@break
- [ ] Find a requirement in your capstone that cannot be tested as written, and rewrite it.
@check
1. What does the V-model pair?
2. What is an ASIL?
3. What is traceability?
@stretch
- Read one public MISRA-compliance statement from an open-source project.
@read
Introductory material on ISO 26262 and AUTOSAR from their publishers. *Making Embedded Systems* on process.
@pit
- **Treating process as paperwork.** It exists because of specific accidents.
- **Interview angle.** “Are you familiar with functional safety?” Be honest about depth; show you know the vocabulary.
