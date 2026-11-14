=== 1.1 | draft
@why
“Where does this variable live?” decides whether it costs flash or RAM, whether it survives a function return, and whether an interrupt can safely touch it. It is also the first question in most embedded C interviews.
@need
Lessons 0.2 and 0.13. An S3 board. 60 minutes.
@build
Start with the model, then prove it on the chip.

::widget memory

- [ ] In the 0.1 project add one of each: a `const` array, an initialised global, an uninitialised global, a `static` local, an ordinary local, and a `malloc`
- [ ] Print the address of each with `%p`. Group the addresses: which are close together?
- [ ] Find each named symbol in the map file under `build/`
- [ ] Run the size report (`idf.py size-components`, or the PlatformIO size target) before and after adding a 10 KB `const` table, then a 10 KB zero-initialised array
@how
| Section | Holds | Lives in | Costs |
| --- | --- | --- | --- |
| `.text` | Code | Flash, executed through a cache | Flash |
| `.rodata` | `const` data, string literals | Flash | Flash |
| `.data` | Globals with a non-zero initial value | RAM, copied from flash at start-up | RAM and flash |
| `.bss` | Globals that start at zero | RAM, cleared at start-up | RAM only |
| Heap | `malloc` | RAM left over after the above | RAM, at run time |
| Stack | Locals, return addresses | One fixed block per task | RAM |

The linker assigns every symbol an address according to a linker script and writes the result to the map file. Start-up code then copies `.data` and zeroes `.bss` before your code runs, which is why globals have their values in `app_main`.
@deep
- [ ] Mark a function `IRAM_ATTR` and find where it moved. Why would an interrupt handler need to run from RAM?
- [ ] A `const` array without `static` at file scope, and one inside a function: do both end up in flash?
@when
| You have | Put it |
| --- | --- |
| A lookup table that never changes | `static const`, so it stays in flash |
| A large working buffer needed for the whole run | `static`, in `.bss`: allocated at link time, cannot fail |
| A buffer needed briefly, size known only at run time | Heap, with the failure handled |
| A large array inside a function | Not on the stack; make it `static` or allocate it |
@break
- [ ] Grow a zero-initialised array until the linker refuses. Read which memory region it names.
@check
1. Which section costs both flash and RAM?
2. Why does a zero-initialised global add nothing to the binary?
3. Where does a `static` local live, and for how long?
@stretch
- Write a script that lists the ten largest symbols from the map file.
@read
*Making Embedded Systems*, the chapter on memory. ESP-IDF guide: “Memory Types”.
@pit
- **Forgetting `const`.** A table without it is copied into RAM.
- **Interview angle.** “Walk through the memory layout of a C program.” Name the six regions, what goes in each and which are fixed at link time.

=== 1.2 | draft
@why
Every buffer, register, string and driver handle is reached through a pointer. Most crashes you will debug are a pointer that was wrong.
@need
A C compiler on your computer. 75 minutes.
@build
Compile each drill with `-Wall -Wextra -fsanitize=address,undefined`. Predict the output first.

```c
uint16_t a[4] = { 10, 20, 30, 40 };
uint16_t *p = a;
printf("%u %u\n", *(p + 2), (unsigned)((uint8_t *)(p + 1) - (uint8_t *)p));
```

- [ ] Explain why the second number is 2 and not 1
- [ ] Write `const uint8_t *p`, `uint8_t *const p` and `const uint8_t *const p`; try to modify the data and the pointer through each
- [ ] Write `size_t my_strlen(const char *s)` with pointer arithmetic only
- [ ] Pass a struct by value and by pointer; print `sizeof` of each parameter
@how
A pointer is an address with a type. The type tells the compiler how many bytes to read and how far `+ 1` moves: one element, not one byte. An array name used in an expression becomes a pointer to its first element, which is why a function receiving an array has lost its length and must be given it.

`const` reads right to left: `const uint8_t *p` is a pointer to bytes you may not change; `uint8_t *const p` is a pointer you may not move. A driver that only reads a buffer should say so in its signature.

`void *` is an address with no type: the universal handle for “context” arguments in callbacks. It must be cast back before use.
@deep
- [ ] `int (*fp)(int)` and `int *f(int)`: say each aloud in words.
- [ ] Why is `p[i]` identical to `*(p + i)`, and what does `i[p]` do?
@when
| Pass | When |
| --- | --- |
| By value | Small scalars |
| Pointer to `const` | Read-only access to anything larger |
| Pointer | The callee fills or modifies it; always with a length for buffers |
@break
```c
char *name(void) { char buf[16] = "sensor"; return buf; }
void fill(uint8_t *b) { for (int i = 0; i <= 8; i++) b[i] = 0; }   /* called with uint8_t b[8] */
```
- [ ] Run both under the sanitizer and read its report line by line.
@check
1. What does `p + 1` add to the address of a `uint32_t *`?
2. Which of the two `const` positions protects the data?
3. Why can a function not find the length of an array it was passed?
@stretch
- Implement `memcpy` and say what happens when the regions overlap.
@read
*Effective C*, “Objects, Functions and Types” and “Pointers”. K&R chapter 5.
@pit
- **Returning the address of a local.** It worked in testing because nothing had overwritten the stack yet.
- **Interview angle.** Declarations such as `const char *const *p` are asked to see whether you can read right to left.

