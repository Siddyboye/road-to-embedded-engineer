=== 3.1 | draft
@why
UART is the oldest and simplest serial link, and it is still on every board as the debug console, the GPS feed and the modem port. It is the right first protocol to build by hand because nothing is hidden: no clock, no addresses, just agreed timing.
@need
Two boards or one board and a USB-UART adapter; the logic analyzer. Lessons 1.8, 1.9 and 2.3. About 9 hours over three sittings.
@build
::widget timing

**Sitting 1: the signal, by hand.**
- [ ] In the diagram, send 0x55, then add parity, then two stop bits. Use “New mystery byte” until you decode five in a row
- [ ] Bit-bang a transmitter on a GPIO at 9600 baud using a hardware timer for the bit period. Capture it and let the analyzer’s decoder read it
- [ ] Bit-bang a receiver: on the falling edge of the start bit, wait one and a half bit times, then sample eight bits one bit time apart

::widget baud

- [ ] In the mismatch lab, find the largest clock error at which 0x55 still arrives. Then repeat the experiment on your bit-banged link by mis-setting one side’s baud rate

**Sitting 2: the peripheral.**
- [ ] Replace both with the UART driver: install it with a receive buffer and an event queue, and echo what arrives
- [ ] Build a command shell on it with your table from lesson 1.12: `help`, `led on`, `adc`

**Sitting 3: real traffic.**
- [ ] Send frames between two boards with the format and parser from lesson 1.14. Fuzz it from Python
- [ ] Parse NMEA sentences from a GPS module, or from a recorded log replayed by your computer. Verify each sentence’s checksum: the XOR of every character between `$` and `*`
- [ ] With two RS-485 modules, run the same frames over a twisted pair and switch the driver-enable pin around each transmission
@how
**Framing.** The line idles high. A **start bit** pulls it low for one bit time, then eight data bits follow, least significant first, then an optional **parity** bit and one or two **stop bits** at high. There is no clock wire: both ends must agree on the bit time in advance. The receiver re-synchronises on every start edge and samples mid-bit, so the two clocks may differ by a few percent and no more.

**Buffering.** Bytes arrive whenever the sender likes. The peripheral has a small hardware FIFO; the driver’s interrupt moves bytes from it into a ring buffer; your task reads from that. If any stage fills, bytes are lost: overrun.

**Flow control.** RTS and CTS lines, or XON and XOFF characters, let a receiver say “wait”. Without them, the sender must simply be slower than the receiver’s worst case.

**Electrical layers.** The same framing travels over three kinds of wire. Logic-level UART: 0 V and 3.3 V, centimetres. RS-232: inverted, several volts either side of zero, metres. **RS-485:** a differential pair, hundreds of metres, many devices on one pair, but only one may drive at a time, so the protocol above must decide who talks.
@deep
- [ ] At 115200 baud, how long do you have to service the FIFO before it overruns, if it holds 128 bytes?
- [ ] Why does the bit-banged receiver wait one and a half bit times before its first sample?
- [ ] Your framed protocol uses 0x7E as a start byte. What if 0x7E appears in the payload? Name two standard answers.
@when
| Use UART when | Avoid it when |
| --- | --- |
| Two devices, point to point | Many devices on one link (use RS-485 with a protocol, I2C or CAN) |
| A human or a PC is on the other end | You need megabits or a shared clock (SPI) |
| The peer already speaks it: GPS, modems, most modules | The peer is centimetres away on the same board and pins are scarce (I2C) |
@break
- [ ] Set one side to 8N1 and the other to 8E1. Which bytes still get through?
- [ ] Cross nothing: connect TX to TX. Then explain why crossing is needed.
- [ ] Stop reading the driver’s buffer and send a megabyte. Find the overrun event.
@check
1. In what order are the data bits sent?
2. How much clock mismatch can a UART link tolerate, roughly, and why?
3. What does RS-485 add, and what new problem does it create?
@stretch
- Implement byte stuffing so any value can appear in a payload.
- Add automatic baud detection by timing the first start bit.
@read
ESP-IDF guide: “Universal Asynchronous Receiver/Transmitter (UART)”. *Making Embedded Systems* on serial communication.
@pit
- **Printing from the code that handles the UART.** The print goes out the same port and corrupts your timing.
- **Interview angle.** “Draw the waveform for the byte 0x41 at 8N1.” Idle, start, LSB first, stop.

=== 3.2 | draft
@why
Two wires, dozens of devices, and nearly every small sensor made speaks it. I2C is also the protocol most often debugged at midnight, because its failures look the same from software: “no acknowledge”.
@need
MPU6050, SSD1306, BME280 and DS3231 (start with the two you own), pull-up resistors, the logic analyzer. Lessons 2.1 and 1.6. About 12 hours over four sittings.
@build
::widget timing

