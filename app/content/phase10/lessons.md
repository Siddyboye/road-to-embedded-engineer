=== 10.1 | draft
@why
The course was built from a sample of thirteen postings. Your job search deserves the real analysis: thirty postings, counted.
@need
The Job market page. 5 hours.
@build
- [ ] Save 20 to 30 current postings you would actually apply to, on the Job market page
- [ ] For each, list required and preferred skills
- [ ] Count how often each skill appears; sort
- [ ] Map each skill to a lesson or project; mark your confidence honestly
- [ ] Choose the three largest gaps and plan how to close them
- [ ] Repeat every quarter
@how
Postings mix essentials with wishes. Skills in nearly every posting are the floor; skills in a third are differentiators; skills in one or two are noise or a niche.

Read for **seniority signals**: “design”, “own”, “lead” against “implement” and “support”. Read for **domain**: automotive wants standards and CAN; consumer wants power and wireless; edge AI wants a runtime and optimisation.
@deep
- [ ] Which gap is closed fastest by a project, and which only by a job?
@when
Before applying, and again each quarter.
@break
- [ ] Find a posting you match 100%. Is it a step up?
@check
1. How do you separate required from wished-for?
2. What signals seniority?
3. What will you do about your top gap?
@stretch
- Track how the counts change over a year.
@read
Your own spreadsheet.
@pit
- **Applying only when you match every line.**
- **Interview angle.** This lesson decides which interviews you get.

=== 10.2 | draft
@why
C questions open most embedded interviews. They test whether Phase 1 is reflex or memory.
@need
Phase 1 quizzes. 5 hours.
@build
- [ ] Rework every Phase 1 quiz question you ever missed
- [ ] Without notes, write: reverse the bits of a byte; count set bits; detect endianness; swap two values without a temporary; a circular buffer; `atoi`; `memcpy` with overlap handled
- [ ] Explain aloud, in under a minute each: `volatile`, `static`, `const` pointer forms, struct padding, integer promotion, stack versus heap, an interrupt-safe counter
- [ ] Have someone ask you five at random
@how
Interviewers look for three things: a correct answer, the edge cases named without prompting, and a clear explanation while you write. Say your assumptions first: sizes of types, what happens on NULL, whether interrupts are involved.
@deep
- [ ] For each exercise, name the bug a rushed candidate would write.
@when
Daily, briefly, in the weeks before interviews.
@break
- [ ] Write each on paper with no compiler, then compile what you wrote.
@check
1. What does `volatile` not do?
2. What is undefined in `i = i++ + 1`?
3. Why can `sizeof` on an array parameter mislead?
@stretch
- Write your own ten hardest questions.
@read
Your Phase 1 notes. *Effective C*, skimmed.
@pit
- **Silence while coding.**
- **Interview angle.** All of it.

=== 10.3 | draft
@why
RTOS questions test whether you have been bitten by concurrency or only read about it.
@need
Phase 4. 4 hours.
@build
- [ ] On a whiteboard, with timelines: priority inversion and its fix; a deadlock and three preventions; an ISR handing work to a task; a producer faster than a consumer
- [ ] Answer aloud: mutex versus semaphore; when a queue beats a shared variable; what a critical section costs; how you size a stack; what happens on a tick
- [ ] Use the scheduler visualizer to check each timeline
@how
Draw time left to right, one row per task. Mark who holds what. Most concurrency answers become obvious once drawn, and the drawing is what the interviewer wants to see.
@deep
- [ ] Tell the story of a concurrency bug you created in Phase 4: symptom, hypothesis, evidence, fix.
@when
Before any interview that mentions RTOS, FreeRTOS, Zephyr or “multithreading”.
@break
- [ ] Have someone change one priority in your diagram and re-derive the outcome.
@check
1. Explain priority inheritance on a timeline.
2. Why not take a mutex in an ISR?
3. Mutex or semaphore for a shared UART?
@stretch
- Explain the same in Zephyr’s terms.
@read
*Mastering the FreeRTOS Real Time Kernel*, “Resource Management”, again.
@pit
- **Definitions without an example.**
- **Interview angle.** “Tell me about a race condition you debugged.”

