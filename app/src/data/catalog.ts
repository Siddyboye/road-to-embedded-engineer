// Roadmap boxes follow the "Embedded Systems Engineering Roadmap" by Meysam Parvizi
// (v2.0.3, CC BY-SA 4.0, github.com/m3y54m/Embedded-Engineering-Roadmap).
// Each box maps to course lessons ('1.8'), whole phases ('P4'), or nothing (left out of the course).
export type Level = 'req' | 'rec' | 'opt';
export type Box = { name: string; level: Level; refs: string[]; note?: string };
export type Group = { title: string; boxes: Box[] };
export type Section = { title: string; tone: 'software' | 'both' | 'hardware' | 'soft'; groups: Group[] };
const b = (name: string, level: Level, refs: string[] = [], note?: string): Box => ({ name, level, refs, note });

export const roadmap: Section[] = [
  { title: 'Software', tone: 'software', groups: [
    { title: 'Programming languages', boxes: [b('C', 'req', ['P1']), b('C++', 'rec', ['1.16']), b('Python', 'rec', ['1.16', '7.7']), b('Assembly', 'opt', ['1.1', '7.2'], 'Reading disassembly only'), b('Rust', 'opt', [], 'Optional module after Phase 4')] },
    { title: 'Programming fundamentals', boxes: [b('Algorithms & data structures', 'req', ['1.8']), b('Design patterns', 'req', ['1.6', '1.12']), b('State machines', 'req', ['1.9']), b('Memory management', 'req', ['1.1', '1.10', '1.11'])] },
    { title: 'Debugging', boxes: [b('JTAG / SWD', 'req', ['1.15', '3.9', '7.3']), b('GDB', 'req', ['1.15', '7.3']), b('OpenOCD', 'opt', ['7.3'])] },
    { title: 'Build system', boxes: [b('Compilers / GCC', 'req', ['1.1', '1.13']), b('Make / CMake', 'req', ['0.2']), b('Bash scripting', 'rec', ['7.7']), b('Docker', 'opt', ['6.9', '7.8'])] },
    { title: 'Testing', boxes: [b('TDD & unit testing', 'req', ['1.8', '1.14']), b('CI/CD pipelines', 'rec', ['6.9']), b('SIL / HIL testing', 'opt', ['6.8']), b('Standards & certifications', 'opt', ['6.11'])] },
    { title: 'SDLC and version control', boxes: [b('Git', 'req', ['6.10']), b('Agile / Scrum', 'rec', ['6.11']), b('V-model', 'rec', ['6.11']), b('SVN', 'opt', [], 'Left out')] },
    { title: 'Operating systems', boxes: [b('OS fundamentals', 'rec', ['8.1']), b('Linux kernel', 'rec', ['8.2', '8.5']), b('Device drivers', 'rec', ['8.6']), b('U-Boot', 'opt', ['8.2']), b('Buildroot / Yocto', 'opt', ['8.3']), b('Threading / parallelism', 'opt', ['8.1']), b('IPC', 'opt', ['8.1']), b('Qt framework', 'opt', [], 'Left out')] },
    { title: 'Specializations', boxes: [b('Edge AI', 'opt', ['P9'], 'Your main target'), b('Embedded security', 'opt', ['5.10']), b('IoT', 'opt', ['P5']), b('Embedded GUI', 'opt', [], 'Optional LVGL lab in Phase 3'), b('AUTOSAR', 'opt', ['6.11'], 'Awareness only')] },
  ] },
  { title: 'Software ∩ hardware', tone: 'both', groups: [
    { title: 'Real-time OS', boxes: [b('RTOS basics', 'req', ['P4']), b('FreeRTOS', 'rec', ['P4']), b('Zephyr', 'rec', ['4.12']), b('QNX', 'opt', [], 'Named in 4.1 only'), b('µC/OS', 'opt', [], 'Named in 4.1 only'), b('RT-Thread', 'opt', [], 'Named in 4.1 only')] },
    { title: 'Microcontroller peripherals', boxes: [b('GPIO', 'req', ['2.1']), b('ADC / DAC', 'req', ['2.6']), b('Timers / counters', 'req', ['2.3']), b('PWM', 'req', ['2.4']), b('Watchdog', 'req', ['2.10']), b('Interrupts', 'req', ['2.2']), b('DMA', 'req', ['2.11']), b('Clock management', 'req', ['0.9', '2.12']), b('Power management', 'rec', ['2.12', '6.5']), b('Bootloader / DFU', 'rec', ['1.7', '2.13', '5.9'])] },
    { title: 'Basic and high-speed interfaces', boxes: [b('UART', 'req', ['3.1']), b('I2C', 'req', ['3.2']), b('SPI', 'req', ['3.3']), b('USB', 'rec', ['3.8']), b('Ethernet', 'rec', ['5.11'], 'Concept level'), b('PCIe', 'opt', [], 'Left out')] },
    { title: 'Network and wireless', boxes: [b('MQTT', 'rec', ['5.5']), b('Wi-Fi', 'rec', ['5.1']), b('Bluetooth', 'rec', ['5.7']), b('TCP/IP', 'opt', ['5.3']), b('UDP', 'opt', ['5.3']), b('CoAP', 'opt', ['5.6']), b('LoRa', 'opt', ['5.11']), b('Zigbee', 'opt', ['5.11'], 'Concept'), b('Thread', 'opt', ['5.11'], 'Concept'), b('Matter', 'opt', ['5.11'], 'Concept'), b('UWB', 'opt', [], 'Left out')] },
    { title: 'Industrial, automotive, cellular', boxes: [b('Modbus', 'rec', ['3.7']), b('CAN', 'rec', ['3.6']), b('Profinet', 'opt', ['3.7'], 'Awareness'), b('EtherCAT', 'opt', ['3.7'], 'Awareness'), b('LIN', 'opt', ['3.6'], 'Awareness'), b('MOST', 'opt', ['3.6'], 'Awareness'), b('FlexRay', 'opt', ['3.6'], 'Awareness'), b('GSM / LTE / NB-IoT', 'opt', [], 'Left out')] },
    { title: 'Display and camera', boxes: [b('MIPI CSI-2', 'opt', ['3.10'], 'Concept'), b('MIPI DSI', 'opt', ['3.10'], 'Concept')] },
    { title: 'Hardware-facing software', boxes: [b('Memory technologies & file systems', 'rec', ['6.1', '6.2', '6.3']), b('Hardware simulation / emulation', 'rec', ['7.9']), b('Sensors & actuators', 'opt', ['P3']), b('Digital signal processing', 'opt', ['9.2']), b('Control theory', 'opt', [], 'PID project, Tier 4')] },
  ] },
  { title: 'Hardware', tone: 'hardware', groups: [
    { title: 'Electronics', boxes: [b('Basic math & calculus', 'req', ['0.8', '9.2'], 'As needed'), b('Principles of electric circuits', 'req', ['0.4']), b('Electronics fundamentals', 'req', ['0.5']), b('Digital design', 'req', ['0.7', '0.9'], 'Light; reading plan'), b('Computer architecture', 'req', ['0.1', '1.1'], 'Light; reading plan')] },
    { title: 'Using test equipment', boxes: [b('Multimeter', 'req', ['0.4']), b('Logic / protocol analyzer', 'req', ['0.7', '7.5']), b('Oscilloscope', 'rec', ['7.5'])] },
    { title: 'Prototyping skills', boxes: [b('Breadboarding', 'rec', ['0.4', '0.5']), b('Hardware design basics', 'rec', ['0.6', '6.7']), b('PCB design / EMC', 'rec', ['6.6', '6.7']), b('Soldering / rework', 'rec', [], 'Before Phase 3'), b('FPGA development', 'opt', [], 'Left out')] },
  ] },
  { title: 'Soft skills', tone: 'soft', groups: [
    { title: 'All required', boxes: [b('Communication', 'req', ['10.9']), b('Problem solving & critical thinking', 'req', ['10.5', '10.6']), b('Teamwork', 'req', ['6.10']), b('Organization & time management', 'req', ['10.9']), b('Self-driven and independent', 'req', ['10.7']), b('Adaptability & patience', 'req', ['10.10'])] },
  ] },
];