**Sitting 1: the wire.**
- [ ] In the diagram, write to address 0x68, then read from it. Find the start, the address, the read/write bit, each acknowledge and the stop
- [ ] Switch the device to “NACK” and see what a missing device looks like

::widget rise

- [ ] In the rise-time lab, find the range of pull-ups that works at 400 kHz with 100 pF. Then with 300 pF

**Sitting 2: bit-bang it.**
- [ ] Two open-drain pins and two 4.7 kΩ pull-ups. Write `start`, `stop`, `write_byte` returning the acknowledge, and `read_byte` taking the acknowledge to send
- [ ] Write a scanner: address every device from 0x08 to 0x77 and print those that acknowledge
- [ ] Capture one transaction and compare each edge with the timing table in the I2C specification

**Sitting 3: the peripheral, and your first driver.**
- [ ] Repeat the scanner with the master driver: create a bus, then probe each address

```c
i2c_master_bus_config_t bus_cfg = { .i2c_port = I2C_NUM_0, .sda_io_num = SDA_GPIO, .scl_io_num = SCL_GPIO,
                                    .clk_source = I2C_CLK_SRC_DEFAULT, .glitch_ignore_cnt = 7 };
i2c_new_master_bus(&bus_cfg, &bus);
i2c_device_config_t dev_cfg = { .dev_addr_length = I2C_ADDR_BIT_LEN_7, .device_address = 0x68, .scl_speed_hz = 400000 };
i2c_master_bus_add_device(bus, &dev_cfg, &dev);
i2c_master_transmit_receive(dev, &reg, 1, buf, len, 100);      /* write the register number, repeated start, read */
```

- [ ] MPU6050 from its register map: read the identity register and check the value; clear the sleep bit; read the six acceleration bytes; convert to g
- [ ] Put the device behind the interface style of lesson 1.6, with a fake for host tests of the conversion

**Sitting 4: three more drivers.**
- [ ] SSD1306: the difference between a command byte and a data byte; initialise it; draw a pixel, then text from your own 5×7 font
- [ ] BME280: read the calibration constants once, then apply the compensation formulas from the datasheet exactly as printed
- [ ] DS3231: binary-coded decimal. Then put it on the same bus as the MPU6050 and solve what happens
@how
**Electrical.** Both lines are open-drain with pull-ups. Any device can pull a line low; nobody drives it high. That makes sharing safe and makes rising edges slow, which limits speed and wire length.

**A transaction.** **Start:** SDA falls while SCL is high. Then bytes, most significant bit first, each followed by a ninth clock on which the receiver pulls SDA low to **acknowledge**. The first byte is a 7-bit address and a direction bit. **Stop:** SDA rises while SCL is high. Data only changes while SCL is low, so start and stop are unmistakable.

**Register access** is a convention on top: write the register number, then, without releasing the bus, a **repeated start** and a read. Almost every sensor works this way.

**Clock stretching.** A slow device may hold SCL low to make the master wait. A bit-banged master must read SCL back after releasing it.

**A stuck bus.** If a device is reset mid-byte it may hold SDA low for ever. The recovery is to clock SCL up to nine times until it lets go, then send a stop.
@deep
- [ ] The DS3231 and the MPU6050 share a default address. What are your options, on the board and in the bus design?
- [ ] Why does a NACK tell you so little, and what four things do you check, in order?
- [ ] How many devices can a bus hold: by addresses, and by capacitance?
@when
| Use I2C when | Avoid it when |
| --- | --- |
| Several slow sensors, few pins | You need megabits (SPI) |
| Devices are on one board | The run is longer than a board, or electrically noisy (RS-485, CAN) |
| | Timing must be deterministic: stretching and retries make it variable |
@break
- [ ] Remove the pull-ups and scan. Then use 100 kΩ ones at 400 kHz and capture the edges.
- [ ] Swap SDA and SCL.
- [ ] Reset the master in the middle of a read, then try to scan. Implement bus recovery.
@check
1. What distinguishes a start condition from ordinary data?
2. Who generates the acknowledge bit when the master is reading?
3. What is a repeated start for?
@stretch
- Write a second bus on different pins and bridge two devices with the same address.
- Read the MPU6050 at 1 kHz and measure how much of the time the bus is busy.
@read
The I2C-bus specification (NXP UM10204), sections on the protocol and on pull-up sizing. ESP-IDF guide: “Inter-Integrated Circuit (I2C)”. Each device’s datasheet register map.
@pit
- **Confusing the 7-bit address with the 8-bit byte on the wire.** 0x68 appears as 0xD0 or 0xD1.
- **Copying a library’s magic numbers.** Every constant in your driver should trace to a datasheet page.
- **Interview angle.** “Walk through an I2C register read.” Start, address with write, acknowledge, register, repeated start, address with read, data, NACK, stop.

