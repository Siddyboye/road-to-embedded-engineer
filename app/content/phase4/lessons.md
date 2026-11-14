=== 4.1 | draft
@why
One loop that does everything works until two things must happen at once. Knowing exactly where it breaks tells you what an RTOS is for, and when you do not need one.
@need
Your Phase 3 data logger. 2 hours.
@build
- [ ] Write the logger as one loop: read the IMU, read the BME280, update the display, write the SD card, poll the shell
- [ ] Time each step by toggling a pin around it and capturing
- [ ] Raise the IMU rate until samples are missed. Which step caused it?
- [ ] Type in the shell while the SD card is flushing. How long is the delay?
@how
A **superloop** runs every job in turn. The slowest job sets the response time of all the others. You can go far with it by keeping every step short and non-blocking, using state machines and timers, and many shipping products do.

An **RTOS** gives each job its own task, with its own stack and a priority. The scheduler runs the most urgent ready task and switches away from one that is waiting. Code can then be written as if it had the processor to itself, blocking on a queue or a delay.

The cost is new failure modes: shared data between tasks, stack per task, priority bugs. Phase 4 is mostly about those.

ESP-IDF always runs FreeRTOS; Wi-Fi, timers and your `app_main` are tasks. Others you will hear named: Zephyr (lesson 4.12), QNX in cars, µC/OS and RT-Thread.
@deep
- [ ] Rewrite one slow step as a non-blocking state machine and measure the loop again.
@when
| System | Structure |
| --- | --- |
| A few fast, short jobs | Superloop with timers |
| Jobs with very different deadlines, blocking stacks (network, files) | RTOS |
@break
- [ ] Add a 200 ms blocking call to the loop and list everything that got worse.
@check
1. What sets a superloop’s worst response time?
2. What does a task have that a function in a loop does not?
3. Name one new class of bug an RTOS introduces.
@stretch
- Estimate how much RAM three 4 KB task stacks cost against the loop.
@read
*Mastering the FreeRTOS Real Time Kernel*, chapter 1. *Making Embedded Systems*, “Managing the Flow of Activity”.
@pit
- **Reaching for tasks to avoid thinking about timing.**
- **Interview angle.** “Bare metal or RTOS: how do you decide?”

=== 4.2 | draft
@why
The scheduler’s rule is one sentence, and every RTOS behaviour follows from it. Predicting what runs next is the core skill of this phase.
@need
Lessons 0.10 and 4.1. 3 hours.
@build
::widget sched

- [ ] In the visualizer, predict the first twenty ticks before looking. Then give the slow task the highest priority and explain the damage
- [ ] On the board, create three tasks that each toggle their own pin and capture all three
- [ ] Give two of them the same priority and both a busy loop. What does the capture show?
- [ ] Make one task periodic two ways: `vTaskDelay` after its work, then `xTaskDelayUntil`. Measure the period of each

```c
static void blink_task(void *arg)
{
    TickType_t last = xTaskGetTickCount();
    for (;;) {
        do_work();
        xTaskDelayUntil(&last, pdMS_TO_TICKS(20));      /* period measured from the last wake-up, not from now */
    }
}
xTaskCreate(blink_task, "blink", 3072, NULL, 5, NULL);  /* stack in bytes on ESP-IDF; higher number = higher priority */
```
@how
**The rule:** the highest-priority task that is ready to run, runs. If a higher one becomes ready, it **preempts** immediately.

A task is **running**, **ready**, **blocked** (waiting for time or an event) or **suspended**. Well-behaved tasks spend nearly all their time blocked.

The **tick** is a periodic interrupt, 10 ms by default here. It wakes delayed tasks and, among ready tasks of equal priority, shares the CPU in turn: **time slicing**.

`vTaskDelay` waits from *now*, so work time is added to the period and it drifts. `xTaskDelayUntil` waits until a fixed interval after the *previous* wake-up, giving a steady period.

