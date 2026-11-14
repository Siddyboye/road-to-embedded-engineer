import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Seg, Slide, eng, rng, useTicker } from '../lib/ui';

const VDD = 3.3, VIH = 0.75 * VDD, VIL = 0.25 * VDD; // input thresholds as fractions of the supply; confirm in your chip's DC characteristics table
const step = (levels: number[], x0: number, u: number, yHi: number, yLo: number) => {
  let d = `M${x0} ${levels[0] ? yHi : yLo}`;
  levels.forEach((lv, i) => { if (i > 0 && lv !== levels[i - 1]) d += `V${lv ? yHi : yLo}`; d += `H${(x0 + (i + 1) * u).toFixed(2)}`; });
  return d;
};

/* ---------------- LED and resistor, with current you can see ---------------- */
const LEDS: [string, number, string][] = [['Red', 1.9, '#ff5a5f'], ['Green', 2.1, '#3dd68c'], ['Blue', 3.0, '#5ec2ff'], ['White', 3.1, '#f4f4f8']];
export function CircuitLab() {
  const [vs, setVs] = useState(3.3), [logR, setLogR] = useState(Math.log10(330)), [led, setLed] = useState(0);
  const r = Number((10 ** logR).toPrecision(2)), [, vf, color] = LEDS[led];
  const amps = Math.max(0, (vs - vf) / r), ma = amps * 1000, lit = Math.min(1, ma / 15);
  const verdict = vs <= vf ? ['warn', 'The supply is below this LED’s forward voltage, so almost no current flows and it stays dark. This is why a blue LED barely lights from a 3.3 V pin.']
    : ma < 1 ? ['', 'Under 1 mA: visible indoors, but dim.']
    : ma <= 12 ? ['ok', 'A comfortable indicator current. Modern LEDs are clearly visible at 2 to 5 mA.']
    : ma <= 20 ? ['', 'Bright, and more than an indicator needs. Every milliamp matters on a battery.']
    : ['warn', 'Above 20 mA. Check the pin’s rated drive current in the datasheet before asking a GPIO for this; switch larger loads with a transistor.'];
  return (
    <div className="widget">
      <div className="wrow">
        <Slide label="Supply voltage" value={vs} min={1.8} max={5} step={0.1} show={vs.toFixed(1) + ' V'} onChange={setVs} />
        <Slide label="Resistor" value={logR} min={1.5} max={4} step={0.01} show={eng(r, 'Ω')} onChange={setLogR} />
        <Seg label="LED" value={led} onChange={setLed} options={LEDS.map((l, i) => [i, l[0]] as [number, string])} />
      </div>
      <svg viewBox="0 0 600 210" className="lab" role="img" aria-label={`Circuit carrying ${ma.toFixed(1)} milliamps`}>
        <path d="M110 70 H520 V170 H70 V130" className="wire" />
        {ma > 0.05 && <path d="M110 70 H520 V170 H70 V130" className="flow" style={{ '--dur': `${Math.max(0.12, 6 / ma).toFixed(2)}s` } as CSSProperties} />}
        <rect x="30" y="50" width="80" height="80" rx="8" className="part" /><text x="70" y="86" textAnchor="middle" className="t-ink">{vs.toFixed(1)} V</text><text x="70" y="104" textAnchor="middle">GPIO or supply</text>
        <rect x="200" y="56" width="90" height="28" rx="4" className="part" /><path d="M208 70 l8 -9 l12 18 l12 -18 l12 18 l12 -18 l12 18 l6 -9" className="wire" /><text x="245" y="46" textAnchor="middle" className="t-ink">{eng(r, 'Ω')}</text><text x="245" y="104" textAnchor="middle">drops {Math.max(0, vs - vf).toFixed(2)} V</text>
        <circle cx="400" cy="70" r={10 + 34 * lit} fill={color} opacity={0.08 + 0.35 * lit} /><circle cx="400" cy="70" r={6 + 14 * lit} fill={color} opacity={0.15 + 0.5 * lit} />
        <path d="M386 54 V86 L414 70 Z" fill={color} fillOpacity={0.25 + 0.75 * lit} stroke={color} strokeWidth="1.5" /><path d="M414 54 V86" stroke={color} strokeWidth="2.5" />
        <text x="400" y="38" textAnchor="middle" className="t-ink">{LEDS[led][0]} LED</text><text x="400" y="110" textAnchor="middle">drops about {vf.toFixed(1)} V</text>
        <text x="300" y="194" textAnchor="middle" className="t-acc">{ma.toFixed(2)} mA flows through every part of the loop</text>
      </svg>
      <div className="kv">
        <div><span>I = (Vs − Vf) / R</span><b className="big">{ma.toFixed(2)} mA</b></div>
        <div><span>Power in the resistor, I²R</span><b>{eng(amps * amps * r, 'W')}</b></div>
        <div><span>Power in the LED, I × Vf</span><b>{eng(amps * vf, 'W')}</b></div>
        <div><span>A 2000 mAh cell would last</span><b>{ma > 0.01 ? (2000 / ma).toFixed(0) + ' h on this LED alone' : 'practically forever'}</b></div>
      </div>
      <p className={'note ' + verdict[0]}>{verdict[1]}</p>
      <p className="fine">The LED is modelled as a fixed voltage drop, which is close enough for choosing a resistor. Real forward voltage rises slightly with current.</p>
    </div>
  );
}