=== 3.3 | draft
@why
When I2C is too slow, the answer is SPI: displays, SD cards, flash memory, fast converters. It trades two more wires for two orders of magnitude more speed and no protocol to argue with.
@need
ST7789 display, microSD module, an SPI ADC if you have one, the logic analyzer. Lesson 2.11. About 12 hours over four sittings.
@build
::widget timing

**Sitting 1: the four modes.**
- [ ] In the diagram, step through modes 0 to 3 with the same byte. In each, say which edge samples and where the data changes
- [ ] Bit-bang a master in mode 0 and loop MOSI back to MISO. Verify that you receive what you send
- [ ] Capture it; then change to mode 3 and capture again

**Sitting 2: the peripheral.**
- [ ] Initialise the bus, add a device with a clock speed and a mode, and run one transaction
- [ ] Raise the clock from 1 MHz to 40 MHz in steps with a short jumper loopback. At what speed do errors begin, and what does the analyzer show?
- [ ] Send a 4 KB buffer by DMA and time it against a byte-at-a-time loop

**Sitting 3: a display from its datasheet.**
- [ ] ST7789: a data/command pin tells the panel which a byte is. Send the reset, sleep-out, pixel-format and display-on commands, then set a window and write pixels
- [ ] Fill the screen with one colour and time it. Then draw a rectangle, then text
- [ ] Explain why the colours are wrong the first time (byte order of 16-bit pixels)

**Sitting 4: a card and a converter.**
- [ ] SD card in SPI mode, by hand: the idle command with chip select low, the voltage check, initialisation, then read block 0 and find the signature bytes at its end
- [ ] Then use the SD and FAT components and write a file
- [ ] SPI ADC: assemble the request bits, clock out the reply, and extract the result with the masks of lesson 0.11
@how
**Wires.** Clock, data out (MOSI), data in (MISO), and one **chip select** per device. The master drives the clock; a device takes part only while its chip select is low.

**Full duplex.** Every clock moves one bit each way. To read you must send something; to write you receive bytes you may ignore.

**Modes.** Clock polarity is the idle level; clock phase is whether data is sampled on the first or second edge. Master and device must match. Most devices use mode 0 or mode 3.

**No framing, no acknowledge, no addresses.** Chip select going low starts a transaction and going high ends it. What the bytes mean is entirely the device’s datasheet. A device that is absent returns all ones or all zeros and nobody complains.

**Speed** is limited by wire length, capacitance and the device, not by the protocol. Signal integrity is why a display on jumper wires fails at speeds it handles on a board.
@deep
- [ ] Several devices share MISO. What must each do when its chip select is high?
- [ ] A 240×240 display at 16 bits per pixel: how many bytes per frame, and what frame rate at 40 MHz?
- [ ] Why does the SD card start in a different mode from the one it ends up in?
@when
| Use SPI when | Avoid it when |
| --- | --- |
| Speed matters: displays, storage, audio codecs | Pins are scarce and devices are slow (I2C) |
| Data flows in a stream | Devices are far apart (differential buses) |
| One master | Several masters need the bus |
@break
- [ ] Use the wrong mode with the display. Then leave chip select low between transactions with the ADC.
- [ ] Lengthen the wires to 30 cm at 40 MHz.
@check
1. What do clock polarity and phase each determine?
2. How does the master read from a device that only it can clock?
3. How does SPI detect a missing device?
@stretch
- Draw only the changed region of the display and measure the saving.
- Run the display and the SD card on one bus with two chip selects.
@read
ESP-IDF guide: “SPI Master Driver”. The ST7789 datasheet’s command table. The SD specification’s simplified physical layer, SPI mode chapter.
@pit
- **Assuming the mode.** Check the timing diagram, not a forum post.
- **Interview angle.** “Compare I2C and SPI.” Wires, speed, addressing, acknowledgement, distance, and one product example each.

=== 3.4 | draft
@why
Audio is the gateway to keyword spotting in Phase 9. I2S is how digital microphones and amplifiers exchange samples: simple, continuous, and unforgiving about timing.
@need
INMP441 microphone, MAX98357A amplifier and speaker, an SD card. Lessons 2.11 and 3.3. About 6 hours.
@build
- [ ] Wire the microphone: bit clock, word select, data. Its channel-select pin picks left or right
- [ ] Create a receive channel in standard mode at 16 kHz and read blocks of samples
- [ ] Print the peak level ten times a second and clap
- [ ] Capture the three lines: find one sample’s bits and note how they sit against the word-select edge
- [ ] Record five seconds to a WAV file on the SD card: a 44-byte header, then the samples
- [ ] Play it back through the amplifier. Then play while recording

::widget fft
@how
**Three lines.** The **bit clock** times each bit. **Word select** says which channel the current bits belong to: low for left, high for right. **Data** carries the sample, most significant bit first. In the standard format the sample starts one bit clock after word select changes.

