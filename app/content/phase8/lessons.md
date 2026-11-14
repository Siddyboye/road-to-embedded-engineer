=== 8.1 | draft
@why
The roles at NVIDIA and Qualcomm in your sample are Linux work. The concepts under Linux are the ones you met in FreeRTOS, with one addition that changes everything: memory protection.
@need
A Linux machine or virtual machine. Phase 4. 4 hours.
@build
- [ ] Write a C program that forks; print the process IDs; change a variable in the child and show the parent’s is unchanged
- [ ] Do the same with two threads and show that the variable *is* shared
- [ ] Pass data between two processes three ways: a pipe, shared memory, a socket
- [ ] Protect the shared memory with a semaphore
- [ ] Watch a process’s memory map and its threads with the standard tools
@how
A **process** has its own virtual address space: it cannot see or corrupt another’s memory, and a crash kills only itself. A **thread** is a flow of execution inside a process, sharing its memory, which is what a FreeRTOS task is.

**Virtual memory** maps each process’s addresses to physical pages through the MMU. It gives isolation, lets programs be larger than RAM, and is why a wild pointer in Linux userspace raises a fault instead of corrupting the system.

Because processes are isolated they need **IPC** to cooperate: pipes, message queues, shared memory, sockets.

The kernel schedules threads much as FreeRTOS does, with more policies and, by default, fairness over strict priority.
@deep
- [ ] Map each FreeRTOS primitive you know to its Linux counterpart.
@when
| System | OS |
| --- | --- |
| Kilobytes of RAM, microsecond deadlines, milliwatts | RTOS |
| Rich software, many programs, networking stacks, GPUs | Linux |
@break
- [ ] Dereference NULL in one process and observe the other carrying on.
@check
1. What does a process have that a thread does not?
2. What does the MMU provide?
3. Why do processes need IPC?
@stretch
- Give a thread real-time priority and measure its wake-up latency.
@read
*Operating Systems: Three Easy Pieces*, free online: the chapters on processes and virtual memory.
@pit
- **Assuming Linux is real-time by default.**
- **Interview angle.** “Process versus thread?” and “what is virtual memory?”

=== 8.2 | draft
@why
An embedded Linux board boots through a chain much like the ESP32’s, with more stages and a file that describes the hardware.
@need
QEMU on your Linux machine. Lesson 1.7. 4 hours.
@build
- [ ] Boot a prebuilt kernel and root file system in QEMU for an ARM board
- [ ] Add U-Boot in front: stop at its prompt, print its environment, and boot the kernel by hand
- [ ] Find the kernel command line and change the console
- [ ] Decompile the device tree and locate the UART and memory nodes
- [ ] Read the kernel’s boot messages and match them to the stages
@how
| Stage | ESP32 | Embedded Linux |
| --- | --- | --- |
| Fixed in the chip | ROM bootloader | Boot ROM |
| Loader | Second-stage bootloader | U-Boot (often in two parts) |
| Hardware description | Compiled into the firmware | Device tree, a separate file |
| Main software | Your app with FreeRTOS | Kernel, then `init`, then programs |
| Storage layout | Partition table | Partitions and a root file system |

**U-Boot** initialises memory and storage, loads the kernel and the device tree, and passes control. The **device tree** tells one kernel binary which hardware it is on. The kernel then mounts the **root file system** and starts the first process.
@deep
- [ ] What would have to change to boot the same kernel on a different board?
@when
You meet this chain on every Linux-capable board: Raspberry Pi, Jetson, i.MX.
@break
- [ ] Give the kernel the wrong device tree and read where it stops.
@check
1. What does U-Boot do?
2. What is the device tree for?
3. What does the kernel start first?
@stretch
- Boot over the network with TFTP.
@read
Bootlin’s embedded Linux training slides: boot sequence and bootloaders.
@pit
- **Blaming the kernel for a device-tree mistake.**
- **Interview angle.** “Describe the boot process of an embedded Linux system.”