/* ---------------- Floating pins, pull-ups and thresholds ---------------- */
export function PinLab() {
  const [mode, setMode] = useState<'float' | 'up' | 'down'>('float');
  const [pressed, setPressed] = useState(false);
  const [trace, setTrace] = useState<number[]>(() => Array(90).fill(VDD / 2));
  useEffect(() => {
    let n = 0, drift = VDD / 2;
    const t = setInterval(() => {
      n++;
      let v: number;
      if (mode === 'up') v = pressed ? 0 : VDD; else if (mode === 'down') v = pressed ? VDD : 0;
      else if (pressed) v = 0;
      else { drift = Math.max(0.1, Math.min(VDD - 0.1, drift + (Math.random() - 0.5) * 0.5)); v = Math.max(0, Math.min(VDD, drift + 0.9 * Math.sin(n / 2.2) + (Math.random() - 0.5) * 0.3)); }
      setTrace(tr => [...tr.slice(1), v]);
    }, 70);
    return () => clearInterval(t);
  }, [mode, pressed]);
  let last = 1; const digital = trace.map(v => (last = v > VIH ? 1 : v < VIL ? 0 : last));
  const edges = digital.reduce((s, d, i) => s + (i > 0 && d !== digital[i - 1] ? 1 : 0), 0);
  const u = 6, x0 = 50, yA = (v: number) => 20 + (1 - v / VDD) * 100;
  const now = trace[trace.length - 1];
  return (
    <div className="widget">
      <div className="wrow">
        <Seg label="Pin configuration" value={mode} onChange={setMode} options={[['float', 'Floating input'], ['up', 'Pull-up, button to ground'], ['down', 'Pull-down, button to 3.3 V']] as const} />
        <button type="button" className={'btn' + (pressed ? '' : ' ghost')} aria-pressed={pressed} onClick={() => setPressed(p => !p)}>{pressed ? 'Button held: release' : 'Press the button'}</button>
      </div>
      <svg viewBox="0 0 600 200" className="lab" role="img" aria-label="Pin voltage over time, and what the chip reads">
        <rect x={x0} y={yA(VIH)} width={90 * u} height={yA(VIL) - yA(VIH)} className="band" />
        <line x1={x0} x2={x0 + 90 * u} y1={yA(VIH)} y2={yA(VIH)} className="gridl dash" /><line x1={x0} x2={x0 + 90 * u} y1={yA(VIL)} y2={yA(VIL)} className="gridl dash" />
        <text x="4" y={yA(VDD) + 4}>3.3 V</text><text x="4" y={yA(0) + 4}>0 V</text><text x={x0 + 90 * u - 4} y={yA(VIH) - 4} textAnchor="end">reads 1 above {VIH.toFixed(2)} V</text><text x={x0 + 90 * u - 4} y={yA(VIL) + 13} textAnchor="end">reads 0 below {VIL.toFixed(2)} V</text>
        <text x={x0 + 8} y={yA(VDD / 2) + 4}>undefined</text>
        <polyline points={trace.map((v, i) => `${x0 + i * u},${yA(v).toFixed(1)}`).join(' ')} className="c1" />
        <path d={step(digital, x0, u, 150, 180)} className="c2" /><text x="4" y="158">read 1</text><text x="4" y="184">read 0</text>
      </svg>
      <div className="kv"><div><span>Pin voltage now</span><b className="big">{now.toFixed(2)} V</b></div><div><span>gpio_get_level() returns</span><b className="big">{digital[digital.length - 1]}</b></div><div><span>Level changes in this window</span><b>{edges}</b></div></div>
      <p className={'note ' + (mode === 'float' && !pressed ? 'warn' : 'ok')}>{mode === 'float'
        ? (pressed ? 'Pressed, the button ties the pin firmly to ground. Release it and nothing holds the pin at all.' : 'Nothing drives the pin, so it follows stray electric fields: mains hum, your hand, the wire next to it. An edge-triggered interrupt here fires at random.')
        : mode === 'up' ? 'A resistor to 3.3 V holds the pin high until the button pulls it to ground. Pressed reads 0: the logic is inverted, and that is normal.'
        : 'A resistor to ground holds the pin low until the button connects it to 3.3 V. Pressed reads 1.'}</p>
    </div>
  );
}

