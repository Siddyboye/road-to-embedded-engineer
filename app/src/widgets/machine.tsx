import { useMemo, useState } from 'react';
import { lessonHref } from '../lib/router';
import { Num, Seg, Slide, eng, hex, parseNum, rng } from '../lib/ui';

/* ---------------- What is inside the ESP32-S3 module ---------------- */
type Blk = { id: string; x: number; y: number; w: number; h: number; name: string; sub: string; text: string; lessons: string[]; ext?: boolean };
const BLOCKS: Blk[] = [
  { id: 'cpu', x: 16, y: 16, w: 190, h: 74, name: 'Two CPU cores', sub: 'Xtensa LX7, up to 240 MHz', text: 'Two identical 32-bit cores. FreeRTOS schedules tasks across both, which is why a bug can depend on which core ran first. Your app_main starts on one of them.', lessons: ['0.1', '4.9'] },
  { id: 'ram', x: 218, y: 16, w: 130, h: 74, name: 'Internal RAM', sub: '512 KB', text: 'Fast memory inside the chip, shared by the stacks, the heap, your globals and any code marked to run from RAM. It is the scarce resource in most firmware.', lessons: ['1.1', '1.10'] },
  { id: 'rom', x: 360, y: 16, w: 112, h: 74, name: 'ROM', sub: '384 KB, fixed', text: 'Code written at the factory: the first-stage bootloader and some library routines. You cannot change it, and it prints the first lines of every boot log.', lessons: ['0.1', '1.7'] },
  { id: 'radio', x: 484, y: 16, w: 120, h: 160, name: 'Radio', sub: 'Wi-Fi 4, Bluetooth LE 5', text: '2.4 GHz Wi-Fi and Bluetooth Low Energy share one antenna. The radio is the largest power consumer and a major source of timing jitter. No Bluetooth Classic on the S3.', lessons: ['5.1', '5.7'] },
  { id: 'per', x: 16, y: 102, w: 332, h: 74, name: 'Peripherals', sub: 'GPIO, timers, PWM, ADC, UART, I2C, SPI, I2S, CAN, RMT', text: 'Hardware blocks that do work without the CPU: count time, shift bits out at exact rates, convert voltages. You configure them through registers and they run on their own. Phases 2 and 3 take them one at a time.', lessons: ['0.13', '2.1', '3.1'] },
  { id: 'usb', x: 360, y: 102, w: 112, h: 74, name: 'USB', sub: 'device, host, JTAG', text: 'A full-speed USB port on GPIO19 and GPIO20. It can be a serial port, a keyboard or a drive, and it carries a built-in debugger so GDB works with only a cable.', lessons: ['1.15', '3.8'] },
  { id: 'rtc', x: 16, y: 188, w: 232, h: 62, name: 'Low-power domain', sub: 'RTC timer, 16 KB RTC RAM', text: 'A small island that stays powered in deep sleep. It can wake the chip on a timer or a pin, and its memory survives sleep. This is what makes battery life measured in months possible.', lessons: ['2.12', '6.5'] },
  { id: 'flash', x: 260, y: 188, w: 166, h: 62, name: 'Flash', sub: '16 MB, in the module', text: 'A separate chip inside the metal can. It holds the bootloader, the partition table, your application and any files. Code runs directly from it through a cache. This is the “N16” in N16R8.', lessons: ['1.7', '6.3'], ext: true },
  { id: 'psram', x: 438, y: 188, w: 166, h: 62, name: 'PSRAM', sub: '8 MB, in the module', text: 'Extra RAM on the same bus as the flash: far larger than internal RAM and slower. Camera frames and model data live here. It uses GPIO35 to 37, which is why you must not. This is the “R8”.', lessons: ['1.10', '9.9'], ext: true },
];
export function ChipMap() {
  const [sel, setSel] = useState('cpu');
  const b = BLOCKS.find(x => x.id === sel)!;
  return (
    <div className="widget">
      <svg viewBox="0 0 620 266" className="lab" role="group" aria-label="Block diagram of the ESP32-S3 module">
        <rect x="6" y="6" width="608" height="178" rx="12" fill="none" stroke="var(--rule)" /><text x="604" y="198" textAnchor="end">inside the chip above this line</text>
        {BLOCKS.map(k => <g key={k.id} role="button" tabIndex={0} aria-pressed={k.id === sel} onClick={() => setSel(k.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(k.id); } }}>
          <rect x={k.x} y={k.y} width={k.w} height={k.h} rx="9" className={'blk' + (k.id === sel ? ' on' : '') + (k.ext ? ' ext' : '')} />
          <text x={k.x + 12} y={k.y + 26} className="t-ink" style={{ fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 600, pointerEvents: 'none' }}>{k.name}</text>
          <text x={k.x + 12} y={k.y + 44} style={{ pointerEvents: 'none' }}>{k.sub.length > k.w / 6.4 ? k.sub.slice(0, Math.floor(k.w / 6.4) - 1) + '…' : k.sub}</text></g>)}
      </svg>
      <div className="kv"><div><span>{b.name}</span><b>{b.sub}</b></div></div>
      <p className="note">{b.text} Covered in {b.lessons.map((l, i) => <span key={l}>{i > 0 && ', '}<a href={lessonHref(l)}>{l}</a></span>)}.</p>
      <p className="fine">Sizes are from the ESP32-S3 Series Datasheet as I know it; confirm them on its first page, which is part of lesson 0.6.</p>
    </div>
  );
}