The clock rate is sample rate × bits per slot × channels. A 16 kHz stereo stream of 32-bit slots needs a 1.024 MHz bit clock.

Samples never stop. The peripheral fills buffers by DMA and you must empty them in time, or samples are overwritten. That makes audio the first place you design a real-time pipeline: a reader task, a buffer, a writer task.

The microphone delivers 24 significant bits in a 32-bit slot; shift down to the 16 you will store. The FFT viewer shows what a tone looks like once sampled; Phase 9 feeds exactly that into a model.
@deep
- [ ] How many bytes per second is 16 kHz, 16-bit, mono? How long can you record on a 16 GB card?
- [ ] Writing to an SD card sometimes stalls for tens of milliseconds. How large must your buffer be to ride through?
@when
| Audio need | Interface |
| --- | --- |
| Digital microphone or codec | I2S |
| Single-bit microphones | PDM, a mode of the same peripheral |
| Many channels | TDM |
| A beep | PWM is enough |
@break
- [ ] Read at 16 kHz while the microphone is clocked for 48 kHz. Describe the sound.
- [ ] Block the reader task for 200 ms and listen for the gap.
@check
1. What does word select indicate?
2. How do you compute the bit clock?
3. Why does audio need buffering between tasks?
@stretch
- Detect a clap by energy alone and light the LED.
@read
ESP-IDF guide: “Inter-IC Sound (I2S)”. The INMP441 datasheet’s timing diagram.
@pit
- **Forgetting the one-bit delay of the standard format**, and reading every sample shifted.
- **Interview angle.** “How would you capture audio on a microcontroller without dropping samples?”

=== 3.5 | draft
@why
One wire, long cables, cheap waterproof temperature probes. 1-Wire has no clock at all, so the master creates every bit with timed pulses: the purest exercise in turning a timing table into code.
@need
DS18B20 and a 4.7 kΩ pull-up; the logic analyzer. Lessons 2.2 and 2.3. About 6 hours.
@build
- [ ] From the DS18B20 datasheet, copy the timing table: the reset pulse, the presence pulse, and the slots for writing 0, writing 1 and reading
- [ ] Bit-bang `reset` on an open-drain pin and detect the presence pulse. Capture it
- [ ] Add `write_bit` and `read_bit`, then bytes, least significant bit first
- [ ] Send “skip ROM” and “convert temperature”, wait, then “skip ROM” and “read scratchpad”. Read nine bytes

::widget crc

- [ ] Check the ninth byte with CRC-8/MAXIM in the calculator, then in your code
- [ ] Convert the raw value to degrees and warm the sensor with your fingers
- [ ] Turn Wi-Fi or a busy task on and see whether your timing survives. If not, decide: disable interrupts for each slot, or generate the slots with RMT
@how
The line idles high through a pull-up. The master starts every bit by pulling low. A **reset** is a long low pulse; any device answers with a short low **presence** pulse.

A **write-1** slot is a brief low, then release. A **write-0** slot holds low for most of the slot. To **read**, the master pulls low briefly, releases, and samples soon after: the device holds the line low for a 0 or lets it rise for a 1.

Every device has a unique 64-bit ROM code, so many can share one wire. “Skip ROM” addresses all at once; “match ROM” addresses one; the **search** algorithm discovers them by walking a binary tree, one bit at a time.

The sample point in a read slot falls within a window of a few microseconds. An interrupt in that window gives a wrong bit, and the CRC is how you find out.
@deep
- [ ] Implement the ROM search for two sensors on one wire.
- [ ] A conversion takes most of a second at full resolution. How do you read ten sensors without blocking for ten seconds?
@when
| Use 1-Wire when | Avoid it when |
| --- | --- |
| A few sensors on a long cable, one pin | You need speed |
| Unique IDs are useful | Timing cannot be guaranteed and no hardware helper is free |
@break
- [ ] Remove the pull-up. Then use a 100 kΩ one on a two-metre cable.
- [ ] Corrupt one read slot by adding a delay and confirm the CRC catches it.
@check
1. How does the master learn that a device is present?
2. What makes a read slot timing-critical?
3. How are several devices on one wire told apart?
@stretch
- Power the sensor parasitically from the data line and find what changes.
@read
The DS18B20 datasheet, start to finish: it is short and complete.
@pit
- **Ignoring the CRC.** A disturbed slot gives a plausible wrong temperature.
- **Interview angle.** Explain how you met a microsecond timing requirement on a chip running an RTOS and a radio.

=== 3.6 | draft
@why
Cars, robots, lifts and industrial machines talk CAN, because it survives electrical noise, lets any node speak, and resolves collisions without losing a message. Automotive postings assume you can explain arbitration.
@need
Two boards, two SN65HVD230 transceivers, two 120 Ω resistors. Lesson 3.1. About 9 hours.
@build
::widget can