When nothing is ready, the **idle task** runs. It is where the system sleeps, and on ESP-IDF it also feeds the watchdog, so starving it has consequences.
@deep
- [ ] A task at priority 5 never blocks. What can run at priority 4 on a single core? On your dual-core S3?
@when
| Task | Priority |
| --- | --- |
| Short, urgent, event-driven | High |
| Long-running computation | Low |
| Periodic with a deadline | By deadline: shorter period, higher priority |
@break
- [ ] Remove the delay from a high-priority task and read what the watchdog reports.
@check
1. State the scheduler’s rule.
2. What is the difference between `vTaskDelay` and `xTaskDelayUntil`?
3. What happens between two ready tasks of equal priority?
@stretch
- Print each task’s state with `vTaskList`.
@read
*Mastering the FreeRTOS Real Time Kernel*, “Task Management”. ESP-IDF guide: “FreeRTOS (IDF)”.
@pit
- **Giving everything high priority.** Priority is relative; raising all of them changes nothing.
- **Interview angle.** “What is preemption?” and “how would you run something every 10 ms?”

=== 4.3 | draft
@why
Each task costs RAM for its stack, and the right size is found by measuring, not guessing. Lesson 1.11 met the problem; this lesson applies it to your own tasks.
@need
Lessons 1.11 and 4.2. 90 minutes.
@build
- [ ] Give each of your three tasks 4096 bytes and print every task’s high-water mark after a minute of worst-case activity
- [ ] Shrink each stack to its measured use plus half again. Confirm stability over ten minutes
- [ ] Create one task with static allocation: you provide the stack array and the control block
- [ ] Delete a task and watch the free heap. When does the memory come back?
@how
`xTaskCreate` takes the stack and the task’s control block from the heap. It can fail, and deleting tasks returns memory later, when the idle task runs. `xTaskCreateStatic` uses memory you supply at link time: it cannot fail and cannot fragment, which is why safety-minded code prefers it.

Sizing: run the worst path, with the deepest calls and the largest prints, read `uxTaskGetStackHighWaterMark`, and add margin. Leave overflow detection on in every build.

Most tasks should never end. A task function that returns without deleting itself is an error.
@deep
- [ ] Which costs more RAM: five tasks of 3 KB each, or one event loop? What would you give up?
@when
| Task lifetime | Create it |
| --- | --- |
| Whole run | Statically, at start-up |
| Occasional, short-lived | Dynamically, if you must; or reuse a worker |
@break
- [ ] Let a task function return. Read the abort message.
@check
1. Where does a dynamically created task’s stack come from?
2. Why prefer static creation in long-running products?
3. How do you size a stack?
@stretch
- Add a debug command to your shell that prints all high-water marks.
@read
*Mastering the FreeRTOS Real Time Kernel*, “Heap Memory Management” and “Task Management”.
@pit
- **Creating and deleting tasks in a loop.** A fragmentation engine.
- **Interview angle.** “How do you choose a task’s stack size?”

=== 4.4 | draft
@why
Tasks must exchange data without corrupting it. A queue is the safe default: it copies the item, blocks the receiver until something arrives and the sender when it is full.
@need
Lessons 1.8 and 4.2. 3 hours.
@build
::widget ring

- [ ] A producer task reads the IMU at 100 Hz and sends a sample struct to a queue of ten; a consumer prints the average of each ten
- [ ] Slow the consumer down. What happens when the queue fills, with a send timeout of zero? Of 10 ms? Of forever?
- [ ] Count dropped samples and print the count
- [ ] Add a second producer on the same queue, with a field saying which it is
- [ ] Watch `uxQueueMessagesWaiting` and find the smallest queue that never drops
@how
A queue is a ring buffer of fixed-size items with blocking built in. `xQueueSend` copies the item in; `xQueueReceive` copies it out and, if the queue is empty, puts the task to sleep until an item arrives or the timeout expires. No polling, no shared variable.