/* ---------------- From reset to app_main ---------------- */
const BOOT: [string, string, string, string, string][] = [
  ['Reset', 'power-on, button, watchdog, panic', 'Something restarts the chip. The cause is recorded in a register so the next stage can report it.', 'Nothing yet.', 'No: it is an event, not code.'],
  ['ROM bootloader', 'in the chip, permanent', 'Reads the strapping pins to choose between running from flash and waiting for a download over serial or USB. Loads the next stage from the start of flash.', 'The reset reason and the boot mode. These are the first lines of every log.', 'No. You can only influence it through strapping pins and eFuses.'],
  ['Second-stage bootloader', 'in flash, built by you', 'Reads the partition table, decides which application to start (this is where OTA rollback happens), checks the image and maps it into memory.', 'Its version, the flash settings, the partition table and one line per loaded segment.', 'Yes: it is built from ESP-IDF source with your project, and menuconfig has a section for it.'],
  ['Start-up code', 'in flash, part of your app', 'Sets up the heap and the clocks, starts the second core, starts FreeRTOS and creates the main task.', 'The ESP-IDF version, the CPU frequency, heap regions.', 'Mostly through menuconfig options.'],
  ['app_main()', 'your code', 'An ordinary function, called by the main task. When it returns the task is deleted; the system keeps running.', 'Whatever you print.', 'Entirely yours.'],
];
export function BootFlow() {
  const [i, setI] = useState(0);
  const s = BOOT[i];
  return (
    <div className="widget">
      <div className="steps">{BOOT.map((b, k) => <button key={b[0]} type="button" className={'step' + (k === i ? ' on' : k < i ? ' past' : '')} aria-pressed={k === i} onClick={() => setI(k)}><small>{k === 0 ? 'event' : 'stage ' + k}</small>{b[0]}</button>)}</div>
      <div className="kv"><div><span>Where it lives</span><b>{s[1]}</b></div><div><span>Can you change it?</span><b>{s[4]}</b></div></div>
      <p className="note"><b>What it does.</b> {s[2]}</p>
      <p className="note ok"><b>What it prints.</b> {s[3]}</p>
      <p><button type="button" className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button> <button type="button" className="btn" disabled={i === BOOT.length - 1} onClick={() => setI(i + 1)}>Next stage</button></p>
    </div>
  );
}