=== 1.3 | draft
@why
`volatile` is the keyword that separates embedded C from the rest, and the one most often explained wrongly. The other three decide what goes in flash, what is visible, and what the optimiser may assume.
@need
Lesson 1.1. An S3 board. 60 minutes.
@build
A one-shot timer sets a flag after one second; the main code waits for it.

```c
static bool done;                       /* add volatile after you have seen it fail */
static void on_timer(void *arg) { done = true; }
/* in app_main, after starting a one-shot esp_timer for 1 s: */
while (!done) { }
printf("flag seen\n");
```

- [ ] Build with optimisation for size or speed and run it. Does “flag seen” appear?
- [ ] Add `volatile` and repeat
- [ ] Look at the disassembly of the loop in both builds, or reason about it: what did the compiler assume?
@how
**volatile** tells the compiler that a variable can change, or that reading and writing it has effects, outside the code it can see. Without it the compiler may read `done` once, see that the loop does not change it, and loop forever. Use it for hardware registers and for variables shared with an interrupt or another thread of control. It does not make an access atomic: `count++` on a `volatile` is still read, add, write.

**static** has two meanings. At file scope it hides a function or variable from other files, which is how C does “private”. Inside a function it gives a variable the lifetime of the program.

**const** promises you will not write through this name. For globals it also moves the data to flash.

**restrict** promises that a pointer is the only way to reach its data in this scope, letting the compiler skip reloads. Break the promise and the behaviour is undefined.
@deep
- [ ] `const volatile uint32_t *status_reg`: what does that combination mean, and when is it exactly right?
- [ ] Find where ESP-IDF’s `REG_READ` uses `volatile`.
@when
| Variable | Qualifier |
| --- | --- |
| Memory-mapped register | `volatile` |
| Flag set in an ISR, read in a task | `volatile`, and think about atomicity |
| File-private helper or state | `static` |
| Table of constants | `static const` |
@break
- [ ] A `volatile uint32_t ticks` is incremented in an interrupt and read in a task as two 16-bit halves. Describe the wrong value you could read.
@check
1. Does `volatile` make `x++` safe against interrupts?
2. What are the two meanings of `static`?
3. Why can removing `volatile` make a program hang only in release builds?
@stretch
- Replace the flag with a FreeRTOS task notification and compare CPU use while waiting.
@read
*Effective C* on type qualifiers. “Nine ways to break your systems code using volatile”, John Regehr, free online.
@pit
- **Sprinkling `volatile` to fix a race.** It hides the symptom at one optimisation level.
- **Interview angle.** “What does volatile mean and where would you use it?” Give the register and the ISR flag, then say what it does not do.

=== 1.4 | draft
@why
Sensor frames, protocol headers and register blocks are all structured bytes. Misjudge the layout and you read garbage that looks plausible.
@need
Lesson 1.2. A C compiler on your computer. 60 minutes.
@build
Reorder the fields until the struct is as small as it can be.

::widget struct

- [ ] Predict `sizeof` for the starting order, then check
- [ ] Find the order with no padding. What rule did you use?
- [ ] On your computer, print `sizeof` and `offsetof` for the same struct and compare with the lab
- [ ] Parse this 6-byte frame, big-endian on the wire: one byte of flags, a signed 16-bit temperature, a 24-bit counter
@how
The compiler places each member at an offset that suits the CPU: a 4-byte integer on a 4-byte boundary. It inserts padding to get there, and pads the end so that arrays of the struct stay aligned. You cannot see padding in the source; you see it in `sizeof`.

`__attribute__((packed))` removes padding. It also makes every access to a misaligned member slower and, on some CPUs, a fault. Use it for a wire format only when you also control byte order, and never take the address of a packed member.

**Bitfields** look ideal for registers and are not: which end the first field goes to, and how fields straddle bytes, is left to the compiler. Masks and shifts from lesson 0.11 are portable; bitfields are not.

**Unions** overlay several types on the same bytes. They are useful for a tagged variant, and a trap for type-punning across byte orders.

The portable way to read a wire frame is byte by byte:

```c
int16_t temp = (int16_t)((uint16_t)buf[1] << 8 | buf[2]);
uint32_t count = (uint32_t)buf[3] << 16 | (uint32_t)buf[4] << 8 | buf[5];
```
@deep
- [ ] Why does the cast to `uint16_t` come before the shift in the first line? Lesson 1.5 explains.
- [ ] Write the matching `encode` function and round-trip a thousand random values in a host test.
@when
| Task | Use |
| --- | --- |
| In-memory record | Plain struct, largest members first |
| Bytes on a wire or in flash | Explicit encode and decode functions |
| Hardware register fields | Masks and shifts |
| A value that is one of several types | A struct with a tag and a union |
@break
- [ ] Cast a `uint8_t *` buffer at an odd address to a `uint32_t *` and read through it under the undefined-behaviour sanitizer.
@check
1. Why is `struct { char a; int b; char c; }` 12 bytes?
2. Give two reasons not to describe a register with a bitfield.
3. What does packing a struct cost?
@stretch
- Add `_Static_assert(sizeof(frame_t) == 6, "frame size")` to a packed struct and see when it fires.
@read
*Effective C* on structures and alignment. “The Lost Art of Structure Packing”, Eric Raymond, free online.
@pit
- **Sending a struct over a wire with `memcpy`.** Padding and byte order differ on the other end.
- **Interview angle.** “What is `sizeof` this struct, and how would you shrink it?”

=== 1.5 | draft
@why
C quietly converts small integers to `int` and signed to unsigned. The rules are short, and not knowing them produces bugs that pass every test on your computer and fail on the device.
@need
Lesson 0.11. A C compiler on your computer. 60 minutes.
@build
Predict each result, then compile with `-Wall -Wextra -Wconversion` and read every warning.