Because items are **copied**, the sender’s variable can go out of scope. For large data, send a pointer to a buffer from a pool, and be clear about who frees it.

A full queue is **back-pressure**: the choice of timeout is the choice between slowing the producer, dropping data, or noticing an overload. Make it deliberately.
@deep
- [ ] The consumer needs 2 ms per item and items arrive in bursts of fifty every second. Size the queue.
@when
| Passing | Use |
| --- | --- |
| Small messages between tasks | Queue |
| “Something happened”, no data | Task notification (4.6) |
| A byte stream | Stream buffer (4.7) |
| Access to one shared resource | Mutex (4.5) |
@break
- [ ] Send a pointer to a local variable through the queue.
@check
1. What does a receive on an empty queue do?
2. Why are queue items copied?
3. What are the three responses to a full queue?
@stretch
- Use a queue set to wait on two queues at once.
@read
*Mastering the FreeRTOS Real Time Kernel*, “Queue Management”.
@pit
- **An infinite send timeout in a task that must stay responsive.**
- **Interview angle.** “How do two tasks share data safely?”

=== 4.5 | draft
@why
Priority inversion and deadlock are the two concurrency failures every interviewer asks about, and one of them nearly ended a Mars mission. You will cause both on purpose, then fix them.
@need
Lesson 4.4. 4 hours.
@build
::widget sched

- [ ] In the visualizer, run the inversion scenario with a plain lock, then with inheritance. Note when High finishes in each
- [ ] On the board: two tasks print long lines to the console at once. Protect the print with a mutex
- [ ] Reproduce inversion: Low takes a *binary semaphore* and works; High waits for it; Medium spins. Time how long High waits
- [ ] Replace the semaphore with a *mutex* and time it again
- [ ] Reproduce a deadlock: two tasks, two mutexes, taken in opposite orders with a delay between. Then fix it by ordering
@how
A **mutex** protects a resource: take it, use the resource, give it back, always in the same task. A **binary semaphore** is a signal: one side gives, another takes. A **counting semaphore** tracks several identical resources or pending events.

**Priority inversion.** A low-priority task holds a lock a high-priority task needs. A medium-priority task, needing no lock, preempts the low one, so the high one waits on the medium one indefinitely. **Priority inheritance** fixes it: while High waits, Low runs at High’s priority. FreeRTOS mutexes do this; semaphores do not, which is the practical difference between them.

**Deadlock.** Task A holds lock 1 and wants lock 2; task B holds 2 and wants 1. Neither proceeds. The cures: always take locks in one global order; use timeouts and back off; hold one lock at a time; or give the resource to a single task and send it requests through a queue.

Hold a lock for as short a time as possible, and never across a blocking call.
@deep
- [ ] Why can a mutex not be given from an interrupt, while a semaphore can?
- [ ] Redesign the shared display so that no mutex is needed at all.
@when
| Need | Primitive |
| --- | --- |
| Exclusive access to a resource | Mutex |
| Signal from an ISR or task that something happened | Binary semaphore or notification |
| Count of available items | Counting semaphore |
@break
- [ ] Take a mutex and return on an error path without giving it back.
@check
1. What is priority inversion, in three sentences?
2. How does priority inheritance fix it?
3. Give two ways to prevent deadlock.
@stretch
- Add a lock timeout and log when it expires: a cheap deadlock detector.
@read
*Mastering the FreeRTOS Real Time Kernel*, “Resource Management”. The account of the Mars Pathfinder resets.
@pit
- **Using a binary semaphore as a lock.** No inheritance.
- **Interview angle.** “Explain priority inversion and how to solve it” is close to guaranteed.