- [ ] In the lab, predict the winner for three identifiers before reading the result. Then give two nodes the same identifier
- [ ] One board first: run the controller in self-test mode with one transceiver and receive your own frame
- [ ] Two boards on a twisted pair, a 120 Ω resistor at each end: send a counter from one, print it on the other
- [ ] Capture CAN-H and CAN-L, or the transceiver’s RX pin, and decode a frame
- [ ] Make both nodes transmit at once with different identifiers. Confirm on the analyzer that neither frame is damaged
- [ ] Set an acceptance filter so a node receives one identifier only
- [ ] Unplug one node and watch the other’s error counters climb until it goes bus-off. Implement recovery

ESP-IDF 6 has a node-based driver, `esp_twai.h`, and the reference solution uses it. Tutorials that include `driver/twai.h` describe the older interface.
@how
**Electrical.** Two wires carry one signal as a voltage difference, so noise that hits both cancels. Driven apart is **dominant** (logic 0); relaxed together is **recessive** (logic 1). A 120 Ω resistor at each end of the cable stops reflections. The microcontroller has the controller; the **transceiver** chip does the voltages.

**Frames, not addresses.** A frame carries an identifier that names the *message*, up to eight data bytes, a CRC and an acknowledge slot. Every node hears every frame and decides by identifier whether it cares.

**Arbitration.** Nodes that start together send their identifier bit by bit and listen. A node that sends recessive and hears dominant has lost and stops; the winner’s frame is untouched. Lower identifiers win, so the identifier is also the priority.

**Bit stuffing.** After five equal bits the sender inserts the opposite one, so there are always edges to stay synchronised on.

**Fault confinement.** Each node counts its errors. A node that keeps failing goes error-passive and then **bus-off**, removing itself so a broken node cannot jam the bus.

**Relatives.** CAN FD allows more data and a faster data phase; the controllers in your ESP32 chips are classic CAN only. LIN is a cheap single-wire bus for slow body electronics. FlexRay and MOST are older high-speed and media buses you should recognise by name.
@deep
- [ ] Why is the sample point placed late in the bit, and what limits bus length at 1 Mbit/s?
- [ ] A lone node on a bus keeps retransmitting. Which field is failing, and why?
- [ ] Design identifiers for a robot: emergency stop, motor commands, sensor data, logging.
@when
| Use CAN when | Avoid it when |
| --- | --- |
| Many nodes, any may speak, noise is high | Two chips on one board |
| Messages have priorities and deadlines | You need megabytes per second |
| A node failing must not take the bus down | Cost per node must be minimal (LIN, RS-485) |
@break
- [ ] Remove one termination resistor; then both.
- [ ] Set the two nodes to different bit rates.
@check
1. What do dominant and recessive mean?
2. Why does arbitration not corrupt the winning frame?
3. What is bus-off for?
@stretch
- Add a third node and measure the worst-case delay of the lowest-priority message under load.
@read
Bosch CAN Specification 2.0, part A. ESP-IDF guide: the TWAI driver for your version. The SN65HVD230 datasheet.
@pit
- **No termination, or a transceiver left out.** The controller alone cannot drive a bus.
- **Interview angle.** “Explain CAN arbitration” and “what happens when two nodes transmit together?”

=== 3.7 | draft
@why
Factory sensors, energy meters, motor drives and building controls speak Modbus, a protocol simple enough to implement in an afternoon and old enough to be everywhere.
@need
Two boards with RS-485 modules, or one board and a PC running a Modbus tool. Lessons 3.1 and 0.12. About 6 hours.
@build
::widget crc

- [ ] By hand, build the request “device 1, read 2 holding registers starting at 0”: address, function 0x03, start and count as big-endian 16-bit values. Compute CRC-16/MODBUS in the calculator and append it low byte first
- [ ] Implement a slave with a table of ten holding registers: reply to function 0x03, accept 0x06 to write one
- [ ] Return a proper exception reply for an unknown function or address
- [ ] Implement a master that polls the slave once a second and prints the registers
- [ ] Frame by silence: a gap of three and a half character times ends a frame. Implement it with a timer
- [ ] Put a real value behind a register: your temperature or distance sensor
@how
Modbus RTU is **master and slave** on RS-485. Only the master speaks first. A request is: slave address, **function code**, data, CRC. The slave replies with the same address and function, its data, and a CRC. There is no start byte: frames are separated by silence.

The data model is four tables: coils (read-write bits), discrete inputs (read-only bits), input registers (read-only 16-bit) and **holding registers** (read-write 16-bit). Everything a device offers is mapped onto numbered entries in these.

Values are big-endian; the CRC is sent low byte first. That inconsistency catches everyone once.

An **exception** reply sets the top bit of the function code and adds a reason byte.

