import type { ComponentType } from 'react';
import { BitPlayground, CrcCalc, Calculators } from './numbers';
import { TimingDiagram } from './timing';
import { Scheduler, MemoryMap, StateMachine } from './system';
import { Quantization, FftViewer, ConfusionMatrix } from './ml';
import { CircuitLab, PinLab, BounceLab, SamplingLab, EchoLab } from './signals';
import { RingLab, StructLab, HeapLab, BaudLab, RiseLab, CanLab, PowerLab, PidLab } from './extra';
import { ChipMap, BootFlow, TimerLab, JitterLab, FloatLab, RegisterLab } from './machine';

export type WidgetDef = { id: string; title: string; blurb: string; lessons: string[]; C: ComponentType };
export const widgets: WidgetDef[] = [
  { id: 'chip', title: 'Inside the ESP32-S3', blurb: 'A clickable block diagram of the chip and the module around it.', lessons: ['0.1', '0.6'], C: ChipMap },
  { id: 'boot', title: 'Reset to app_main', blurb: 'Step through the boot stages: what each does, prints, and whether you can change it.', lessons: ['0.1', '1.7'], C: BootFlow },
  { id: 'circuit', title: 'LED circuit lab', blurb: 'Change the supply, resistor and LED; watch the current flow and the LED respond.', lessons: ['0.4'], C: CircuitLab },
  { id: 'pin', title: 'Floating pin lab', blurb: 'A live trace of a pin with and without a pull resistor, against the logic thresholds.', lessons: ['0.5'], C: PinLab },
  { id: 'echo', title: 'Ultrasonic echo', blurb: 'Watch the ping fly, and see how distance and temperature set the echo pulse width.', lessons: ['0.5', '2.5'], C: EchoLab },
  { id: 'bounce', title: 'Bounce and debounce', blurb: 'Press a noisy switch, tune the debounce window, count the phantom presses.', lessons: ['0.7', '1.9'], C: BounceLab },
  { id: 'sampling', title: 'Sampling and aliasing', blurb: 'Drag a tone past the Nyquist limit and watch the samples describe a different signal.', lessons: ['0.8'], C: SamplingLab },
  { id: 'timer', title: 'Timer and PWM', blurb: 'Prescaler, period and compare: build a PWM waveform from a clock.', lessons: ['0.9', '2.3', '2.4'], C: TimerLab },
  { id: 'jitter', title: 'Three ways to wait', blurb: 'Busy loop, vTaskDelay or hardware timer: compare the periods each one really produces.', lessons: ['0.9', '0.10'], C: JitterLab },
  { id: 'float', title: 'Float and fixed point', blurb: 'Flip the 32 bits of a float; compare with fixed-point Q formats.', lessons: ['0.12', '9.4'], C: FloatLab },
  { id: 'reg', title: 'GPIO registers', blurb: 'Write OUT, W1TS, W1TC and ENABLE on a row of LEDs, and trigger a read-modify-write race.', lessons: ['0.13', '2.1'], C: RegisterLab },
  { id: 'struct', title: 'Struct layout', blurb: 'Reorder fields and watch the padding bytes appear and disappear.', lessons: ['1.4'], C: StructLab },
  { id: 'ring', title: 'Ring buffer', blurb: 'Put and get bytes; see head, tail, full and empty.', lessons: ['1.8', '3.1', '4.4'], C: RingLab },
  { id: 'heap', title: 'Heap fragmentation', blurb: 'Allocate and free until a request fails with memory to spare.', lessons: ['1.10', '7.4'], C: HeapLab },
  { id: 'power', title: 'Battery life', blurb: 'Awake current, sleep current and duty cycle turned into days of battery.', lessons: ['2.12', '6.5'], C: PowerLab },
  { id: 'pid', title: 'PID tuning', blurb: 'Tune three gains on a simulated motor and read overshoot and settling time.', lessons: ['2.8', '4.11'], C: PidLab },
  { id: 'baud', title: 'Baud-rate mismatch', blurb: 'Slide the receiver clock off and watch its samples drift into the wrong bits.', lessons: ['3.1'], C: BaudLab },
  { id: 'rise', title: 'I2C pull-up and rise time', blurb: 'Resistor and bus capacitance against the rise-time limit.', lessons: ['3.2'], C: RiseLab },
  { id: 'can', title: 'CAN arbitration', blurb: 'Three nodes talk at once; the lowest identifier wins without a collision.', lessons: ['3.6'], C: CanLab },
  { id: 'timing', title: 'Timing diagrams', blurb: 'Build, play and decode UART, I2C and SPI frames bit by bit.', lessons: ['3.1', '3.2', '3.3'], C: TimingDiagram },
  { id: 'bits', title: 'Bit playground', blurb: 'Set, clear and toggle bits; see hex, signed and byte-order views.', lessons: ['0.11', '0.13'], C: BitPlayground },
  { id: 'crc', title: 'CRC calculator', blurb: 'Six common CRCs with the register value after every byte.', lessons: ['0.12', '3.1', '3.5', '3.7'], C: CrcCalc },
  { id: 'calc', title: 'Calculators', blurb: 'Divider, LED resistor, I2C pull-up, UART timing, timer prescaler, PWM resolution.', lessons: ['0.4', '0.5', '0.9', '2.3', '2.4', '3.2'], C: Calculators },
  { id: 'memory', title: 'Memory map', blurb: 'Edit a flash partition table with live validation; see which section a C declaration lands in.', lessons: ['1.1', '1.7', '6.3'], C: MemoryMap },
  { id: 'fsm', title: 'State machine designer', blurb: 'Edit a transition table, step through it, and get table-driven C.', lessons: ['1.9'], C: StateMachine },
  { id: 'sched', title: 'Scheduler visualizer', blurb: 'Fixed-priority preemption on a tick grid, with priority inversion and inheritance.', lessons: ['4.2', '4.5'], C: Scheduler },
  { id: 'quant', title: 'Quantization', blurb: 'Scale and zero-point, step size and saturation for any integer width.', lessons: ['0.8', '9.4'], C: Quantization },
  { id: 'fft', title: 'FFT viewer', blurb: 'Two tones and noise: spectrum, bin width, windows and aliasing.', lessons: ['0.8', '9.2'], C: FftViewer },
  { id: 'cm', title: 'Confusion matrix', blurb: 'Move a threshold and watch precision, recall and false alarms trade off.', lessons: ['9.1'], C: ConfusionMatrix },
];
export const widgetById = (id: string) => widgets.find(w => w.id === id);