// ---- Hardware ----
export type Tier = 'Must' | 'Should' | 'Later';
export type Part = { name: string; tier: Tier; why: string; first: string; inr: string; usd: string; meanwhile: string };
const p = (name: string, tier: Tier, why: string, first: string, inr: string, usd: string, meanwhile: string): Part => ({ name, tier, why, first, inr, usd, meanwhile });

export const owned: string[] = [
  'ESP32-S3 N16R8 boards', 'ESP32-CAM boards', 'FTDI USB-serial programmer', 'ESP32-DevKitC-VE', 'HC-SR04 ultrasonic', 'HY-SRF05 ultrasonic',
  'MPU6050 IMU', 'SSD1306 OLED 0.96″', 'Push button', 'Resistor assortment', 'Breadboard 830-point', 'Jumper wires', 'LEDs', '10 kΩ resistors', '100 nF capacitors',
];

export const shopping: Part[] = [
  p('USB logic analyzer, 8 ch 24 MHz', 'Must', 'Every protocol lesson compares a capture to the spec', '0.7', '450–900', '6–12', 'Lessons 0.1 to 0.6 need none'),
  p('Multimeter with continuity', 'Must', 'Verify rails and wiring before blaming code', '0.4', '800–2,500', '10–30', 'Do 0.4 as calculation only'),
  p('Soldering iron, solder, flux', 'Must', 'Sensor modules ship with loose headers', '3.2', '600–4,000', '8–45', 'Do not start Phase 3 without it'),
  p('Level shifter, 4-channel BSS138', 'Must', '5 V echo from the HC-SR04, 5 V I2C parts', '0.5', '50–80', '1', 'Resistor divider from your kit'),
  p('USB-UART adapters ×2', 'Must', 'Second serial port, UART sniffing', '3.1', '300', '4', 'Use the FTDI programmer as one'),
  p('BME280', 'Must', 'Second I2C driver from a datasheet', '3.2', '250–450', '3–6', 'MPU6050 driver first'),
  p('ST7789 SPI display', 'Must', 'SPI driver with DMA', '3.3', '350–700', '4–9', 'Bit-bang SPI into the analyzer'),
  p('MicroSD SPI module and 16 GB card', 'Must', 'SPI-mode SD, filesystems', '3.3', '400–500', '5–6', 'The ESP32-CAM has an SD slot'),
  p('DS18B20', 'Must', '1-Wire from scratch', '3.5', '60–150', '1–2', 'Timing analysis on paper'),
  p('Rotary encoder and SG90 servo', 'Must', 'PCNT and PWM', '2.4', '150–230', '2–3', 'LEDC with an LED'),
  p('INMP441 I2S microphone', 'Must', 'I2S, then keyword spotting', '3.4', '~210', '3', 'Phase 9 starts with the IMU'),
  p('WS2812 strip or ring', 'Should', 'RMT driver project', '2.7', '150–400', '2–5', 'The S3 on-board RGB LED is one pixel'),
  p('USB power meter and INA219', 'Should', 'Measuring sleep currents', '2.12', '550–1,050', '7–13', 'Multimeter in series, with care'),
  p('18650 or LiPo cell with protected charger', 'Should', 'Battery node', '6.5', '400', '5', 'USB power'),
  p('DS3231 RTC', 'Should', 'Timestamps, one more I2C driver', '3.2', '150–300', '2–4', 'SNTP time later'),
  p('MAX98357A amplifier and speaker', 'Should', 'I2S output', '3.4', '250–400', '3–5', 'Skip the stretch goal'),
  p('NEO-6M GPS', 'Should', 'NMEA parser over UART', '3.1', '250–450', '3–6', 'Replay a recorded NMEA log from the PC'),
  p('SN65HVD230 CAN transceivers ×2', 'Should', 'Two-node CAN bus', '3.6', '300–500', '4–6', 'TWAI self-test mode on one board'),
  p('MAX485 RS-485 modules ×2', 'Should', 'RS-485 and Modbus RTU', '3.7', '120', '2', 'Modbus framing over plain UART'),
  p('TB6612FNG driver and N20 motor with encoder', 'Should', 'PID control loop', '2.8', '650', '9', 'Simulate the plant in Python'),
  p('Buck module with display', 'Should', 'Adjustable rail, brown-out experiments', '6.5', '150–400', '2–5', 'USB power only'),
  p('STM32 Nucleo-64', 'Should', 'ARM Cortex-M and SWD, named in postings', '3.11', '1,800–2,800', '15–30', 'Read-only: compare register maps'),
  p('Raspberry Pi Pico 2 W', 'Should', 'Second vendor, PIO', '3.9', '600–800', '7–9', 'Not blocking'),
  p('Oscilloscope', 'Later', 'Analog questions the logic analyzer cannot answer', '7.5', '4,000–45,000', '50–450', 'Logic analyzer'),
  p('ESP-PROG', 'Later', 'JTAG on the classic ESP32 only', '7.3', '1,200–1,800', '15–20', 'Debug on the S3'),
  p('S3 board with camera', 'Later', 'Person detection at S3 speed', '9.9', '1,500–2,200', '14–25', 'ESP32-CAM runs the same model slower'),
  p('LoRa SX1262 or RFM95 modules ×2', 'Later', 'LoRa lesson; buy the 865–867 MHz band for India', '5.11', '1,400–2,400', '18–30', 'Read-only lesson'),
  p('Relay module', 'Later', 'Switching loads; low-voltage DC only, no mains wiring', '2.1', '70–100', '1', 'LED as the load'),
  p('Raspberry Pi 4 or 5', 'Later', 'Phase 8 on real hardware', '8.4', '5,000–8,000', '55–90', 'QEMU covers every Phase 8 lab'),
  p('Bench power supply 30 V 5 A', 'Later', 'Motors, current limiting', '6.5', '3,500–6,000', '45–75', 'Buck module'),
];