/* ---------------- Clock, prescaler, counter, compare: how a timer makes PWM ---------------- */
export function TimerLab() {
  const [pre, setPre] = useState(2), [period, setPeriod] = useState(8), [cmp, setCmp] = useState(3), [fclk, setFclk] = useState(80e6);
  const N = 96, u = 5.6, x0 = 56, c = Math.min(cmp, period);
  const clk = Array.from({ length: N * 2 }, (_, i) => (i % 2 === 0 ? 1 : 0));
  const count = Array.from({ length: N }, (_, i) => Math.floor(i / pre) % period);
  const out = count.map(v => (v < c ? 1 : 0));
  const st = (lv: number[], unit: number, hi: number, lo: number) => { let d = `M${x0} ${lv[0] ? hi : lo}`; lv.forEach((v, i) => { if (i > 0 && v !== lv[i - 1]) d += `V${v ? hi : lo}`; d += `H${(x0 + (i + 1) * unit).toFixed(1)}`; }); return d; };
  const cy = (v: number) => 128 - v / Math.max(1, period - 1) * 52;
  let saw = `M${x0} ${cy(count[0])}`; count.forEach((v, i) => { if (i > 0 && v !== count[i - 1]) saw += `V${cy(v).toFixed(1)}`; saw += `H${(x0 + (i + 1) * u).toFixed(1)}`; });
  const fout = fclk / (pre * period);
  return (
    <div className="widget">
      <div className="wrow">
        <Slide label="Prescaler: divide the clock by" value={pre} min={1} max={8} onChange={setPre} />
        <Slide label="Period: counter wraps after" value={period} min={2} max={16} show={period + ' ticks'} onChange={setPeriod} />
        <Slide label="Compare: output high while count is below" value={c} min={0} max={period} onChange={setCmp} />
      </div>
      <svg viewBox="0 0 600 196" className="lab" role="img" aria-label="Source clock, counter value and PWM output">
        <text x="4" y="30">clock</text><path d={st(clk, u / 2, 18, 34)} className="c3" />
        <text x="4" y="104">count</text><path d={saw} className="c2" />
        <line x1={x0} x2={x0 + N * u} y1={cy(c - 0.5)} y2={cy(c - 0.5)} className="c1 dash" /><text x={x0 + N * u} y={cy(c - 0.5) - 5} textAnchor="end" className="t-acc">compare = {c}</text>
        <text x="4" y="170">output</text><path d={st(out, u, 152, 180)} className="c4" />
      </svg>
      <div className="wrow"><Num label="Scale it to a real source clock" value={fclk} onChange={setFclk} unit="Hz" /></div>
      <div className="kv"><div><span>Timer tick = clock / prescaler</span><b>{eng(fclk / pre, 'Hz')}</b></div><div><span>Output frequency = clock / (prescaler × period)</span><b className="big">{eng(fout, 'Hz')}</b></div><div><span>Duty cycle = compare / period</span><b className="big">{(c / period * 100).toFixed(1)}%</b></div><div><span>Duty resolution</span><b>{period} steps, {Math.log2(period).toFixed(1)} bits</b></div></div>
      <p className="note">Every timer peripheral is these three numbers. The prescaler slows the clock, the period sets when the counter wraps, and a comparator turns the count into an output. Raise the period for finer duty steps and the output frequency falls: that trade is the “resolution versus frequency” table in every PWM driver’s documentation. Real values are larger (an 80 MHz clock, a period in the thousands) but the arithmetic is identical.</p>
    </div>
  );
}