=== 4.6 | draft
@why
Most communication between an interrupt and a task, or between two tasks, is just “wake up”. Notifications do that with no extra object and less overhead than anything else.
@need
Lessons 2.2 and 4.4. 2 hours.
@build
- [ ] Replace the queue in your lesson 2.2 interrupt lab with a direct task notification
- [ ] Measure the time from the edge to the task’s first action, both ways
- [ ] Use an event group: one task waits until *both* “Wi-Fi up” and “time set” bits are set; two other tasks set them
- [ ] Notify a task with a value and use its bits as separate event flags
@how
Every task has a built-in **notification** value. Another task or an ISR can set, increment or overwrite it and wake the task; the task waits with `ulTaskNotifyTake` or `xTaskNotifyWait`. No queue to create, and it is the fastest primitive, but it has exactly one receiver: the task it is sent to.

An **event group** is a set of bits several tasks can wait on, for any or all of a combination. It is the tool for “proceed when these conditions hold”, which is how connection state is usually tracked.
@deep
- [ ] Three interrupts arrive before the task runs. What does it see with “give and take”, and with a notification value used as bits?
@when
| Situation | Use |
| --- | --- |
| Wake one known task | Notification |
| Several tasks wait on combinations of conditions | Event group |
| Data must accompany the event | Queue |
@break
- [ ] Notify a task that is not waiting, twice, then let it wait once. Explain what it sees.
@check
1. What limits task notifications?
2. When is an event group better than a semaphore?
3. Why are notifications faster than queues?
@stretch
- Build a counting semaphore out of notifications.
@read
*Mastering the FreeRTOS Real Time Kernel*, “Task Notifications” and “Event Groups”.
@pit
- **Two sources notifying one task with no way to tell them apart.**
- **Interview angle.** “How does an ISR hand work to a task?”

=== 4.7 | draft
@why
Blinking a status LED or timing out a connection does not deserve a task. And a UART byte stream does not fit a queue of fixed-size items.
@need
Lesson 4.4. 2 hours.
@build
- [ ] Blink an LED with a software timer; change its period from the shell
- [ ] Build a one-shot timeout that restarts on every received byte: “no data for two seconds”
- [ ] Block the timer callback for 500 ms and observe the other timers
- [ ] Route UART bytes through a stream buffer into your frame parser task from lesson 1.14, waking it only when at least a header’s worth is waiting
@how
**Software timers** call a function later or periodically. All their callbacks run in one **timer task**, so a callback must be short and must never block; a slow callback delays every other timer. Their resolution is the tick.

A **stream buffer** carries bytes from one writer to one reader, with a trigger level: the reader sleeps until that many bytes are available. A **message buffer** does the same for variable-length messages. Both are lighter than a queue of bytes and safe from an ISR.
@deep
- [ ] ESP-IDF also has `esp_timer`, with microsecond resolution. When would you choose each?
@when
| Need | Use |
| --- | --- |
| Loose periodic or delayed action | Software timer |
| Microsecond timing | Hardware timer or `esp_timer` |
| Bytes from an ISR to a task | Stream buffer |
| Fixed-size records | Queue |
@break
- [ ] Take a mutex with an infinite timeout inside a timer callback.
@check
1. In what context do software-timer callbacks run?
2. What is a stream buffer’s trigger level for?
3. Why not send a byte stream through a queue?
@stretch
- Implement a watchdog for another task with a software timer it must keep restarting.
@read
*Mastering the FreeRTOS Real Time Kernel*, “Software Timer Management”.
@pit
- **Long work in a timer callback.**
- **Interview angle.** “Timer callback or dedicated task?”

=== 4.8 | draft
@why
Interrupts and tasks meet at a narrow, rule-bound boundary. Getting it right gives microsecond response with the heavy work safely in a task.
@need
Lessons 2.2, 2.5 and 4.6. 3 hours.
@build
- [ ] Ultrasonic ranger, properly: the echo’s edges are timestamped in an ISR; the ISR notifies a task; the task computes distance and sends it to a queue for the display
- [ ] Check with the analyzer that the ISR takes only a few microseconds
- [ ] Protect a two-field shared struct with a critical section and show the torn read that happens without it
- [ ] Measure how long interrupts are disabled by your critical section
@how
From an ISR, call only functions ending in `FromISR`. Each reports whether it woke a task of higher priority than the one interrupted; if so, request a context switch on exit so that task runs at once.