// ---- Books ----
export type Book = { title: string; author: string; edition: string; phases: string; read: string; skip: string; core?: boolean };
export const books: Book[] = [
  { title: 'Making Embedded Systems', author: 'Elecia White', edition: '2nd, 2024 (verified)', phases: '0–7', read: 'All of it, one chapter per fortnight', skip: 'Nothing', core: true },
  { title: 'Effective C', author: 'Robert Seacord', edition: '2nd, 2024', phases: '1', read: 'Types, integers, pointers, memory, preprocessor, testing', skip: 'I/O streams on first pass', core: true },
  { title: 'Test-Driven Development for Embedded C', author: 'James Grenning', edition: '1st, 2011', phases: '1, 6', read: 'Chapters 1–9, then test doubles', skip: 'Legacy-code section until Phase 6', core: true },
  { title: 'Mastering the FreeRTOS Real Time Kernel', author: 'Richard Barry and the FreeRTOS team', edition: 'v1.1.0, free PDF', phases: '4', read: 'One chapter per lesson', skip: 'Port-specific appendices', core: true },
  { title: 'TinyML', author: 'Warden and Situnayake', edition: '1st, 2019', phases: '9', read: 'Concepts, wake-word, gesture and optimisation chapters', skip: 'Board-specific deployment steps' },
  { title: 'AI at the Edge', author: 'Situnayake and Plunkett', edition: '1st, 2023', phases: '9', read: 'Workflow, dataset and evaluation chapters', skip: 'Use-case chapters until the capstone' },
  { title: 'Fluent C', author: 'Christopher Preschern', edition: '1st, 2022', phases: '1', read: 'Error handling, memory and interface patterns', skip: 'Build-system chapters' },
  { title: 'Make: Electronics', author: 'Charles Platt', edition: '3rd, 2021', phases: '0', read: 'The first third, doing the experiments', skip: 'Audio and logic-chip projects' },
  { title: 'The C Programming Language', author: 'Kernighan and Ritchie', edition: '2nd', phases: '1', read: 'Chapters 5 and 6 once', skip: 'Using it as a style guide' },
  { title: 'Computer Organization and Design (RISC-V)', author: 'Patterson and Hennessy', edition: '2nd', phases: '0, 1', read: 'Chapters 1, 2 and 5', skip: 'Datapath design detail' },
  { title: 'Linux Device Driver Development', author: 'John Madieu', edition: '2nd', phases: '8', read: 'Character driver, I2C client driver, device tree', skip: 'Subsystems you do not use' },
];