/* ---------------- Contact bounce and debouncing ---------------- */
export function bounceWave(seed: number, bounceMs: number): number[] {
  const r = rng(seed), dt = 0.05, n = 900, lv = Array(n).fill(1);
  const burst = (start: number, to: number) => {
    const k = 2 + Math.floor(r() * 3 + bounceMs), times = Array.from({ length: 2 * k + 1 }, () => start + r() * bounceMs).sort((a, b) => a - b);
    let cur = 1 - to; let ti = 0;
    for (let i = Math.round(start / dt); i < n; i++) { while (ti < times.length && i * dt >= times[ti]) { cur = 1 - cur; ti++; } lv[i] = ti >= times.length ? to : cur; }
  };
  burst(5, 0); burst(25, 1);
  return lv;
}
export function debounce(raw: number[], windowMs: number, dt = 0.05): number[] {
  const need = Math.round(windowMs / dt); let out = raw[0], run = 0;
  return raw.map((v, i) => { run = i > 0 && v === raw[i - 1] ? run + 1 : 0; if (v !== out && run >= need) out = v; return out; });
}
const falls = (lv: number[]) => lv.reduce((s, v, i) => s + (i > 0 && v === 0 && lv[i - 1] === 1 ? 1 : 0), 0);
export function BounceLab() {
  const [seed, setSeed] = useState(7), [bounce, setBounce] = useState(3), [win, setWin] = useState(5);
  const raw = useMemo(() => bounceWave(seed, bounce), [seed, bounce]);
  const clean = useMemo(() => debounce(raw, win), [raw, win]);
  const u = 540 / 900, x0 = 50, detect = clean.findIndex(v => v === 0);
  return (
    <div className="widget">
      <div className="wrow">
        <Slide label="How badly the contact bounces" value={bounce} min={0.5} max={8} step={0.5} show={bounce + ' ms'} onChange={setBounce} />
        <Slide label="Debounce window: level must hold this long" value={win} min={0} max={15} step={0.5} show={win + ' ms'} onChange={setWin} />
        <button type="button" className="btn" onClick={() => setSeed(s => s + 1)}>Press again</button>
      </div>
      <svg viewBox="0 0 600 170" className="lab" role="img" aria-label="Raw and debounced button signal">
        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45].map(ms => <g key={ms}><line x1={x0 + ms / 0.05 * u} x2={x0 + ms / 0.05 * u} y1="12" y2="140" className="gridl" /><text x={x0 + ms / 0.05 * u} y="158" textAnchor="middle">{ms} ms</text></g>)}
        <path d={step(raw, x0, u, 22, 62)} className="c1" /><text x="4" y="46">raw pin</text>
        <path d={step(clean, x0, u, 92, 132)} className="c4" /><text x="4" y="116">debounced</text>
        {detect > 0 && <text x={x0 + detect * u + 4} y="86" className="t-acc">press accepted at {(detect * 0.05).toFixed(1)} ms</text>}
      </svg>
      <div className="kv"><div><span>Falling edges an interrupt would count</span><b className="big">{falls(raw)}</b></div><div><span>Presses after debouncing</span><b className="big">{falls(clean)}</b></div><div><span>Delay added to a real press</span><b>{detect > 0 ? (detect * 0.05 - 5).toFixed(1) + ' ms' : 'never accepted'}</b></div></div>
      <p className={'note ' + (falls(clean) === 1 ? 'ok' : 'warn')}>{falls(clean) === 1 ? 'One press, one event. The cost is latency: the window is added to every press, so make it as short as your switch allows.'
        : falls(clean) === 0 ? 'The window is longer than the press is stable, so the press is never accepted.' : 'The window is shorter than the bounce, so one press still counts several times. Lengthen it, or measure your real switch on the logic analyzer.'}</p>
    </div>
  );
}