**Modbus TCP** carries the same function codes over Ethernet or Wi-Fi without the CRC. **Profinet** and **EtherCAT** are industrial Ethernet protocols with hard real-time guarantees: EtherCAT frames pass through each device, which reads and writes its data on the fly. Recognise the names and what they are for.
@deep
- [ ] A slave takes 40 ms to answer and there are twenty slaves. What is the poll cycle, and how would you shorten it?
- [ ] How do you represent a 32-bit float in 16-bit registers, and what must the two ends agree on?
@when
| Use Modbus when | Avoid it when |
| --- | --- |
| Interoperating with industrial equipment | Any node must be able to speak unprompted (CAN) |
| Simple polled data | You need security: Modbus has none |
@break
- [ ] Send the CRC high byte first. Then address a slave that does not exist and handle the timeout.
@check
1. How does a receiver know an RTU frame has ended?
2. What is a holding register?
3. How does a slave signal an error?
@stretch
- Add function 0x10, write multiple registers.
@read
“Modbus Application Protocol Specification” and “Modbus over Serial Line”, both free from the Modbus Organization.
@pit
- **Register numbering.** Documentation often counts from 1 while the wire counts from 0.
- **Interview angle.** “Have you worked with an industrial protocol?” Describe the frame and the hardest bug.

=== 3.8 | draft
@why
USB is how a device meets a computer or phone without drivers. Your S3 has it built in, so a sensor can appear as a serial port, a keyboard or a drive.
@need
An S3 board on its native USB port. About 9 hours.
@build
The stack is the `espressif/esp_tinyusb` managed component. Declare it in `main/idf_component.yml`; PlatformIO and `idf.py` both download it on the first build. Switch the CDC class on in the configuration (`pio run -t menuconfig`, or a line in `sdkconfig.defaults`). The reference solution covers the serial device; the keyboard and the drive are yours to build from the component’s examples.

- [ ] Serial (CDC): appear as a serial port and echo characters. Watch your computer’s device list as you plug in
- [ ] Capture or dump the descriptors your device reports, and label each field
- [ ] Keyboard (HID): type a fixed string when a button is pressed
- [ ] Storage (MSC): expose a small FAT partition in flash as a drive and write a file to it from the computer
- [ ] Change the product string and see where it appears
@how
**Host and device.** The host starts every exchange. A device only ever answers.

**Endpoints** are numbered channels with a direction and a type: control, for configuration; bulk, for reliable data; interrupt, for small periodic reports; isochronous, for audio and video where late is worse than lost.

**Descriptors** are tables the device hands over to describe itself: who made it, what it is, how many interfaces it has, which endpoints each uses.

**Enumeration.** On connection the host resets the device, reads its descriptors, gives it an address and selects a configuration. From the descriptors the operating system picks a driver.

**Classes** are standard device types that need no custom driver: CDC for serial ports, HID for keyboards and mice and any small report, MSC for storage. A composite device offers several at once.

The S3 is a full-speed device, 12 Mbit/s.
@deep
- [ ] A HID keyboard report is eight bytes. Decode one from the report descriptor.
- [ ] Why is “expose flash as a drive” dangerous when your firmware also writes to that file system?
@when
| Want | Class |
| --- | --- |
| Logs, commands, data to a script | CDC |
| Input device, or small data with no driver on any system | HID |
| Hand files to a user | MSC |
| Firmware update | DFU |
@break
- [ ] Declare an endpoint in the descriptor that the code never services. Watch what the host does.
@check
1. Who initiates every USB transfer?
2. What is a descriptor for?
3. Name the four endpoint types and a use for each.
@stretch
- Build a composite device: serial port and keyboard together.
@read
“USB in a NutShell”, free online. ESP-IDF guide: “USB Device Stack”.
@pit
- **Using a vendor ID that is not yours in a product.**
- **Interview angle.** “What happens when you plug a USB device in?”

=== 3.9 | draft
@why
You have used JTAG since lesson 1.15 without looking inside. Knowing what the probe does lets you bring up a dead board and understand the same tools on ARM, where the interface is called SWD.
@need
An S3 board; the Nucleo if it has arrived. Lesson 1.15. 3 hours.
@build
- [ ] Start OpenOCD with verbose output and read its start-up: which interface, which target, what it found on the scan chain
- [ ] Connect to OpenOCD’s command port and run `halt`, `reg`, `resume` by hand, with no GDB
- [ ] Read a peripheral register through OpenOCD and compare with lesson 0.13
- [ ] On the Nucleo: connect with its on-board debugger over SWD, halt, and read the device identification register
- [ ] Find the JTAG pins of the classic ESP32 and note which collide with the ESP32-CAM’s SD card
@how
**JTAG** has four signals: a clock, a mode select, data in and data out. Inside the chip a small state machine, the test access port, shifts bits into an instruction register and various data registers. One of those registers reaches the CPU’s debug module.

Through the debug module a tool can halt the core, read and write registers and memory, and program breakpoint comparators.