```c
uint8_t a = 200, b = 100;      printf("%d\n", a + b);            /* 1 */
uint8_t m = 0x0F;              printf("%d\n", ~m == 0xF0);       /* 2 */
int i = -1; unsigned u = 1;    printf("%d\n", i < u);            /* 3 */
uint16_t x = 0xFFFF;           printf("%d\n", x << 8 >> 8 == x); /* 4 */
size_t len = 0;                printf("%d\n", len - 1 > 0);      /* 5 */
```

- [ ] Explain all five in one sentence each
- [ ] Fix each so that it does what the author meant
@how
**Promotion.** In an expression, anything narrower than `int` becomes `int` first. So `a + b` above is 300, not 44, and `~m` is a 32-bit value with the top 24 bits set.

**The usual arithmetic conversions.** When signed meets unsigned of the same width, the signed value is converted to unsigned: −1 becomes a very large number, and `i < u` is false.

**Overflow.** Unsigned arithmetic wraps and is defined. Signed overflow is undefined behaviour: the compiler may assume it never happens and delete your check for it.

**Undefined behaviour** is not “whatever the CPU does”. It licenses the compiler to produce anything, and what it produces changes with the optimisation level. The common ones: signed overflow, shifting by the width or more, reading uninitialised locals, out-of-bounds access, dividing by zero.

The reference CRC in `firmware/host/crc8.c` would not compile under `-Wconversion` until its shift said which type it meant. Read that function and the comment in it.
@deep
- [ ] `uint16_t a = 60000, b = 60000; uint32_t c = a * b;` Why is this undefined on a 32-bit `int`, and how do you write it correctly?
- [ ] Is plain `char` signed? Print `(char)0x80 < 0` on your computer; the answer differs between architectures.
@when
| Quantity | Type |
| --- | --- |
| Sizes, counts, indices | `size_t` or an unsigned fixed-width type |
| Bit patterns, registers | `uint8_t` to `uint32_t`, with `u` on constants |
| Signed measurements | `int16_t`, `int32_t` |
| Anything on a wire or in a file | Fixed-width types only; never `int` or `long` |
@break
- [ ] `for (uint8_t i = 0; i < 300; i++)`: what happens, and which warning tells you?
@check
1. What type is `a + b` when both are `uint8_t`?
2. Why is `-1 < 1u` false?
3. Name three kinds of undefined behaviour.
@stretch
- Turn on `-fsanitize=undefined` and trigger four different reports deliberately.
@read
*Effective C*, “Arithmetic Types”. “A Guide to Undefined Behavior in C and C++”, John Regehr.
@pit
- **Comparing a `size_t` with a negative number.** Always false, or always true.
- **Interview angle.** Snippet 3 above is a favourite. Say “the int is converted to unsigned” without hesitating.

=== 1.6 | draft
@why
A driver that can be swapped for a fake is a driver you can test without hardware and port to another chip. Function pointers and opaque handles are how C does interfaces.
@need
Lessons 1.2 and 1.3. 75 minutes.
@build
Define an interface for “something that measures distance”, then give it two implementations.

```c
/* range.h */
typedef struct range_sensor range_sensor_t;            /* opaque: users never see inside */
typedef struct {
    esp_err_t (*read_mm)(range_sensor_t *self, int *mm);
} range_ops_t;
struct range_sensor { const range_ops_t *ops; void *ctx; };
static inline esp_err_t range_read_mm(range_sensor_t *s, int *mm) { return s->ops->read_mm(s, mm); }
```

- [ ] Write `fake_range.c`: returns values from an array you set in a test
- [ ] Write `hcsr04_range.c`: the real sensor, behind the same four lines
- [ ] Write one function, `bool is_close(range_sensor_t *s)`, and call it with both
- [ ] On the host, substitute `int` for `esp_err_t` and test `is_close` with the fake
@how
A **function pointer** holds the address of code. A struct of them is a table of operations: C’s version of a virtual method table. The caller knows the table’s shape and nothing about what is behind it.

A **callback** is a function pointer you hand to someone else to call later. Always pair it with a `void *` context argument, so one function can serve several instances without globals.

An **opaque handle** is a pointer to a struct whose definition is hidden in the `.c` file. Users can hold it and pass it back; they cannot depend on its contents, so you can change them. ESP-IDF’s `i2c_master_bus_handle_t` and `esp_timer_handle_t` are exactly this.

**Header hygiene.** A header declares; a source file defines. Include guards on every header. A header includes what it needs and nothing else. Nothing in a header allocates storage except `static inline` functions and `extern` declarations.
@deep
- [ ] Make the ops table `static const`. Where does it live, and what did that save?
- [ ] What breaks if `struct range_sensor` is fully hidden and users want one on the stack? Name two ways libraries solve it.
@when
| Need | Use |
| --- | --- |
| One implementation, forever | A plain function; no indirection |
| Hardware and a test fake | An ops table |
| “Call me when it happens” | Callback with context pointer |
| Hide implementation details | Opaque handle |
@break
- [ ] Register a callback, then let the object it uses as context go out of scope. Run on the host under the address sanitizer.
@check
1. Why does a callback need a context argument?
2. What can a user do with an opaque handle, and what can they not?
3. What belongs in a header and what does not?
@stretch
- Add a second operation, `set_timeout`, without breaking code compiled against the old table.
@read
*Fluent C* on interfaces and handles. *Making Embedded Systems* on driver interfaces.
@pit
- **Calling through a NULL function pointer.** Check at registration, not at every call.
- **Interview angle.** “How do you do polymorphism in C?” Draw the ops table.