=== 8.3 | draft
@why
Embedded Linux is built, not installed: you choose every package and compile it for another processor.
@need
A Linux machine with 20 GB free. 5 hours, mostly waiting.
@build
- [ ] Cross-compile “hello” for ARM and run it in QEMU
- [ ] Build a minimal system with Buildroot for the QEMU ARM target; boot it
- [ ] Add your program and one library as packages; rebuild
- [ ] Measure the image size and the boot time
- [ ] Read a Yocto recipe and identify its fetch, configure, compile and install steps
@how
A **cross-compiler** runs on your computer and produces code for the target. A **build system** automates the whole stack: toolchain, kernel, libraries, programs, and the final image.

**Buildroot** is simple: one configuration, one image, rebuilt from scratch. **Yocto** is layered and far more flexible, used when several products share a base and packages need updates in the field; its learning curve is steep.
@deep
- [ ] Why can you not simply copy binaries from your desktop distribution?
@when
| Project | Use |
| --- | --- |
| One device, small team | Buildroot |
| Product family, vendor board-support layers, long maintenance | Yocto |
@break
- [ ] Run an x86 binary on the ARM target and read the error.
@check
1. What is cross-compiling?
2. What does a build system produce?
3. When is Yocto worth its complexity?
@stretch
- Shrink the image below 10 MB.
@read
The Buildroot manual’s first chapters. Bootlin’s Yocto training overview.
@pit
- **Hand-modifying the generated image instead of the build.**
- **Interview angle.** “Buildroot or Yocto?”

=== 8.4 | draft
@why
On Linux you can reach GPIO, I2C and SPI from an ordinary program. It is the quickest way to bring up a sensor on a Raspberry Pi or a Jetson.
@need
A Raspberry Pi or similar with your MPU6050. 3 hours.
@build
- [ ] Toggle a GPIO from the command line with the gpiod tools, then from C
- [ ] Scan the I2C bus and find the MPU6050
- [ ] Read its identity register from C through the i2c-dev interface
- [ ] Port the register logic of your ESP32 driver; only the bus functions change
- [ ] Measure the jitter of a 1 kHz toggle from userspace and compare with the ESP32
@how
The kernel exposes buses as device files. A program opens `/dev/i2c-1`, selects a device address and transfers bytes; the kernel’s bus driver does the signalling.

This is convenient and safe, and not real-time: your process can be descheduled at any moment, so microsecond timing is out of reach. That boundary is exactly why systems pair a Linux computer with a microcontroller.

If you kept your driver behind a HAL in lesson 1.12, the port is one file.
@deep
- [ ] Which of your Phase 3 drivers could not work from userspace, and why?
@when
| Access | From |
| --- | --- |
| Prototyping, slow sensors | Userspace |
| Shared by several programs, interrupts, timing | A kernel driver |
| Hard real-time | A microcontroller |
@break
- [ ] Run two programs that talk to the same sensor at once.
@check
1. How does a program reach an I2C device on Linux?
2. Why is userspace timing poor?
3. What made your driver portable?
@stretch
- Read the sensor from Python and plot it.
@read
The Linux kernel documentation for i2c-dev and the GPIO character device.
@pit
- **Bit-banging a timing-critical protocol from userspace.**
- **Interview angle.** “How would you interface a sensor to a Linux board?”

=== 8.5 | draft
@why
A device driver is code that runs inside the kernel. Writing the smallest one removes the mystery.
@need
QEMU or a Raspberry Pi with kernel headers. 4 hours.
@build
- [ ] Build and load a module that logs on load and unload; read the kernel log
- [ ] Add a character device: a file in `/dev` that returns a message when read
- [ ] Accept writes and store the last message
- [ ] Protect the buffer against two processes at once
- [ ] Crash the kernel deliberately in QEMU and read the report
@how
A **module** is code linked into the running kernel. It has an init and an exit function and no `main`.

A **character device** connects file operations (open, read, write, release) to your functions. A program calls `read`; the kernel calls yours.