The pattern is **deferred interrupt processing**: the ISR captures what only it can (a timestamp, a byte) and wakes a task for everything else.

A **critical section** makes a few lines atomic by disabling interrupts. On a dual-core chip that is not enough, since the other core is still running, so ESP-IDF’s version also takes a **spinlock** that you pass in. Keep it to a handful of instructions: no calls that block, no prints.

Choose the lightest tool that is correct: an atomic variable, then a critical section, then a mutex.
@deep
- [ ] Why can you not take a mutex in an ISR?
- [ ] What is the worst-case interrupt latency you have now added to the whole system?
@when
| Protecting | Use |
| --- | --- |
| A few variables shared with an ISR | Critical section |
| A resource shared between tasks, held for a while | Mutex |
| One word | An atomic type |
@break
- [ ] Call a blocking function inside a critical section.
@check
1. What must an ISR do after waking a higher-priority task?
2. Why does a critical section need a spinlock on a dual-core chip?
3. How long should a critical section last?
@stretch
- Replace the critical section with a lock-free design using a sequence counter.
@read
*Mastering the FreeRTOS Real Time Kernel*, “Interrupt Management”. ESP-IDF guide: “FreeRTOS (IDF)”, critical sections.
@pit
- **Long critical sections.** They are added to every interrupt’s latency.
- **Interview angle.** “How do you share data between an ISR and a task?”

=== 4.9 | draft
@why
Your S3 has two cores. Code that was safe because “only one thing runs at a time” is no longer safe, and the bugs appear once a day.
@need
Lesson 4.8. 2 hours.
@build
- [ ] Print which core each of your tasks is running on, repeatedly. Does it change?
- [ ] Pin two tasks to different cores and have both increment a shared counter a million times with no protection. Is the total two million?
- [ ] Fix it three ways: a critical section, a mutex, and by pinning both tasks to one core. Time each
- [ ] Find which core runs the Wi-Fi task and `app_main`
@how
ESP-IDF runs a **symmetric multiprocessing** version of FreeRTOS: one scheduler, two cores. An unpinned task runs on whichever core is free; a pinned task stays on one.

Two tasks can now truly run at the same instant. Disabling interrupts on one core does not stop the other, which is why critical sections take a spinlock. Raising a task’s priority no longer guarantees exclusion from lower ones.

Each core has its own idle task and its own watchdog check. Pinning is a tool for cache behaviour and for isolating timing-critical work from the radio stack, not a substitute for locking.
@deep
- [ ] `counter++` is three machine steps. Draw the interleaving across two cores that loses an increment.
@when
| Task | Affinity |
| --- | --- |
| Most tasks | Unpinned |
| Timing-critical, away from the radio’s core | Pinned |
| Code that assumes a single core (some ports, some libraries) | Pinned to one core together |
@break
- [ ] Remove the protection and run the counter test ten times. Record the spread of wrong totals.
@check
1. Why is “higher priority” no longer a form of mutual exclusion?
2. What does a spinlock add to a critical section?
3. When would you pin a task?
@stretch
- Measure the speed-up of a CPU-bound job split across both cores.
@read
ESP-IDF guide: “FreeRTOS (IDF)”, the SMP sections.
@pit
- **Porting single-core code unchanged.**
- **Interview angle.** “What changes when you move from one core to two?”