=== 1.7 | draft
@why
OTA updates, factory data, file systems and “why is my app too big” are all partition-table questions. And when a device will not start, the boot stages tell you how far it got.
@need
Lessons 0.1 and 1.1. An S3 board. 60 minutes.
@build
Design a layout before touching the board.

::widget memory

- [ ] In the lab, start from “single app” and add a 1 MB data partition named `storage`. Fix whatever it complains about
- [ ] Save the CSV as `partitions.csv` in a copy of the 0.1 project and select “Custom partition table CSV” in the configuration menu
- [ ] Flash, and find your table in the second-stage bootloader’s log
- [ ] Record the offset and size of the app, and compare the size with the size report

::widget boot
@how
Flash is one long array of bytes. By convention the bootloader sits at the start, the **partition table** at offset 0x8000, and everything after is whatever the table says: NVS for settings, a PHY calibration blob, one or more application slots, file systems.

The second-stage bootloader reads the table, picks an app slot (the `otadata` partition records which one when there are several), verifies the image and maps its segments. An app image is a header followed by segments, each with a load address: some are mapped from flash, some copied to RAM.

Application partitions must start on a 64 KB boundary because of how flash is mapped into the address space. Data partitions need not.

**Linker fragments.** ESP-IDF builds its linker script from small fragment files. That is the mechanism behind `IRAM_ATTR`: a rule that places a function in a RAM section. You will rarely write one, but knowing they exist explains where “this function must be in IRAM” errors come from.
@deep
- [ ] Switch to the “factory plus two OTA slots” layout on a 16 MB flash. How large can each slot be while leaving 4 MB for files?
- [ ] What decides whether the bootloader runs `factory`, `ota_0` or `ota_1`?
@when
| Product needs | Layout |
| --- | --- |
| No field updates | Single factory app |
| Updates over the air | Two OTA slots and `otadata`; optionally a factory fallback |
| User files or logs | A LittleFS or FAT data partition |
| Crash diagnostics | A `coredump` partition (lesson 6.4) |
@break
- [ ] Make two partitions overlap in the CSV and build. Read the error.
- [ ] Shrink the app partition below the image size and build.
@check
1. At what offset does the partition table sit by default?
2. Why must app partitions be 64 KB aligned?
3. Which stage decides which app to boot?
@stretch
- Read the partition table at run time with the `esp_partition` API and print it.
@read
ESP-IDF guide: “Partition Tables”, “Bootloader”, “Application Startup Flow”.
@pit
- **Changing the table on a deployed device.** Existing data sits at the old offsets.
- **Interview angle.** “Describe the boot sequence of a microcontroller you have used.”

=== 1.8 | draft
@why
A UART interrupt receives bytes faster than a task reads them. The structure between the two is a ring buffer, and it is in every serial driver ever written. It is also a perfect first exercise in test-driven development.
@need
Lessons 1.2 and 1.5. A C compiler on your computer. 90 minutes.
@build
Learn the behaviour first, then write it test-first.

::widget ring

- [ ] In the lab: fill it, try one more put, empty it, try one more get. Note what happens to head and tail
- [ ] Write the tests before the code, for this interface:

```c
bool   rb_init(ringbuf_t *rb, uint8_t *storage, size_t capacity);   /* capacity: a power of two */
bool   rb_put(ringbuf_t *rb, uint8_t byte);                         /* false when full  */
bool   rb_get(ringbuf_t *rb, uint8_t *byte);                        /* false when empty */
size_t rb_count(const ringbuf_t *rb);
```

- [ ] Tests to write: empty get fails; fill to capacity; put on full fails and loses nothing; bytes come out in order; correct after the indices wrap
- [ ] Make them pass, compiling with `-Wall -Wextra -Werror -Wconversion` and the sanitizers
- [ ] Only then compare with the reference in `firmware/host/ringbuf.c`
@how
Storage is a fixed array. Two indices chase each other around it: the producer writes at **head**, the consumer reads at **tail**. The buffer is empty when they are equal.

“Full” is the design choice. Either leave one slot unused so that full and empty look different, or let both indices count freely and mask them only when indexing the array. The reference does the second: `count = head − tail` is correct even when the counters wrap, because unsigned subtraction wraps too, and every slot is usable. The capacity must then be a power of two so the mask works.

With exactly one producer and one consumer, no lock is needed: each side writes only its own index, and the producer publishes a byte by advancing head only after storing it. That is what makes it safe between an interrupt and a task.
@deep
- [ ] What goes wrong with two producers? Describe the interleaving.
- [ ] When the buffer is full, should a UART driver drop the newest byte or the oldest? Argue both.
@when
| Situation | Use |
| --- | --- |
| Bytes from an ISR to a task | Ring buffer |
| Whole messages between tasks | A FreeRTOS queue (lesson 4.4) |
| Several writers | A queue, or a lock around the buffer |
@break
- [ ] Change the capacity check to accept 6 and run your wrap-around test.
@check
1. How do you tell full from empty?
2. Why a power-of-two capacity?
3. Why is no lock needed with one producer and one consumer?
@stretch
- Add `rb_write` and `rb_read` for blocks, copying in at most two `memcpy` calls.
@read
*Test-Driven Development for Embedded C*, chapters 1 to 4. *Making Embedded Systems* on circular buffers.
@pit
- **Off-by-one at the wrap.** Test with indices near the maximum, as the reference tests do.
- **Interview angle.** “Implement a circular buffer” is asked constantly. State the full-versus-empty choice before writing a line.