Kernel code has no memory protection from itself: a wild pointer takes down the whole system. Data must be copied explicitly between user and kernel space, and anything shared needs locking, because several processes and interrupts can enter your driver at once.
@deep
- [ ] Compare this with an ESP-IDF driver: what does the kernel add, and what does it demand?
@when
Write a kernel driver when hardware must be shared safely between programs, needs interrupts, or fits an existing kernel subsystem.
@break
- [ ] Copy to a user pointer without the proper function and observe.
@check
1. What is a kernel module?
2. What does a character device map?
3. Why is a bug in a driver worse than a bug in a program?
@stretch
- Add an ioctl.
@read
*Linux Device Driver Development*, the character-device chapters.
@pit
- **Sleeping while holding a spinlock.**
- **Interview angle.** “What is a character device driver?”

=== 8.6 | draft
@why
This is what Linux driver work mostly is: a client driver for a chip on a bus, bound to the hardware by a device-tree node.
@need
A Raspberry Pi with the MPU6050. Lessons 3.2 and 8.5. 5 hours.
@build
- [ ] Write a device-tree overlay declaring your sensor on the I2C bus with a compatible string
- [ ] Write an I2C client driver whose probe function runs when the overlay is loaded; read the identity register there
- [ ] Expose acceleration through a file in sysfs
- [ ] Read it from a shell
- [ ] Find the kernel’s existing driver for the same chip and compare its structure with yours
@how
The kernel separates **bus drivers**, which know how to signal, from **client drivers**, which know a chip. The device tree says “a chip matching this name is at this address on this bus”; the kernel finds the driver claiming that name and calls its **probe** function.

Your driver then uses the kernel’s I2C functions, and offers its data through a standard interface. Real sensor drivers use the industrial I/O subsystem, so that every accelerometer looks the same to applications.

The register knowledge is the same as in lesson 3.2. Only the framework around it differs.
@deep
- [ ] What does the kernel’s driver handle that yours does not?
@when
Use an existing kernel driver when there is one. Write your own for new or custom hardware.
@break
- [ ] Mistype the compatible string and observe that probe never runs.
@check
1. What triggers a driver’s probe function?
2. What is a compatible string?
3. Why use a kernel subsystem instead of your own file?
@stretch
- Add interrupt support for the sensor’s data-ready pin.
@read
*Linux Device Driver Development*, the I2C client chapter. The kernel’s device-tree bindings documentation.
@pit
- **Hard-coding the bus and address in the driver.**
- **Interview angle.** “How does Linux match a driver to a device?”

=== 8.7 | draft
@why
Real systems pair microcontrollers at the edge with a Linux computer in the middle. Building one end to end is a capstone and a strong portfolio piece.
@need
Two or three ESP32 nodes, a Linux machine or Pi. Phases 5 and 6. 8 hours.
@build
- [ ] Run an MQTT broker on the Linux box
- [ ] Have each node publish sensor data and a status message with a last will
- [ ] Write a service that subscribes, stores readings in SQLite with timestamps, and survives a restart
- [ ] Add a small web page showing the latest values and which nodes are online
- [ ] Send a command from the page to a node
- [ ] Failure tests: kill the broker, unplug a node, fill the disk. Document what happens and what recovers
@how
The nodes are simple, low-power and unattended. The **gateway** has storage, a database, a user interface and a route to the internet. The contract between them is the topic structure and message format, which deserves a written specification with versions.

On a Jetson, the same gateway would also run the heavy models, using the nodes as its sensors: the split from your very first plan.
@deep
- [ ] Where should data be buffered when the link is down: node, gateway, or both?
@when
Split a system when the edge needs to be cheap, low-power or numerous, and the processing needs memory, storage or a GPU.
@break
- [ ] Change the message format on one node only.
@check
1. What belongs on the node and what on the gateway?
2. Why version the message format?
3. How does the gateway know a node has died?
@stretch
- Run a small anomaly detector on the gateway over the stored data.
@read
Your own design document for this system.
@pit
- **No plan for the link being down.**
- **Interview angle.** Present this as a system-design answer.