=== 4.10 | draft
@why
“It feels slow” is not a measurement. Run-time statistics and traces show where the processor’s time goes and which task misses its deadline.
@need
Your multi-task logger. 3 hours.
@build
- [ ] Enable run-time statistics and print the percentage of CPU each task used over ten seconds
- [ ] Toggle a pin at the start and end of each task’s work; capture and measure worst-case execution time and jitter
- [ ] Find the task that is starved when the SD card flushes
- [ ] If your setup supports it, record an application trace and view the task timeline
@how
**Run-time stats** accumulate how long each task has run. They answer “who is using the CPU”.

**Pin toggling** with a logic analyzer answers “when, exactly”, with almost no disturbance: the cheapest tracing there is.

**Tracing** records every context switch, interrupt and API call with timestamps and replays them as a timeline. It is how you see a priority inversion or a missed deadline that occurs once an hour.

Three numbers describe a periodic task: its **period**, its **worst-case execution time**, and its **jitter**. A deadline is met when, in the worst case, the task finishes in time even with every higher-priority task and interrupt running.
@deep
- [ ] Your control task needs 2 ms every 10 ms. Higher-priority work can take 6 ms. Does it always meet its deadline?
@when
| Question | Tool |
| --- | --- |
| Which task uses the CPU? | Run-time stats |
| How long, how regular? | Pin and analyzer |
| What sequence led to the fault? | Trace |
@break
- [ ] Add logging at high verbosity and measure what it did to your timings.
@check
1. What is worst-case execution time?
2. Why is pin toggling a good tracing method?
3. What does a trace show that statistics cannot?
@stretch
- Plot a histogram of one task’s period from an analyzer export.
@read
ESP-IDF guide: “Application Level Tracing”. *Mastering the FreeRTOS Real Time Kernel*, “Developer Support”.
@pit
- **Measuring with the measurement disturbing the system.**
- **Interview angle.** “How do you verify a real-time requirement?”

=== 4.11 | draft
@why
Knowing the primitives is not design. This lesson is about deciding which tasks exist, what they own and how they talk, before writing them.
@need
Lessons 4.1 to 4.10. 3 hours, mostly on paper.
@build
::widget pid

- [ ] For the capstone, list every activity with its period, worst-case time and deadline
- [ ] Group activities into tasks. Draw each task as a box, each queue as an arrow, and write who owns each peripheral
- [ ] Assign priorities by deadline and compute total CPU use
- [ ] Mark every blocking call and its timeout
- [ ] In the PID lab, find gains that work; then note the loop rate your design must guarantee for them to hold
@how
**One owner per resource.** The display belongs to the display task; others send it messages. Ownership removes most locks.

**Pipelines.** Sensor task, then processing, then output, joined by queues. Each stage has one job and can be tested alone.

**Active objects.** A task with a private state machine and an inbox queue; it does nothing except react to messages. No shared state, so no races by construction.

**Rate-monotonic priority.** Among periodic tasks, the shorter the period, the higher the priority. If total utilisation stays under about 70%, deadlines are met; above that you must analyse.

Write the timing budget down. A design you cannot draw on one page has too many interactions.
@deep
- [ ] Where in your design could a slow consumer stall a producer? Is that what you want?
@when
| Pattern | Fits |
| --- | --- |
| Pipeline | Data flowing one way |
| Active object | Stateful components reacting to events |
| Shared data with a mutex | Rarely changing configuration |
@break
- [ ] Find the one queue in your design whose overflow would be silent, and decide what should happen instead.
@check
1. Why does single ownership reduce locking?
2. What is rate-monotonic priority assignment?
3. What belongs in a timing budget?
@stretch
- Review an open-source ESP-IDF project’s task structure against these ideas.
@read
*Making Embedded Systems*, the architecture chapters.
@pit
- **One task per function.** Tasks are for independent timing, not for tidiness.
- **Interview angle.** “Design the task architecture for a battery-powered sensor node.”