=== 1.9 | draft
@why
Firmware waits for things: a button, a byte, a timeout. Code that tracks “where am I?” with scattered flags becomes unmaintainable within weeks. A state machine makes the waiting explicit, drawable and testable.
@need
Lessons 0.7 and 1.6. 90 minutes.
@build
Design it before you code it.

::widget fsm

- [ ] In the designer, send the events for a click, then for a long press. Follow the highlighted state
- [ ] Add a double-click: a second press within a time window. Which states and events did you need?
- [ ] Take the generated table and implement the actions on the board with a button on GPIO5
- [ ] Feed the same table a recorded event sequence in a host test, with no hardware
@how
A state machine has a finite set of **states**, a set of **events**, and for each pair a **transition**: the next state and an action. Only one state is current. Everything the system must remember between events is in which state it is in.

**Switch-based:** an outer `switch` on state and an inner one on event. Easy to start, hard to review at twenty states.

**Table-driven:** a two-dimensional array indexed by state and event. Every pair is visible, including the ones you forgot, and the dispatcher is four lines. Time is just another event: a timer posts `TIMEOUT`.

**Hierarchical:** states nested inside states, so common behaviour such as “any state, on ERROR, go to FAULT” is written once.

The frame parser in `firmware/host/frame.c` is a four-state machine driven by one event, “a byte arrived”. Read it: it cannot block, it resynchronises after garbage, and it is tested without a serial port.
@deep
- [ ] Draw the state machine for a traffic light with a pedestrian button and a fault mode. Count the pairs you would have forgotten.
- [ ] Where should debouncing live: inside this machine, or in a separate one that feeds it clean events?
@when
| Behaviour | Model |
| --- | --- |
| Reacts to events over time, with modes | State machine |
| A straight sequence with waits | A task with blocking calls may be simpler (Phase 4) |
| Parsing a byte stream | State machine, fed one byte at a time |
@break
- [ ] Remove the `RELEASE` transition from the `HELD` state and use the designer to find the stuck state.
@check
1. What must a state machine remember besides its current state?
2. What does the table form reveal that the switch form hides?
3. How does a timeout enter a state machine?
@stretch
- Add entry and exit actions to the dispatcher.
@read
*Making Embedded Systems* on state machines. *Fluent C* for the table pattern.
@pit
- **Doing long work inside an action.** Actions should be short; long work is another state.
- **Interview angle.** “Design the firmware for a button with click, double-click and hold.” Draw states first.

=== 1.10 | draft
@why
A device that runs for a year allocates and frees millions of times. The heap that passed every bench test fails in month three with half its memory free. Knowing why is what separates prototype firmware from product firmware.
@need
Lesson 1.1. An S3 board. 60 minutes.
@build
::widget heap

- [ ] In the lab: allocate 2 blocks ten times, free every other one, then ask for 4. Read the failure message
- [ ] On the board, print `heap_caps_get_free_size(MALLOC_CAP_DEFAULT)` and `heap_caps_get_largest_free_block(MALLOC_CAP_DEFAULT)` once a second
- [ ] Allocate 200 blocks of random sizes, free every second one, and watch the two numbers diverge
- [ ] Allocate one buffer with `MALLOC_CAP_SPIRAM` and one with `MALLOC_CAP_INTERNAL`; print both addresses
@how
The heap is the RAM left after `.data`, `.bss` and the stacks. `malloc` finds a free region large enough; `free` returns it. After many cycles the free memory is scattered in pieces, and a request can fail although the total is ample. That is **fragmentation**, and it grows with uptime.

On your S3 there are several heaps. Internal RAM is fast and scarce. PSRAM is 8 MB and slower. Some buffers must come from memory a peripheral’s DMA can reach. `heap_caps_malloc(size, caps)` lets you say which you need; plain `malloc` chooses for you by a size threshold.

The defences, in order of strength: allocate nothing after start-up; use **static pools** of fixed-size blocks, which cannot fragment; allocate only at start-up and never free; if you must allocate at run time, check every result and watch `heap_caps_get_minimum_free_size`, the low-water mark since boot.
@deep
- [ ] Write a pool of sixteen 64-byte blocks with `pool_alloc` and `pool_free`. What is the worst-case time of each?
- [ ] Why is a pool immune to fragmentation?
@when
| Data | Allocate |
| --- | --- |
| Fixed at design time | Statically |
| Many objects of one size, created and destroyed | A static pool |
| A large buffer sized at start-up | Heap, once, never freed |
| Camera frames, model tensors | PSRAM, by capability |
@break
- [ ] Ignore a `NULL` return and write through it. Read the panic and find the faulting address in it.
@check
1. Why can `malloc` fail with free memory available?
2. Name two capabilities you can request with `heap_caps_malloc`.
3. What does the minimum-free-size figure tell you that the current figure does not?
@stretch
- Enable heap tracing and find a deliberate leak; lesson 7.4 does this in depth.
@read
ESP-IDF guide: “Heap Memory Allocation” and “Heap Memory Debugging”. *Making Embedded Systems* on memory.
@pit
- **`malloc` in a loop that runs for ever.** Ask what happens on the ten-millionth pass.
- **Interview angle.** “Why do some coding standards forbid dynamic allocation?” Fragmentation, unbounded time, and failure handling at every call site.