// ---- Glossary ----
export const glossary: [string, string][] = [
  ['ACK / NACK', 'On I2C, the receiver pulls SDA low during the ninth clock to acknowledge a byte. Leaving it high is a NACK.'],
  ['ADC', 'Analog-to-digital converter. Turns a voltage into a number; resolution is its bit width.'],
  ['Aliasing', 'A signal above half the sample rate appears at a false lower frequency after sampling.'],
  ['Baud rate', 'Symbols per second on a serial line. For UART it equals bits per second.'],
  ['Bit-banging', 'Driving a protocol by toggling GPIO pins from software instead of using a hardware peripheral.'],
  ['Bootloader', 'The small program that runs first, checks the application image and starts it.'],
  ['bss', 'The memory section for zero-initialised static and global variables. It occupies RAM but no flash.'],
  ['Clock stretching', 'An I2C slave holds SCL low to make the master wait.'],
  ['CPOL / CPHA', 'SPI clock polarity (idle level) and phase (which edge samples). Together they give modes 0 to 3.'],
  ['CRC', 'Cyclic redundancy check. A remainder from polynomial division used to detect corrupted data.'],
  ['Debouncing', 'Ignoring the rapid make-and-break of a mechanical contact so one press counts once.'],
  ['Decoupling capacitor', 'A small capacitor next to a chip’s supply pin that supplies fast current spikes locally.'],
  ['DMA', 'Direct memory access. A peripheral moves data to or from memory without the CPU copying each byte.'],
  ['Duty cycle', 'The fraction of a PWM period spent high.'],
  ['Endianness', 'Byte order of multi-byte values. Little-endian stores the least significant byte first.'],
  ['eFuse', 'One-time-programmable bits inside the chip. Burning one cannot be undone.'],
  ['GPIO matrix', 'The ESP32 routing layer that connects most peripheral signals to most pins.'],
  ['HAL', 'Hardware abstraction layer. A thin interface that hides chip-specific register access.'],
  ['Heap fragmentation', 'Free memory split into pieces too small to satisfy a request, although the total is enough.'],
  ['ISR', 'Interrupt service routine. Runs when an interrupt fires; must be short and must not block.'],
  ['Jitter', 'Variation in the timing of an event that should be periodic.'],
  ['JTAG', 'A debug and test interface that gives a debugger control of the CPU.'],
  ['Latency', 'Delay between a cause and its effect, for example an edge and the ISR’s first instruction.'],
  ['Logic level', 'The voltage ranges a chip reads as 0 and as 1. The ESP32 is a 3.3 V device.'],
  ['Mutex', 'A lock with ownership, used to protect a shared resource. Supports priority inheritance.'],
  ['Nyquist rate', 'Twice the highest frequency in a signal; sampling slower than this causes aliasing.'],
  ['Open-drain', 'An output that can only pull low. A resistor pulls the line high; several devices can share it.'],
  ['OTA', 'Over-the-air firmware update.'],
  ['Partition table', 'The map of flash regions: bootloader data, NVS, application slots, file systems.'],
  ['Prescaler', 'A divider that slows a clock before it reaches a timer.'],
  ['Priority inversion', 'A high-priority task waits on a lock held by a low-priority task that a medium-priority task keeps preempting.'],
  ['PSRAM', 'Pseudo-static RAM. External RAM on the SPI bus; larger and slower than internal RAM.'],
  ['Pull-up / pull-down', 'A resistor that gives an undriven line a defined level.'],
  ['PWM', 'Pulse-width modulation. A fixed-frequency square wave whose duty cycle carries the value.'],
  ['Quantization', 'Mapping continuous or high-precision values onto fewer levels, such as float32 weights onto int8.'],
  ['Race condition', 'A result that depends on the timing of two contexts touching the same data.'],
  ['Ring buffer', 'A fixed-size FIFO whose read and write indices wrap around.'],
  ['RTOS', 'Real-time operating system. A scheduler that runs tasks by priority with bounded timing.'],
  ['Setup and hold time', 'How long data must be stable before and after a clock edge to be captured reliably.'],
  ['Strapping pin', 'A pin sampled at reset to choose boot behaviour. Its level at power-up matters.'],
  ['Tensor arena', 'The single block of RAM TFLite Micro uses for all tensors and scratch buffers.'],
  ['volatile', 'A C qualifier telling the compiler a variable can change outside the visible code flow.'],
  ['Watchdog', 'A timer that resets the system unless the software restarts it in time.'],
  ['Zero-point', 'In quantization, the integer that represents real 0.0.'],
];