=== 10.4 | draft
@why
Being able to draw a protocol from memory is the quickest proof that you built it rather than called it.
@need
Phase 3. 4 hours.
@build
- [ ] Draw from memory: a UART frame for a given byte; an I2C register read; SPI mode 0 and mode 3; a CAN arbitration between two identifiers
- [ ] Check each against the timing-diagram tool
- [ ] Decode ten mystery UART bytes in the tool without error
- [ ] Recite the comparison table: wires, speed, distance, devices, clock
- [ ] Answer the six “pick the protocol” scenarios from lesson 3.12 in twenty seconds each
@how
For each protocol, know: the idle state, how a transaction starts and ends, bit order, who drives the clock, how errors are detected, and one failure you have seen on an analyzer.
@deep
- [ ] For each, the question behind the question: what breaks it in a real product?
@when
Before any interview mentioning protocols, drivers or bring-up.
@break
- [ ] Draw I2C with the acknowledge driven by the wrong side and spot it.
@check
1. What is on the wire for an I2C read of register 0x75 at address 0x68?
2. Which SPI edge samples in mode 0?
3. What does a CAN node do when it loses arbitration?
@stretch
- Add 1-Wire and I2S to your set.
@read
Your captures.
@pit
- **MSB-first on a UART.**
- **Interview angle.** “Draw it.”

=== 10.5 | draft
@why
Senior-leaning interviews ask you to design a system aloud. It is a structured exercise, and structure can be practised.
@need
Phases 4 to 6. 5 hours.
@build
Design a battery-powered sensor node three times, each in 30 minutes, each with a different constraint:
- [ ] One year on two AA cells, reporting hourly
- [ ] Mains powered, 1 kHz vibration sampling, anomalies reported within a second
- [ ] Ten thousand units, over-the-air updates, five-year support

For each, write: requirements and unknowns you would ask about; block diagram; choice of chip, radio and sensors with reasons; task architecture; power budget; storage; update and security; failure modes; test plan.
@how
A workable order: **clarify** the requirements and state assumptions; **budget** power, memory, cost and time; draw the **hardware**; draw the **software**; walk the **failure cases**; say how you would **test** it. Give numbers, even rough ones. Name the trade-offs you are making.
@deep
- [ ] Which decision in each design would you most want to prototype first?
@when
For any role with “design”, “architecture” or “senior” in it.
@break
- [ ] Have someone change a requirement halfway and adapt without restarting.
@check
1. What do you ask before designing?
2. Which budgets do you state?
3. How do you show you have thought about failure?
@stretch
- Present one design in ten minutes to someone outside the field.
@read
*Making Embedded Systems*, the architecture chapters.
@pit
- **Jumping to a chip before asking questions.**
- **Interview angle.** The whole lesson.

=== 10.6 | draft
@why
“The device resets every few hours” is a classic interview prompt and a real Tuesday. A method beats inspiration.
@need
Phase 7. 4 hours.
@build
For each scenario write: first three questions, likely causes ranked, the evidence that would confirm each, the tool for it.
- [ ] Resets every few hours
- [ ] Works on the bench, fails in the enclosure
- [ ] I2C sensor returns wrong values once a day
- [ ] Battery lasts a week instead of a year
- [ ] Device unreachable after an update
- [ ] Free heap falls slowly
- [ ] Works at room temperature only
- [ ] One unit in fifty fails
- [ ] Button sometimes registers twice
- [ ] Audio clicks every few seconds
@how
**Reproduce, isolate, hypothesise, test, fix, verify, prevent.** Start with what changed and what the device reported: reset reason, logs, core dump. Split the problem in half: hardware or software, this unit or all units, this version or earlier ones. Change one thing at a time.
@deep
- [ ] For three scenarios, what telemetry would have answered it without a site visit?
@when
Every time something is wrong.
@break
- [ ] Propose a fix before finding the cause, and list what could go wrong.
@check
1. What is the first thing to look at after an unexplained reset?
2. How do you tell a hardware fault from a software one?
3. What makes a fix verified?
@stretch
- Write up one real bug from this course as a post-mortem.
@read
“Debugging” by David Agans: the nine rules.
@pit
- **Changing three things at once.**
- **Interview angle.** “Walk me through how you would debug this.”

=== 10.7 | draft
@why
A portfolio is evidence. Three repositories that a stranger can understand in two minutes are worth more than thirty unfinished ones.
@need
Your capstones. 8 hours.
@build
Choose three projects that together show drivers, RTOS design, connectivity and edge AI. For each:
- [ ] A README that opens with what it does and a photo or short video
- [ ] An architecture diagram: tasks, queues, buses
- [ ] Measured results: latency, power, memory, accuracy
- [ ] How to build and flash, and what output to expect
- [ ] A “what I would do next” section
- [ ] A clean history, a licence, CI passing, no secrets
@how
A reviewer spends a minute or two. They look for: does it work, is it measured, is the code structured, can they tell what *you* decided. Numbers and diagrams answer those faster than prose.