=== 1.11 | draft
@why
Every task has its own small, fixed stack. Overflow it and you corrupt whatever sits next to it, and the crash appears somewhere unrelated, later. Sizing stacks from measurement is a routine professional task.
@need
Lesson 1.1. An S3 board. 45 minutes.
@build
- [ ] Print `uxTaskGetStackHighWaterMark(NULL)` at the start of `app_main`, and again after a `printf` with several format arguments. How much did one `printf` use?
- [ ] Declare `uint8_t big[4096];` inside `app_main`, touch every byte, and run. Read the whole panic output
- [ ] Find the main task’s stack size in the configuration menu and relate it to what you saw
- [ ] Replace the local with a `static` array and confirm the overflow is gone
@how
A stack holds each active function’s locals, saved registers and return address. It grows on every call and shrinks on return. In FreeRTOS each task gets a block of a size fixed when the task is created; in ESP-IDF that size is given in bytes.

The **high-water mark** is the smallest amount of stack that has ever been free. It is the number to size from: run the worst case, read the mark, add a margin.

ESP-IDF can detect overflow in two ways: by checking a known pattern at the end of the stack at each context switch, and with a hardware watchpoint on the last bytes. Both report the task’s name. Neither catches an overflow that jumps clean over the guard, which a large local array can do.

What uses stack unexpectedly: `printf` and its relatives, large local arrays and structs, deep call chains, recursion, and anything called from a callback that runs on someone else’s small stack.
@deep
- [ ] Interrupt handlers run on a separate stack. Why does that matter for how much each task must reserve?
- [ ] Estimate, then measure, the stack used by a function that calls `snprintf` with a 256-byte local buffer.
@when
| Size a task’s stack | By |
| --- | --- |
| First guess | 2 to 4 KB for simple tasks; more if it prints or uses TLS or JSON |
| Final value | Worst-case high-water mark plus 25 to 50% |
@break
- [ ] Write a recursive function with no end condition and compare its panic with the large-array one.
@check
1. What does the high-water mark measure?
2. Name three things that use more stack than they appear to.
3. Why might an overflow not be detected?
@stretch
- Print the high-water mark of every task with the run-time stats API.
@read
ESP-IDF guide: “FreeRTOS (IDF)” on task stacks, and “Fatal Errors”.
@pit
- **Sizing by guesswork.** Too small crashes; too large wastes the scarcest RAM.
- **Interview angle.** “How would you size a task’s stack?” Measurement under worst case, plus margin, plus overflow detection left on.

=== 1.12 | draft
@why
Postings ask for STM32 while you learn on an ESP32. Code that keeps hardware access behind a thin boundary moves between them in a day and can be tested on a laptop. Code that does not gets rewritten.
@need
Lessons 1.6 and 1.9; your ultrasonic code from Phase 0. 90 minutes.
@build
Split the ultrasonic ranger into three layers.

| Layer | File | May include |
| --- | --- | --- |
| Application | `app_main.c` | Driver headers |
| Driver | `hcsr04.c` | Your HAL header only |
| HAL | `hal_esp32.c`, `hal_fake.c` | Chip headers |

- [ ] Define the HAL the driver needs and nothing more: set a pin, read a pin, read microseconds, wait microseconds
- [ ] Rewrite `hcsr04.c` so that it includes no ESP-IDF header
- [ ] Write `hal_fake.c` that plays back a scripted echo, and test the driver on your computer, including the timeout
- [ ] Count the lines that would change to move to an STM32
@how
**Dependencies point downward.** The application knows the driver, the driver knows the HAL interface, and only the HAL implementation knows the chip. Nothing below knows what is above it.

A **HAL** is not a wrapper around every vendor function. It is the smallest set of operations your drivers need. Four functions is a good HAL; four hundred is a second SDK.

Two patterns recur above the driver. **Observer:** a module keeps a list of callbacks and notifies them of an event, so a sensor does not need to know about the display or the logger. **Command:** a table mapping names to handler functions, which is how every serial shell works and why adding a command is one line.
@deep
- [ ] The driver needs to wait for an edge with a timeout. Should the HAL expose “wait for edge”, or should the driver poll “read pin” and “read time”? What does each cost in portability and in precision?
- [ ] Implement a three-command shell with a table: name, help text, handler.
@when
| Project | Layering |
| --- | --- |
| A weekend experiment | None; write it straight |
| Anything you will keep, test or port | Driver behind a HAL |
| A product family on several chips | HAL per chip, shared drivers and application |
@break
- [ ] Add an `#include "driver/gpio.h"` to the driver “just for one constant” and try to build the host tests.
@check
1. Which direction may dependencies point?
2. How do you decide what goes in a HAL?
3. What does a command table replace?
@stretch
- Add a second HAL implementation for the classic ESP32’s different pin numbers without touching the driver.
@read
*Making Embedded Systems*, “Creating a System Architecture”. *Test-Driven Development for Embedded C* on dual targeting.
@pit
- **A HAL that mirrors the vendor API.** It abstracts nothing.
- **Interview angle.** “How would you structure firmware to support two different microcontrollers?”