// ---- Projects ----
export type Project = { tier: number; name: string; after: string; board: string; twist: string };
const pr = (tier: number, name: string, after: string, board: string, twist: string): Project => ({ tier, name, after, board, twist });
export const projects: Project[] = [
  pr(1, 'Blink, button, PWM', 'Phase 0', 'both', 'Blink Morse of a string typed over serial, timing from one table'),
  pr(1, 'Ultrasonic distance display', 'Phase 2', 'both', 'Median filter and a moving-object flag, with the filter unit-tested on the host'),
  pr(1, 'I2C scanner from scratch', '3.2', 'both', 'Bit-banged, with the bus timing checked against your analyzer capture'),
  pr(1, 'MPU6050 tilt readout', '3.2', 'both', 'Your own register-level driver and a complementary filter'),
  pr(2, 'Multi-sensor SD logger with timestamps', 'Phase 3', 'S3', 'Survives power loss mid-write without corrupting the file'),
  pr(2, 'UART GPS or command shell', '3.1', 'both', 'Tab completion and history in under 2 KB of RAM'),
  pr(2, 'OLED dashboard', '3.2', 'both', 'Partial-update rendering; measure the bus time saved'),
  pr(2, 'Bit-banged 1-Wire thermometer', '3.5', 'both', 'Works with interrupts enabled; prove it with a jitter capture'),
  pr(2, 'Custom UART protocol with CRC', '3.1', 'both', 'Fuzz it from Python until it stops crashing'),
  pr(3, 'FreeRTOS weather and IMU station with MQTT', 'Phase 5', 'S3', 'Written timing budget, verified with tracing'),
  pr(3, 'BLE provisioning', '5.2', 'S3', 'A recovery path when the stored credentials are wrong'),
  pr(3, 'OTA with rollback', '5.9', 'S3', 'A self-test that decides whether to confirm the new image'),
  pr(3, 'Web-configured device', '5.6', 'S3', 'Works offline, served from LittleFS'),
  pr(3, 'ESP32-CAM streaming and snapshot server', 'Phase 5', 'CAM', 'Motion-triggered capture to SD with a ring of the last 20 frames'),
  pr(3, 'CAN node pair', '3.6', 'both, new', 'Inject errors until a node goes bus-off, then recover it'),
  pr(4, 'Edge-AI series, projects 1 to 4', 'Phase 9', 'S3, CAM', 'Your own dataset for each model'),
  pr(4, 'Low-power battery node', 'Phase 6', 'S3', 'Predicted vs measured battery life within 15%'),
  pr(4, 'Motor and encoder control loop (PID)', 'Phase 4', 'new', 'Step response plotted; tuned by a method you can explain'),
  pr(4, 'Audio recorder and player', '3.4', 'S3, new', 'Gapless recording to SD while Wi-Fi is active'),
  pr(5, 'Edge-AI sensor node with a KiCad PCB', 'Phase 9', 'S3', 'Design for a real constraint: size, cost or battery life'),
  pr(5, 'S3 camera person detector with secure boot, OTA and telemetry', 'Phase 9', 'new', 'Threat model written before the first line of code'),
  pr(5, 'ESP32 to Linux or Jetson gateway system', 'Phase 8', 'both, host', 'Three nodes, one gateway, and a documented failure-recovery test'),
];