/* ---------------- Sampling, aliasing and quantization ---------------- */
export const aliasOf = (f: number, fs: number) => f - Math.round(f / fs) * fs; // signed: negative means phase-inverted
export function SamplingLab() {
  const [f, setF] = useState(12), [fs, setFs] = useState(80), [bits, setBits] = useState(8);
  const W = 0.25, x0 = 40, w = 540, mid = 105, amp = 80, X = (t: number) => x0 + t / W * w, Y = (v: number) => mid - v * amp;
  const levels = 2 ** bits, quant = (v: number) => Math.round((v + 1) / 2 * (levels - 1)) / (levels - 1) * 2 - 1;
  const cont = Array.from({ length: 500 }, (_, i) => { const t = i / 499 * W; return `${X(t).toFixed(1)},${Y(Math.sin(2 * Math.PI * f * t)).toFixed(1)}`; }).join(' ');
  const samples = Array.from({ length: Math.floor(W * fs) + 1 }, (_, n) => ({ t: n / fs, v: quant(Math.sin(2 * Math.PI * f * n / fs)) }));
  const fa = aliasOf(f, fs), aliased = f > fs / 2;
  const ghost = Array.from({ length: 300 }, (_, i) => { const t = i / 299 * W; return `${X(t).toFixed(1)},${Y(Math.sin(2 * Math.PI * fa * t)).toFixed(1)}`; }).join(' ');
  let hold = `M${X(0)} ${Y(samples[0].v)}`; samples.forEach((s, i) => { if (i > 0) hold += `H${X(s.t).toFixed(1)}V${Y(s.v).toFixed(1)}`; }); hold += `H${X(W)}`;
  return (
    <div className="widget">
      <div className="wrow">
        <Slide label="Signal frequency" value={f} min={1} max={120} show={f + ' Hz'} onChange={setF} />
        <Slide label="Sample rate" value={fs} min={10} max={240} step={2} show={fs + ' Hz'} onChange={setFs} />
        <Slide label="ADC resolution" value={bits} min={1} max={12} show={`${bits} bits, ${levels} levels`} onChange={setBits} />
      </div>
      <svg viewBox="0 0 600 210" className="lab" role="img" aria-label="A sine wave, its samples, and the signal the samples appear to describe">
        <line x1={x0} x2={x0 + w} y1={mid} y2={mid} className="gridl" />
        <polyline points={cont} className="c2" />
        {bits < 9 && <path d={hold} className="c3" />}
        {aliased && <polyline points={ghost} className="c1 dash" />}
        {samples.map((s, i) => <circle key={i} cx={X(s.t)} cy={Y(s.v)} r="3.2" className="f1" />)}
        <text x={x0} y="200">0</text><text x={x0 + w} y="200" textAnchor="end">250 ms</text>
      </svg>
      <div className="legend"><span className="ln-a">the real signal</span><span className="ln-b">{aliased ? 'samples, and the lower tone they appear to be' : 'samples'}</span>{bits < 9 && <span style={{ color: 'var(--ch3)' }}>what the ADC reports</span>}</div>
      <div className="kv"><div><span>Nyquist limit, fs / 2</span><b>{fs / 2} Hz</b></div><div><span>Samples per cycle</span><b>{(fs / f).toFixed(1)}</b></div><div><span>The samples look like</span><b className="big">{Math.abs(fa).toFixed(0)} Hz</b></div><div><span>One ADC step</span><b>{(100 / (levels - 1 || 1)).toFixed(levels > 500 ? 3 : 1)}% of full scale</b></div></div>
      <p className={'note ' + (aliased ? 'warn' : 'ok')}>{aliased ? `${f} Hz is above the Nyquist limit. Every dot sits on the real signal and on the dashed ${Math.abs(fa).toFixed(0)} Hz one; from the samples alone they cannot be told apart.`
        : fs / f < 5 ? 'Below the limit, so the frequency is recoverable, but with so few samples per cycle the shape and peak are poorly captured. Ten or more per cycle is a practical target.'
        : 'Comfortably sampled. Now drag the signal frequency past half the sample rate.'}</p>
    </div>
  );
}