=== 1.13 | draft
@why
The cheapest bug is the one the compiler finds. The next cheapest is found by a tool in seconds. This lesson sets up the net that catches mistakes before they reach a board.
@need
Your Phase 0 and Phase 1 code. A computer with gcc or clang. 75 minutes.
@build
- [ ] Compile the host code with `-Wall -Wextra -Werror -Wconversion -Wshadow`. Fix every warning without casting it away blindly
- [ ] Run `cppcheck --enable=warning,style,performance` on it and read each finding
- [ ] Build the tests with `-fsanitize=address,undefined` and make one test read past a buffer
- [ ] In one firmware function, replace three unchecked calls with checked ones:

```c
esp_err_t err = gpio_config(&cfg);
if (err != ESP_OK) {
    ESP_LOGE(TAG, "gpio_config failed: %s", esp_err_to_name(err));
    return err;
}
```
@how
**Errors versus bugs.** A sensor that does not answer is an *error*: expected, handled, reported upward with a return code. A NULL pointer where the contract forbids one is a *bug*: `assert`, stop, fix the code. Mixing them up gives firmware that either crashes on a loose wire or carries on with corrupt state.

**Return codes.** ESP-IDF functions return `esp_err_t`. `ESP_ERROR_CHECK` aborts on failure, which is right at start-up and wrong in a running product. Propagate errors to the layer that can do something about them.

**Warnings as errors.** A warning ignored today hides the important one tomorrow. `-Wconversion` is noisy and worth it: it found a real promotion issue in the reference CRC.

**Static analysis** reads code without running it; **sanitizers** instrument a running host build and catch memory and undefined-behaviour faults at the exact line.

**MISRA C** is a rule set used in automotive and medical work: no dynamic memory after start-up, no recursion, explicit conversions, one exit point by preference. You do not need to follow it now. You need to know it exists and why each rule is there.
@deep
- [ ] Write a function that acquires three resources and can fail at each step. Structure the clean-up so nothing leaks on any path.
- [ ] Pick five MISRA rules and name the bug each one prevents.
@when
| Tool | Catches | Run it |
| --- | --- | --- |
| Compiler warnings | Suspicious constructs | Every build |
| cppcheck, clang-tidy | Patterns across a file | Every commit, in CI |
| Sanitizers | Real memory and UB faults | Every host test run |
| Code review | Design and intent | Every merge |
@break
- [ ] Silence a `-Wconversion` warning with a cast that is actually wrong, and write a test that exposes it.
@check
1. When is `assert` right and when is an error code right?
2. What can a sanitizer find that static analysis cannot?
3. Why is `ESP_ERROR_CHECK` dangerous in steady-state code?
@stretch
- Add all three tools to a GitHub Actions workflow.
@read
*Effective C*, “Debugging, Testing and Analysis”. ESP-IDF guide: “Error Handling”.
@pit
- **Ignoring return values.** The failure surfaces three calls later, looking like something else.
- **Interview angle.** “How do you ensure code quality in C?” Name layers: warnings, analysis, tests, review.

=== 1.14 | draft
@why
Flashing a board to test a parser takes a minute; a host test takes a second. Engineers who test on the host iterate sixty times faster on everything that is not hardware, and postings list unit testing as a requirement.
@need
Lessons 1.8 and 1.12. A C compiler on your computer. 90 minutes.
@build
Write the parser for the course’s serial frame, test-first.

::widget crc

Frame: `0x7E`, a length from 1 to 32, that many payload bytes, then a CRC-8 over the length and payload.

- [ ] Write a failing test: a valid frame fed one byte at a time ends with `FRAME_OK`
- [ ] Write the least code that passes it. Then the next test: junk before the start byte; a wrong CRC; a length of zero; recovery after a bad frame
- [ ] Run `make test` in `firmware/host` and read `test_all.c`. Compare its cases with yours
- [ ] Install Unity and port the tests to `TEST_ASSERT_EQUAL` and a test runner
@how
**Red, green, refactor.** Write a test that fails. Write the least code that passes. Clean up with the tests as a safety net. The discipline is in the first step: a test you never saw fail proves nothing.

**Dual targeting.** Code with no hardware dependency compiles for your computer and for the chip. Lesson 1.12 made that possible; this lesson uses it.

**Test doubles.** A *stub* returns canned answers. A *fake* is a working stand-in, such as a fake HAL with a scripted pin. A *mock* also checks that it was called as expected. A *spy* records calls for you to inspect.

**Unity** is a small C test framework: assertion macros and a runner. **CMock** reads a header and generates mocks for it. ESP-IDF ships Unity as a component for tests that must run on the chip.

Test behaviour, not implementation: “a frame with a bad CRC is rejected and the next good one is accepted” survives a rewrite. “The state variable equals 3” does not.
@deep
- [ ] Which parts of your Phase 0 firmware could be host-tested today, and what stops the rest?
- [ ] Add a test that feeds ten thousand random bytes and asserts the parser never reads outside its buffer, under the sanitizer.
@when
| Code | Test it |
| --- | --- |
| Parsers, filters, state machines, protocols, maths | On the host, always |
| Drivers | On the host against a fake HAL, then on the chip |
| Timing, interrupts, power | On the chip, with instruments |
@break
- [ ] Introduce an off-by-one in the length check and see which of your tests catches it. If none does, write the one that would.
@check
1. Why must you see a test fail first?
2. What is the difference between a fake and a mock?
3. What makes a piece of firmware host-testable?
@stretch
- Measure line coverage with `gcov` and find an untested branch.
@read
*Test-Driven Development for Embedded C*, chapters 1 to 9.
@pit
- **Testing only the happy path.** The bugs are in the error handling.
- **Interview angle.** “How do you unit-test code that talks to hardware?” Layering, a fake HAL, and what is left for on-target tests.