**Boundary scan**, JTAG’s original purpose, drives and reads every pin of a chip to test the soldering of a board.

**SWD** is ARM’s two-wire replacement: one clock, one bidirectional data line, the same debug access underneath.

**OpenOCD** is the translator: it knows your probe and your chip, and offers a GDB server on one side and raw commands on the other.
@deep
- [ ] Several chips can share one JTAG chain. How does the tool address one of them?
- [ ] Why must debug access be disabled or locked in a shipped product, and what does that cost you?
@when
| Interface | Where |
| --- | --- |
| Built-in USB-JTAG | ESP32-S3, C3, C6 |
| External JTAG probe | Classic ESP32 |
| SWD | ARM Cortex-M: STM32, nRF, RP2040 |
@break
- [ ] Reuse a JTAG pin as a GPIO in your firmware on a board with an external probe and try to connect.
@check
1. What are JTAG’s four signals?
2. What is SWD, and where is it used?
3. What does OpenOCD do?
@stretch
- Flash a binary through OpenOCD instead of the serial bootloader.
@read
ESP-IDF guide: “JTAG Debugging”. The OpenOCD user guide’s first chapters.
@pit
- **Assuming the debug port is always available.** Sleep modes and pin reuse can disable it.
- **Interview angle.** “JTAG versus SWD?”

=== 3.10 | draft
@why
A camera produces more data per second than every sensor so far combined. Getting frames into memory is the plumbing that Phase 9’s vision models depend on.
@need
An ESP32-CAM. Lessons 2.11 and 3.2. About 6 hours.
@build
- [ ] Add the camera component (`espressif/esp32-camera` in `main/idf_component.yml`) and take one JPEG at a small frame size. Build for the ESP32-CAM: `pio run -e esp32cam -t upload`, with IO0 held to GND while it flashes
- [ ] Print the frame’s length and where its buffer lives: internal RAM or PSRAM
- [ ] Send the frame over serial and view it on your computer; `firmware/tools/save_jpeg.py` saves what the reference prints
- [ ] Switch to an uncompressed greyscale format and compute a brightness average
- [ ] Measure frames per second at three sizes
- [ ] Read one sensor register over the control bus by hand, and name the bus
@how
**DVP,** the parallel camera interface: eight data lines, a **pixel clock**, and two sync signals marking the start of a frame and of each line. The microcontroller supplies a master clock to the sensor; the sensor then drives everything else.

At tens of megahertz, bytes arrive far too fast for interrupts. The peripheral captures them by DMA into a **frame buffer**, which is why a camera needs PSRAM: one small uncompressed frame is larger than most of the internal RAM.

The sensor is configured over **SCCB**, which is I2C in all but name: resolution, format, exposure, gain.

The OV2640 can compress to JPEG itself, shrinking a frame by ten times or more. Machine-learning models want raw pixels, so Phase 9 trades frame size against memory.

**MIPI CSI-2** (cameras) and **DSI** (displays) are the serial successors: a few differential lanes carrying packets at very high speed. They need a dedicated receiver and are what you will meet on a Jetson or a phone. Recognise them; you will not implement them here.
@deep
- [ ] 320×240 at 2 bytes per pixel: how big is a frame, and how many fit in 4 MB?
- [ ] With two frame buffers, the camera fills one while you process the other. What happens if processing is slower than capture?
@when
| Interface | Typical use |
| --- | --- |
| DVP parallel | Small cameras on microcontrollers |
| MIPI CSI-2 | Cameras on application processors |
| SPI | Small displays |
| Parallel RGB, MIPI DSI | Large displays |
@break
- [ ] Use the SD card and the camera together on the ESP32-CAM and find which pins conflict.
- [ ] Ask for a frame size that does not fit and read the error.
@check
1. Why does a camera interface need DMA?
2. What is the control bus of the OV2640?
3. Why do vision models prefer uncompressed frames?
@stretch
- Detect motion by comparing successive greyscale frames.
@read
The esp32-camera component’s documentation. The OV2640 datasheet’s interface section.
@pit
- **Brown-outs.** The camera’s current peaks reset a weakly powered board.
- **Interview angle.** “How do you get video into a microcontroller with 500 KB of RAM?”

=== 3.11 | draft
@why
Postings name STM32 and ARM Cortex-M far more often than ESP32. Ten hours on a Nucleo shows you, and an interviewer, that what you have learned is not tied to one vendor.
@need
An STM32 Nucleo-64 board and STM32CubeIDE. Lessons 0.13, 1.12 and 3.2. 10 hours.
@build
Registers first, then the vendor library, exactly as on the ESP32.