/* ---------------- Ultrasonic time of flight ---------------- */
export function EchoLab() {
  const [cm, setCm] = useState(60), [temp, setTemp] = useState(25), [run, setRun] = useState(true);
  const t = useTicker(run);
  const c = 331.3 + 0.606 * temp, us = 2 * (cm / 100) / c * 1e6;
  const sx = 70, wx = 110 + cm / 400 * 440, p = (t % 1.6) / 1.6, out = p < 0.5, px = sx + (wx - sx) * (out ? p * 2 : 2 - p * 2);
  const ew = Math.max(3, us / 23500 * 430);
  const arc = (r: number) => out ? `M${px} ${75 - r} A${r} ${r} 0 0 1 ${px} ${75 + r}` : `M${px} ${75 - r} A${r} ${r} 0 0 0 ${px} ${75 + r}`;
  return (
    <div className="widget">
      <div className="wrow">
        <Slide label="Distance to the obstacle" value={cm} min={2} max={400} show={cm + ' cm'} onChange={setCm} />
        <Slide label="Air temperature" value={temp} min={0} max={45} show={temp + ' °C'} onChange={setTemp} />
        <button type="button" className="btn ghost" onClick={() => setRun(r => !r)}>{run ? 'Pause' : 'Play'}</button>
      </div>
      <svg viewBox="0 0 600 230" className="lab" role="img" aria-label="A sound pulse travelling to an obstacle and back, with the trigger and echo signals">
        <rect x="30" y="52" width="40" height="46" rx="5" className="part" /><circle cx="50" cy="65" r="6" className="wire" /><circle cx="50" cy="85" r="6" className="wire" /><text x="50" y="114" textAnchor="middle">sensor</text>
        <rect x={wx} y="30" width="8" height="90" className="fbar" /><text x={wx + 4} y="22" textAnchor="middle">{cm} cm</text>
        {[8, 16, 24].map(r => <path key={r} d={arc(r)} className={out ? 'c2' : 'c4'} opacity={1 - r / 34} />)}
        <text x="300" y="134" textAnchor="middle" className="t-ink">{out ? 'outbound: eight cycles of 40 kHz' : 'echo returning'}</text>
        <text x="4" y="166">TRIG</text><path d="M60 172 H80 V154 H86 V172 H560" className="c1" /><text x="90" y="150">10 µs</text>
        <text x="4" y="206">ECHO</text><path d={`M60 212 H100 V194 H${100 + ew} V212 H560`} className="c4" /><text x={104 + ew} y="200" className="t-acc">{us.toFixed(0)} µs high</text>
      </svg>
      <div className="kv"><div><span>Echo pulse width = 2 × distance / speed</span><b className="big">{us >= 1000 ? (us / 1000).toFixed(2) + ' ms' : us.toFixed(0) + ' µs'}</b></div><div><span>Speed of sound at {temp} °C</span><b>{c.toFixed(1)} m/s</b></div>
        <div><span>The “divide by 58” shortcut says</span><b>{(us / 58).toFixed(1)} cm</b></div><div><span>Timer resolution needed for 1 cm</span><b>{(2 / 100 / c * 1e6).toFixed(0)} µs</b></div></div>
      <p className="note">The sensor holds ECHO high for as long as the sound is in flight. Your firmware’s only job is to time that pulse accurately, which is why this sensor returns in the interrupt, timer and capture lessons. The shortcut assumes about 20 °C; at {temp} °C it is off by {Math.abs((us / 58 - cm) / cm * 100).toFixed(1)}%. The HC-SR04 runs on 5 V, so its echo pin needs a divider before it meets a 3.3 V input.</p>
    </div>
  );
}