=== 1.15 | draft
@why
`printf` tells you what you thought to ask. A debugger lets you stop the processor and look. On your S3 it needs nothing but the USB cable you already have.
@need
An S3 board connected through its native USB port. Lesson 1.1. 60 minutes.
@build
- [ ] Connect the board’s USB port (not the UART one) and build the 0.1 project
- [ ] Start a session. ESP-IDF: `idf.py openocd` in one terminal and `idf.py gdb` in another. PlatformIO: add `debug_tool = esp-builtin` to the environment and start debugging from the IDE
- [ ] `break app_main`, then `continue`. Step with `next` and `step`
- [ ] `print tick`, then `watch tick` and `continue`
- [ ] `backtrace`, `info threads`, `info registers`
- [ ] Read the GPIO output register directly: `x/1xw` followed by the address you found in lesson 0.13
@how
**JTAG** is a set of pins that lets an external tool halt the CPU, read and write memory and registers, and set breakpoints. On the ESP32-S3 a USB-to-JTAG bridge is built into the chip, so the “probe” is the USB port. On the classic ESP32 you need an external adapter wired to four pins.

Three programs cooperate. **OpenOCD** speaks JTAG to the chip. **GDB** speaks to OpenOCD and to you. Your editor, if you use one, drives GDB.

A **breakpoint** stops when execution reaches an address; code in flash uses the chip’s few hardware breakpoints. A **watchpoint** stops when a memory location is written, which finds “who is corrupting this variable” in minutes.

Halting the CPU halts everything, including the radio stack and the watchdog feeding, so timing-sensitive code behaves differently under a debugger. For those cases you still use logs and the logic analyzer.
@deep
- [ ] Set a breakpoint with a condition: stop only when `tick == 5`.
- [ ] Change a variable’s value from the debugger and resume.
- [ ] Why are hardware breakpoints limited in number, and what happens when you set too many?
@when
| Problem | Reach for |
| --- | --- |
| Wrong value, wrong branch, corrupted variable | Debugger: breakpoint or watchpoint |
| Crash with a backtrace | Decode the backtrace first; debugger second |
| Timing, races, bus traffic | Logic analyzer and logs |
| A device you cannot attach to | Core dumps (lesson 6.4) |
@break
- [ ] Build with heavy optimisation and try to print a local. Explain “optimized out”, then find the option that fixes it for debugging.
@check
1. What does a watchpoint do that a breakpoint cannot?
2. Why does the S3 need no external probe?
3. Name a bug a debugger is poor at finding.
@stretch
- Inspect a FreeRTOS task’s stack from GDB and find its return addresses.
@read
ESP-IDF guide: “JTAG Debugging” for the ESP32-S3.
@pit
- **Debugging through the wrong USB port.** JTAG is on the native port.
- **Interview angle.** “What tools do you use to debug firmware?” Order them by what each is good for.

=== 1.16 | draft
@why
C is required and C++ is in most postings as “recommended”; Python is how firmware teams test, script and analyse. You need a working subset of each, not mastery.
@need
Your UART shell from the mini-project. Python 3 on your computer. 75 minutes.
@build
- [ ] Install `pyserial` and write a script that opens the port, sends `help` and prints the reply
- [ ] Extend it: send each command, compare the reply with an expected pattern, print pass or fail
- [ ] Rename one firmware file to `.cpp`, declare the entry point as `extern "C" void app_main(void)`, and build
- [ ] Wrap the LED in a small class whose constructor configures the pin and whose destructor turns it off

```python
import serial
with serial.Serial("PORT", 115200, timeout=1) as port:
    port.write(b"help\n")
    print(port.read_until(b"> ").decode(errors="replace"))
```
@how
**C++ that suits firmware.** Classes with constructors and destructors give you RAII: a lock or a pin released automatically on every exit path. `constexpr` computes tables at compile time. `enum class` and references remove whole classes of mistakes. Templates give type-safe containers with no run-time cost.

**C++ to avoid or switch off.** Exceptions and run-time type information add size and unpredictable timing; most embedded builds disable both. Standard containers that allocate hide heap use; `std::array` is fine, `std::vector` and `std::string` need a deliberate decision.

**The boundary.** C++ changes function names to encode their types. `extern "C"` turns that off for one declaration, so C code and the framework can find it.

**Python on the host.** Serial drivers with `pyserial`, log parsing, plotting with `matplotlib`, and later `pytest` to run the same checks on every commit. The script you wrote above is the seed of a hardware-in-the-loop test.
@deep
- [ ] Compare the binary size of the C and C++ versions of the same blink. Where did any difference come from?
- [ ] Make the Python script exit with a non-zero status on failure, so a CI job can use it.
@when
| Task | Language |
| --- | --- |
| Drivers, ISRs, anything shared with a vendor SDK | C |
| Application structure with many objects and lifetimes | The C++ subset |
| Test scripts, tools, data analysis, training models | Python |
@break
- [ ] Throw a C++ exception in a build where they are disabled and read the result.
@check
1. What does RAII guarantee?
2. Why is `extern "C"` needed on `app_main`?
3. Name two C++ features commonly disabled in firmware and why.
@stretch
- Plot a logged sensor value live from the serial port.
@read
*Making Embedded Systems* on languages for embedded work. The pyserial documentation’s short introduction.
@pit
- **Hidden allocation.** A `std::string` concatenation in a loop is a heap exerciser.
- **Interview angle.** “C or C++ for firmware?” Give the trade-off, not a tribe.