- [ ] Find the user LED’s pin on your Nucleo’s schematic, and the GPIO chapter of the chip’s reference manual
- [ ] Blink it with registers only: enable the port’s clock, set the pin’s mode bits, toggle the output
- [ ] Notice the first step: nothing happens until the peripheral’s clock is enabled
- [ ] Use the set/reset register and compare it with W1TS and W1TC
- [ ] Send “hello” on the UART that the on-board debugger exposes as a serial port: baud-rate register from the clock frequency, then the data register
- [ ] Single-step your code over SWD and watch the registers change
- [ ] Repeat blink and UART with the vendor HAL. Read the HAL’s source for one call down to the register write
- [ ] Port your lesson 1.12 driver by writing one new HAL file
@how
The ideas transfer; the names change.

| Idea | ESP32 | STM32 |
| --- | --- | --- |
| Output value | `GPIO_OUT_REG` | `ODR` |
| Atomic set and clear | `W1TS`, `W1TC` | `BSRR` |
| Direction | `GPIO_ENABLE_REG` | `MODER` |
| Pin function | IO MUX, GPIO matrix | Alternate-function registers |
| Peripheral clock | Managed by the driver | You enable it in `RCC` first |
| Debug | USB-JTAG | SWD through ST-LINK |
| Vendor layer | ESP-IDF drivers | STM32 HAL and LL |

Two real differences. On STM32 every peripheral’s clock is off until you turn it on, and forgetting is the classic first bug. And pin functions are fixed choices per pin from a table, not a free matrix.

The Cortex-M core adds its own standard parts: the NVIC for interrupts and SysTick for the RTOS tick, the same on every vendor’s Cortex-M chip.
@deep
- [ ] Compare interrupt handling: a vector table of function addresses on Cortex-M against what you saw on the ESP32.
- [ ] What did your HAL from lesson 1.12 have to change, and what stayed?
@when
| Choose | For |
| --- | --- |
| ESP32 family | Wi-Fi and Bluetooth built in, low cost, edge AI on the S3 |
| STM32 and other Cortex-M | Low power, wide peripheral choice, industrial and automotive supply chains |
@break
- [ ] Leave out the clock-enable line and debug it as if you did not know.
@check
1. What must you do on an STM32 before touching a peripheral’s registers?
2. What is the STM32 equivalent of W1TS and W1TC?
3. What stays the same across all Cortex-M chips?
@stretch
- Run FreeRTOS on the Nucleo and port one Phase 4 lab.
@read
The reference manual for your Nucleo’s chip: the RCC and GPIO chapters. Phil’s Lab’s STM32 firmware series.
@pit
- **Fighting the code generator.** Understand the registers first; then let the tool write the boilerplate.
- **Interview angle.** “You have used ESP32; how quickly could you work on our STM32 product?” Answer with this lesson.

=== 3.12 | draft
@why
Choosing the bus is a design decision you will be asked to justify. This lesson turns eleven modules into one page and tests whether you can choose.
@need
Phase 3 so far. 2 hours.
@build
- [ ] Without notes, fill in a table for UART, RS-485, I2C, SPI, I2S, 1-Wire, CAN and USB: wires, typical speed, reach, number of devices, who provides the clock, and one product that uses it
- [ ] Compare it with the [protocol cheatsheet](#sheets-protocols) and correct it in a second colour
- [ ] Choose a bus for each scenario and write one sentence of justification:
    1. Eight temperature probes along a 20-metre greenhouse
    2. A 320×240 colour display refreshed at 30 frames per second
    3. A motor controller and a battery monitor in an electric scooter
    4. An accelerometer, a pressure sensor and a clock on one small board
    5. A configuration link to a technician’s laptop
    6. A microphone feeding a keyword model
- [ ] For each, name the runner-up and why it lost
@how
Five questions decide almost every case.

1. **How far?** On a board, anything works. Beyond a metre, differential signalling: RS-485 or CAN.
2. **How fast?** Kilobits: I2C, 1-Wire, UART. Megabits: SPI, I2S, USB.
3. **How many devices, and who may speak?** One peer: UART. Many, master-driven: I2C, SPI, RS-485. Many, any may speak: CAN.
4. **How many pins can you spare?** One: 1-Wire. Two: I2C, UART. Four and up: SPI.
5. **What does the part you want to use already speak?** Usually the deciding factor.
@deep
- [ ] Which buses detect a corrupted message by themselves, and which leave it to you?
- [ ] Which buses tolerate a device being absent, and how does each report it?
@when
See the scenarios above: this lesson is the “when” of the whole phase.
@break
- [ ] For each scenario, pick the worst possible bus and say precisely how it would fail.
@check
The Phase 3 quiz is mostly this. Before it: explain each of your six choices aloud in under twenty seconds.
@stretch
- Design the bus layout for the multi-bus data logger capstone and draw it.
@read
Your own captures from this phase.
@pit
- **Choosing by familiarity.**
- **Interview angle.** “Which protocol would you use for X, and why?” is asked in nearly every embedded interview.