// ---- Job-market sample (13 postings read as excerpts, November 2026; directional only) ----
export const jobSkills: { skill: string; count: number; refs: string[] }[] = [
  { skill: 'C or C++ on embedded targets', count: 11, refs: ['P1'] },
  { skill: 'RTOS (FreeRTOS or Zephyr)', count: 9, refs: ['P4'] },
  { skill: 'Embedded Linux, device drivers, device tree', count: 7, refs: ['P8'] },
  { skill: 'ARM architecture, Cortex-M or STM32', count: 6, refs: ['3.11', '9.11'] },
  { skill: 'I2C, SPI, UART by name', count: 5, refs: ['3.1', '3.2', '3.3'] },
  { skill: 'Debug tools: GDB, JTAG/SWD, scope, logic analyzer', count: 5, refs: ['0.7', '1.15', 'P7'] },
  { skill: 'CAN, Ethernet, USB or Modbus', count: 4, refs: ['3.6', '3.7', '3.8'] },
  { skill: 'Bootloader, bring-up, secure boot', count: 4, refs: ['1.7', '2.13', '5.9', '5.10'] },
  { skill: 'ML runtime: TFLite Micro, ONNX Runtime, TensorRT', count: 4, refs: ['9.5', '9.7', '9.11'] },
  { skill: 'Quantization, pruning, distillation', count: 3, refs: ['9.4', '9.6'] },
];
export const jobSampleSize = 13;