/* ---------------- Jitter: three ways to wait ---------------- */
type Wait = 'timer' | 'busy' | 'delay';
export function jitterModel(method: Wait, targetMs: number, radio: boolean, n = 400): number[] {
  const r = rng(method.length * 97 + targetMs * 13 + (radio ? 5 : 0)), gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += r(); return (s - 3) / 0.707; };
  const tick = 10; // ms: the default FreeRTOS tick period in ESP-IDF is 10 ms (100 Hz)
  return Array.from({ length: n }, () => {
    if (method === 'timer') return targetMs * 1000 + gauss() * 1.2;
    if (method === 'busy') return targetMs * 1000 + Math.abs(gauss()) * 2 + (radio && r() < 0.06 ? 40 + r() * 320 : 0) + (r() < 0.02 ? 15 + r() * 30 : 0);
    const ticks = Math.floor(targetMs / tick); // pdMS_TO_TICKS truncates
    return ticks === 0 ? 30 + Math.abs(gauss()) * 8 : ticks * tick * 1000 + gauss() * 25 + (radio && r() < 0.05 ? r() * 400 : 0);
  });
}
export function JitterLab() {
  const [method, setMethod] = useState<Wait>('busy'), [target, setTarget] = useState(5), [radio, setRadio] = useState(1);
  const periods = useMemo(() => jitterModel(method, target, !!radio), [method, target, radio]);
  const mean = periods.reduce((a, b) => a + b, 0) / periods.length, min = Math.min(...periods), max = Math.max(...periods);
  const lo = Math.min(min, target * 1000) - 5, hi = Math.max(max, target * 1000) + 5, bins = 48;
  const hist = Array(bins).fill(0); periods.forEach(p => { hist[Math.min(bins - 1, Math.floor((p - lo) / (hi - lo) * bins))]++; });
  const top = Math.max(...hist), X = (us: number) => 40 + (us - lo) / (hi - lo) * 540;
  return (
    <div className="widget">
      <div className="wrow">
        <Seg label="How the code waits" value={method} onChange={setMethod} options={[['busy', 'Busy loop'], ['delay', 'vTaskDelay'], ['timer', 'Hardware timer']] as const} />
        <Seg label="Wi-Fi and interrupts" value={radio} onChange={setRadio} options={[[0, 'Quiet'], [1, 'Active']] as [number, string][]} />
        <Slide label="Period you asked for" value={target} min={1} max={50} show={target + ' ms'} onChange={setTarget} />
      </div>
      <svg viewBox="0 0 600 180" className="lab" role="img" aria-label="Histogram of the periods actually produced">
        {hist.map((h, i) => h > 0 && <rect key={i} x={40 + i * 540 / bins + 1} y={140 - Math.sqrt(h / top) * 118} width={540 / bins - 2} height={Math.sqrt(h / top) * 118} rx="1.5" className="fbar" />)}
        <line x1="40" x2="580" y1="140" y2="140" className="gridl" />
        <line x1={X(target * 1000)} x2={X(target * 1000)} y1="12" y2="146" className="c1 dash" /><text x={X(target * 1000)} y="160" textAnchor="middle" className="t-acc">asked: {target} ms</text>
        <text x="40" y="174">{(lo / 1000).toFixed(3)} ms</text><text x="580" y="174" textAnchor="end">{(hi / 1000).toFixed(3)} ms</text>
      </svg>
      <div className="kv"><div><span>Mean period</span><b>{(mean / 1000).toFixed(3)} ms</b></div><div><span>Shortest to longest</span><b>{(min / 1000).toFixed(3)} to {(max / 1000).toFixed(3)} ms</b></div><div><span>Peak-to-peak jitter</span><b className="big">{eng((max - min) / 1e6, 's')}</b></div><div><span>Error in the mean</span><b>{((mean / 1000 - target) / target * 100).toFixed(1)}%</b></div></div>
      <p className={'note ' + (method === 'delay' && target % 10 !== 0 ? 'warn' : '')}>{method === 'busy' ? 'A busy loop is accurate on average, but every interrupt that fires during the wait is added to it, so the worst case has a long tail. It also holds a CPU core at 100% and starves lower-priority tasks.'
        : method === 'delay' ? (target < 10 ? `vTaskDelay counts scheduler ticks, and the default tick is 10 ms. pdMS_TO_TICKS(${target}) truncates to 0 ticks, so the call returns almost at once and the loop runs flat out. Nothing warns you.` : `vTaskDelay counts scheduler ticks, and the default tick is 10 ms. Ask for ${target} ms and you get ${Math.floor(target / 10) * 10} ms. It costs no CPU while waiting, which is why it is still the right call for anything slower than the tick.`)
        : 'A hardware timer counts on its own and raises an interrupt at the exact count. Jitter falls to the time it takes to enter the interrupt handler. This is what lesson 2.3 builds.'}</p>
      <p className="fine">Bar heights use a square-root scale so the rare late periods stay visible. This is an illustrative model, not a measurement. Lesson 0.9 has you capture the real distribution from your board with the logic analyzer and compare.</p>
    </div>
  );
}