=== 4.12 | draft
@why
Zephyr appears in a growing share of postings. A few hours with it shows that tasks, queues and drivers are concepts, not FreeRTOS features, and introduces devicetree before Phase 8.
@need
An S3 board; the Zephyr SDK and its `west` tool. 5 hours.
@build
- [ ] Install Zephyr and build its blinky sample for your board; the exact board name is in Zephyr’s board list
- [ ] Find the LED’s pin: it is not in the C file. Open the board’s devicetree and locate it
- [ ] Add an overlay that declares the MPU6050 on the I2C bus, enable its driver in the project configuration, and read acceleration through the generic sensor interface
- [ ] Create a second thread and a message queue; pass readings between them
@how
Zephyr is an RTOS with its own build system and a large driver collection, used across many vendors’ chips.

**Devicetree** describes the hardware, which bus, which pins, which address, in data files instead of code. The same application builds for another board by changing the tree. Linux uses the same idea, which is why this is worth an afternoon.

**Kconfig** selects which subsystems are compiled in; you have used the same tool in ESP-IDF’s configuration menu.

| Concept | FreeRTOS | Zephyr |
| --- | --- | --- |
| Task | `xTaskCreate` | `k_thread` |
| Queue | `xQueueSend` | `k_msgq_put` |
| Mutex | `xSemaphoreTake` | `k_mutex_lock` |
| Delay | `vTaskDelay` | `k_sleep` |
@deep
- [ ] What did devicetree move out of your C code, and what does that enable?
@when
| Choose | When |
| --- | --- |
| ESP-IDF | Espressif chips, full use of their radios and peripherals |
| Zephyr | One codebase across several vendors; teams standardised on it |
@break
- [ ] Use the sensor without enabling its driver in the configuration. Read the build error.
@check
1. What is a devicetree for?
2. What is the Zephyr equivalent of a FreeRTOS queue?
3. Why do teams adopt Zephyr?
@stretch
- Build the same application for the Nucleo.
@read
Zephyr’s “Getting Started Guide” and “Devicetree” introduction.
@pit
- **Looking for pin numbers in the source.**
- **Interview angle.** “Have you used Zephyr or devicetree?”

=== 4.13 | draft
@why
Edge AI is the destination. Seeing a model run on your board now, months before Phase 9, shows what all this plumbing is for and starts the dataset you will need.
@need
An S3 board and the MPU6050. Lessons 3.2 and 4.4. 3 hours.
@build
- [ ] Add the TensorFlow Lite Micro component and build its smallest example, a model that approximates a sine wave
- [ ] Time the `Invoke()` call with a microsecond timer. Print the tensor arena size it needed
- [ ] Read the code: find the model array, the interpreter, the arena, the input and output tensors
- [ ] Separately, write a logger: IMU at 100 Hz through a queue to the serial port as CSV
- [ ] Record three gestures, twenty repetitions each, into labelled files. Keep them: lesson 9.1 trains on them
@how
A model on a microcontroller is an array of bytes in flash plus an interpreter that walks it. All working memory comes from one static block, the **tensor arena**; nothing is allocated while it runs. You copy numbers into an input tensor, call invoke, and read an output tensor.

The data pipeline around it is everything you have built: a sensor driver, a periodic task, a queue, a buffer. Phase 9 replaces the sine model with one trained on the data you are recording now.
@deep
- [ ] How many inferences per second could this chip do with this model? What would limit a larger one first: time, RAM or flash?
@when
Use on-device inference when the answer is needed immediately, when sending raw data costs too much power or bandwidth, or when it must work offline.
@break
- [ ] Shrink the arena until allocation fails and read the message.
@check
1. Where does a model live, and where does its working memory come from?
2. What are the three steps of one inference?
3. Why record data with a fixed sample rate and labels?
@stretch
- Plot your three gestures in Python and see whether you can tell them apart by eye.
@read
The esp-tflite-micro component’s README. *TinyML*, chapters 4 to 6.
@pit
- **Recording all the data in one session, one position.** The model will learn the session.
- **Interview angle.** “What does it take to run a neural network on a microcontroller?”