Show one hard bug per project and how you found it: it is the most convincing paragraph you can write.
@deep
- [ ] Ask someone technical to explain one project back to you after two minutes with the README.
@when
Before the first application.
@break
- [ ] Clone your own repository on a fresh machine and follow the README exactly.
@check
1. What does a reviewer want in the first screen?
2. Which numbers belong in a README?
3. Why include a bug story?
@stretch
- Write a blog post about one project.
@read
READMEs of well-regarded embedded open-source projects.
@pit
- **A README that is the default template.**
- **Interview angle.** “Tell me about a project you are proud of.”

=== 10.8 | draft
@why
A résumé gets you the call. For embedded roles, measurable outcomes separate you from “familiar with”.
@need
Lesson 10.7. 3 hours.
@build
- [ ] Rewrite each project as two bullets of the form: did X, by doing Y, with measured result Z
- [ ] Put the skills that appear in most postings in the top third of the page
- [ ] Cut anything you could not discuss for five minutes
- [ ] Tailor the order for two different postings from lesson 10.1
- [ ] Have it read by one engineer and one non-engineer
@how
Strong: “Cut deep-sleep current from 2 mA to 18 µA by gating the sensor rail, extending battery life from 3 weeks to 14 months (measured).” Weak: “Worked on low-power firmware.”

Use the posting’s own words where they are true of you. Link the portfolio. One page.
@deep
- [ ] For each bullet, what follow-up question will it attract, and can you answer it?
@when
Before applying; revise per posting.
@break
- [ ] Remove every adjective and see what is left.
@check
1. What three parts make a strong bullet?
2. What goes in the top third?
3. What should you cut?
@stretch
- Write the cover note for your first-choice posting.
@read
Postings you saved.
@pit
- **Listing technologies you touched once.**
- **Interview angle.** Every bullet is an invitation to be questioned.

=== 10.9 | draft
@why
Firmware sits between hardware, software and product people. Engineers who write clearly and estimate honestly are trusted with more.
@need
A finished project. 4 hours.
@build
- [ ] Write a two-page design document for one capstone: problem, constraints, options considered, decision, risks
- [ ] Write a post-mortem for one real bug: timeline, root cause, fix, prevention, with no blame
- [ ] Estimate a new feature: break it down, give a range, list what could double it. Then build it and compare
- [ ] Write a bug report to a hardware engineer about a board fault, with evidence
- [ ] Prepare three behavioural stories: a conflict, a failure, a time you learned something fast
@how
A design document records *why*, for the person who inherits your code. A post-mortem turns a failure into a change of process. An estimate is a range with stated assumptions.

With hardware colleagues, bring captures and measurements, not opinions. With non-engineers, lead with the consequence, then the cause.

Behavioural answers work as: situation, what you did, result, what you would do differently.
@deep
- [ ] Which of your past decisions in this course would you now document differently?
@when
Continuously; these are habits.
@break
- [ ] Give an estimate as a single number and note how it gets used against you.
@check
1. What must a design document contain?
2. What does a blameless post-mortem focus on?
3. Why give estimates as ranges?
@stretch
- Present a project to a non-technical friend in five minutes.
@read
*Making Embedded Systems*, on working in teams.
@pit
- **Promising the optimistic number.**
- **Interview angle.** “Tell me about a time you disagreed with a colleague.”

=== 10.10 | draft
@why
The final exam is an interview loop, because that is the real test.
@need
Everything. 3 hours, with a partner if you can find one.
@build
- [ ] Round 1, 45 minutes: ten C and bit-manipulation questions on paper
- [ ] Round 2, 45 minutes: draw and explain two protocols; diagnose one capture
- [ ] Round 3, 45 minutes: system design of an edge-AI sensor node, aloud
- [ ] Round 4, 30 minutes: walk through one portfolio project and one bug
- [ ] Take every phase quiz again; note any topic below 80%
- [ ] Write down the three weakest areas and schedule them
@how
Record yourself if you have no partner. Listen for long silences, unexplained jumps and answers without numbers. Then repeat the weakest round a week later.

The course ends here. The review schedule on the Quizzes page does not: keep clearing it.
@deep
- [ ] Which lesson would you now teach differently, and why?
@when
A week before your first interview, and again after it.
@break
- [ ] Do a round when tired, on purpose.
@check
1. Which round was weakest?
2. What is your plan for it?
3. Which project best represents you?
@stretch
- Offer a mock interview to another learner. Explaining is the last stage of learning.
@read
Your notebook, front to back.
@pit
- **Stopping practice after the first offer.**
- **Interview angle.** This is it.