/* ---------------- Floating point and fixed point, bit by bit ---------------- */
const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
export const floatBits = (x: number) => { f32[0] = x; return u32[0]; };
export const bitsFloat = (b: number) => { u32[0] = b >>> 0; return f32[0]; };
export function FloatLab() {
  const [text, setText] = useState('0.1'), [bits, setBits] = useState(floatBits(0.1)), [frac, setFrac] = useState(8);
  const val = bitsFloat(bits), sign = bits >>> 31, exp = (bits >>> 23) & 0xff, man = bits & 0x7fffff;
  const kind = exp === 255 ? (man ? 'NaN' : 'infinity') : exp === 0 ? (man ? 'subnormal' : 'zero') : 'normal';
  const ulp = exp === 0 || exp === 255 ? NaN : 2 ** (exp - 127 - 23);
  const asked = Number(text), raw = Math.round(asked * 2 ** frac), fixed = raw / 2 ** frac;
  const typed = (s: string) => { setText(s); const n = Number(s); if (s.trim() !== '' && !Number.isNaN(n)) setBits(floatBits(n)); };
  const cls = (i: number) => (i === 31 ? 's' : i >= 23 ? 'e' + (i === 23 ? ' last' : '') : 'm');
  return (
    <div className="widget">
      <div className="wrow"><label className="field"><span>Type a number</span><input className="mono" value={text} onChange={e => typed(e.target.value)} /></label>
        <div className="field"><span>Try</span><div className="seg">{['0.1', '0.5', '1', '3.3', '16777217', '1e-45'].map(s => <button key={s} type="button" onClick={() => typed(s)}>{s}</button>)}</div></div></div>
      <div className="fbits" role="group" aria-label="The 32 bits of a float: sign, exponent, mantissa">{Array.from({ length: 32 }, (_, k) => 31 - k).map(i => <button key={i} type="button" className={cls(i) + (((bits >>> i) & 1) ? ' on' : '')} aria-label={`bit ${i}`} onClick={() => { const nb = (bits ^ (1 << i)) >>> 0; setBits(nb); setText(String(bitsFloat(nb))); }}>{(bits >>> i) & 1}</button>)}</div>
      <div className="legend"><span style={{ color: 'var(--ch3)' }}>sign, 1 bit</span><span style={{ color: 'var(--ch2)' }}>exponent, 8 bits</span><span style={{ color: 'var(--ch1)' }}>mantissa, 23 bits</span></div>
      <div className="kv">
        <div><span>What a float actually stores</span><b className="big">{kind === 'normal' || kind === 'subnormal' ? val.toPrecision(12) : String(val)}</b></div>
        <div><span>Error against what you typed</span><b>{Number.isFinite(asked) && Number.isFinite(val) ? (val - asked).toExponential(2) : '—'}</b></div>
        <div><span>Raw bits</span><b>{hex(bits, 8)}</b></div>
        <div><span>Decoded</span><b>{sign ? '−' : '+'}{kind === 'normal' ? `1.m × 2^${exp - 127}` : kind}</b></div>
        <div><span>Gap to the next float up</span><b>{Number.isNaN(ulp) ? '—' : ulp.toExponential(2)}</b></div>
      </div>
      <p className="note">A float has 24 bits of precision wherever the value sits, so the gap between neighbours grows with magnitude. 0.1 has no exact binary form, and above 16,777,216 a float can no longer count by ones. Click any bit to see what it contributes. Comparing floats with <code>==</code> fails for exactly this reason.</p>
      <div className="subpanel"><h4>The same number in fixed point</h4>
        <div className="wrow"><Slide label="Fractional bits (Q format)" value={frac} min={0} max={16} show={`Q${16 - frac}.${frac}`} onChange={setFrac} /></div>
        <div className="kv"><div><span>Stored integer = round(x × 2^{frac})</span><b className="big">{Number.isFinite(raw) ? raw : '—'}</b></div><div><span>Represents</span><b>{Number.isFinite(fixed) ? fixed : '—'}</b></div><div><span>Step size, constant everywhere</span><b>{(1 / 2 ** frac).toPrecision(3)}</b></div><div><span>Fits in int16?</span><b>{Math.abs(raw) <= 32767 ? 'yes' : 'no: overflows'}</b></div></div>
        <p className="note">Fixed point is an ordinary integer with an agreed scale. The step is the same at every magnitude, the arithmetic is integer arithmetic, and overflow is your problem. It is also exactly what a quantized neural network does with its weights in Phase 9.</p></div>
    </div>
  );
}

/* ---------------- GPIO registers: OUT, W1TS, W1TC, ENABLE ---------------- */
type Reg = 'OUT' | 'W1TS' | 'W1TC' | 'ENABLE';
export function RegisterLab() {
  const [out, setOut] = useState(0x01), [en, setEn] = useState(0x0f), [reg, setReg] = useState<Reg>('W1TS'), [text, setText] = useState('0x04'), [log, setLog] = useState<string[]>([]);
  const say = (s: string) => setLog(l => [s, ...l].slice(0, 7));
  const write = () => {
    const v = (parseNum(text) || 0) & 0xff;
    if (reg === 'OUT') { setOut(v); say(`REG_WRITE(GPIO_OUT_REG, ${hex(v)});        // every pin replaced`); }
    if (reg === 'W1TS') { setOut(o => o | v); say(`REG_WRITE(GPIO_OUT_W1TS_REG, ${hex(v)});   // 1s set, 0s untouched`); }
    if (reg === 'W1TC') { setOut(o => o & ~v & 0xff); say(`REG_WRITE(GPIO_OUT_W1TC_REG, ${hex(v)});   // 1s cleared, 0s untouched`); }
    if (reg === 'ENABLE') { setEn(v); say(`REG_WRITE(GPIO_ENABLE_REG, ${hex(v)});     // which pins drive`); }
  };
  const race = (safe: boolean) => {
    if (safe) { setOut(o => o | 0x80 | 0x02); say('ISR:  W1TS = 0x80   task: W1TS = 0x02   → both bits set, in either order'); }
    else if (out & 0x80) { setOut(o => o & 0x7f); say('// bit 7 was already set; cleared it so the race is visible. Run it again.'); }
    else { setOut(o => o | 0x02); say('task reads OUT → ISR sets bit 7 → task writes (old | 0x02) → bit 7 is lost'); }
  };
  return (
    <div className="widget">
      <div className="leds" aria-label="Eight LEDs on GPIO 7 down to 0">{[7, 6, 5, 4, 3, 2, 1, 0].map(i => { const on = (out >> i) & 1 && (en >> i) & 1; return <div key={i} className={'led' + (on ? ' on' : '') + (!((en >> i) & 1) ? ' off-en' : '')}><i />{i}</div>; })}</div>
      <div className="kv"><div><span>GPIO_OUT_REG</span><b className="big">{hex(out)} = {out.toString(2).padStart(8, '0')}</b></div><div><span>GPIO_ENABLE_REG (dashed = not driving)</span><b>{hex(en)} = {en.toString(2).padStart(8, '0')}</b></div></div>
      <div className="wrow">
        <Seg label="Write to" value={reg} onChange={setReg} options={[['OUT', 'OUT'], ['W1TS', 'OUT_W1TS'], ['W1TC', 'OUT_W1TC'], ['ENABLE', 'ENABLE']] as const} />
        <label className="field"><span>Value</span><input className="mono" style={{ width: 90 }} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') write(); }} /></label>
        <button type="button" className="btn" onClick={write}>Write register</button>
      </div>
      <div className="wrow"><div className="field"><span>An interrupt sets bit 7 while your task sets bit 1</span><div className="seg"><button type="button" onClick={() => race(false)}>Using OUT |= …</button><button type="button" onClick={() => race(true)}>Using W1TS</button></div></div></div>
      <pre className="log"><code>{log.length ? log.join('\n') : '// Writes appear here as the C you would type.'}</code></pre>
      <p className="note"><code>OUT |= mask</code> is three steps: read, modify, write. An interrupt between the read and the write is silently undone. Writing a 1 to the set or clear register is a single store that touches only the bits you name, which is why the ESP32, STM32 and most modern chips provide them. This model shows eight pins; the real registers are 32 bits wide. Finding their addresses in the Technical Reference Manual is the lab in lesson 0.13.</p>
    </div>
  );
}
