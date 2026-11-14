import { useMemo, useState } from 'react';
import { Num, Seg, Txt, eng, hex, parseNum } from '../lib/ui';

/* ---------------- Bit playground ---------------- */
export function BitPlayground() {
  const [v, setV] = useState(0x000000a5);
  const [n, setN] = useState(5);
  const [text, setText] = useState('0xA5');
  const set = (x: number) => { const u = x >>> 0; setV(u); setText(hex(u, 8)); };
  const bit = (i: number) => (v >>> i) & 1;
  const signed = v | 0;
  const low = v & 0xff;
  const bytesLE = [0, 8, 16, 24].map(s => (v >>> s) & 0xff);
  let pop = 0; for (let i = 0; i < 32; i++) pop += bit(i);
  return (
    <div className="widget">
      <div className="bits" role="group" aria-label="32-bit value, bit 31 on the left">
        {[3, 2, 1, 0].map(byte => (
          <div className="byte" key={byte}>
            {[7, 6, 5, 4, 3, 2, 1, 0].map(k => { const i = byte * 8 + k; return (
              <button key={i} type="button" className={'bit' + (bit(i) ? ' on' : '') + (i === n ? ' sel' : '')} aria-label={`bit ${i} is ${bit(i)}`}
                onClick={() => set(v ^ (1 << i))}>{bit(i)}<small>{i}</small></button>
            ); })}
          </div>
        ))}
      </div>
      <div className="wrow">
        <label className="field"><span>Value (hex 0x.., binary 0b.., or decimal)</span>
          <input className="mono" value={text} spellCheck={false} onChange={e => { setText(e.target.value); const p = parseNum(e.target.value); if (!Number.isNaN(p)) setV(p >>> 0); }} /></label>
        <Num label="Bit n" value={n} min={0} max={31} step={1} onChange={x => setN(Math.max(0, Math.min(31, Math.round(x || 0))))} />
        <div className="field"><span>Operate on bit n</span><div className="seg">
          <button type="button" onClick={() => set(v | (1 << n))}>Set</button>
          <button type="button" onClick={() => set(v & ~(1 << n))}>Clear</button>
          <button type="button" onClick={() => set(v ^ (1 << n))}>Toggle</button>
          <button type="button" onClick={() => set(v << 1)}>&lt;&lt; 1</button>
          <button type="button" onClick={() => set(v >>> 1)}>&gt;&gt; 1</button>
          <button type="button" onClick={() => set(~v)}>~</button>
        </div></div>
      </div>
      <div className="readout">
        <div>set    : <b>x |=  (1u &lt;&lt; {n});</b>   mask {hex((1 << n) >>> 0, 8)}</div>
        <div>clear  : <b>x &amp;= ~(1u &lt;&lt; {n});</b>   mask {hex(~(1 << n) >>> 0, 8)}</div>
        <div>toggle : <b>x ^=  (1u &lt;&lt; {n});</b></div>
        <div>test   : <b>(x &gt;&gt; {n}) &amp; 1u</b>  → {bit(n)}</div>
      </div>
      <div className="kv">
        <div><span>Hex</span><b>{hex(v, 8)}</b></div>
        <div><span>Unsigned</span><b>{v}</b></div>
        <div><span>Signed int32</span><b>{signed}</b></div>
        <div><span>Low byte as int8</span><b>{low > 127 ? low - 256 : low}</b></div>
        <div><span>Bits set</span><b>{pop}</b></div>
        <div><span>Bytes in memory, little-endian</span><b>{bytesLE.map(x => x.toString(16).toUpperCase().padStart(2, '0')).join(' ')}</b></div>
      </div>
      <p className="note">Always shift an unsigned constant (<code>1u</code>). Shifting a signed 1 into bit 31 is undefined behaviour in C.</p>
    </div>
  );
}

/* ---------------- CRC calculator ---------------- */
type CrcParams = { name: string; width: number; poly: number; init: number; refin: boolean; refout: boolean; xorout: number; use: string };
export const CRCS: CrcParams[] = [
  { name: 'CRC-8', width: 8, poly: 0x07, init: 0x00, refin: false, refout: false, xorout: 0x00, use: 'SMBus PEC, simple frames' },
  { name: 'CRC-8/MAXIM', width: 8, poly: 0x31, init: 0x00, refin: true, refout: true, xorout: 0x00, use: '1-Wire devices such as the DS18B20' },
  { name: 'CRC-16/CCITT-FALSE', width: 16, poly: 0x1021, init: 0xffff, refin: false, refout: false, xorout: 0x0000, use: 'Many custom serial protocols' },
  { name: 'CRC-16/XMODEM', width: 16, poly: 0x1021, init: 0x0000, refin: false, refout: false, xorout: 0x0000, use: 'XMODEM, SD card data blocks' },
  { name: 'CRC-16/MODBUS', width: 16, poly: 0x8005, init: 0xffff, refin: true, refout: true, xorout: 0x0000, use: 'Modbus RTU frames' },
  { name: 'CRC-32', width: 32, poly: 0x04c11db7, init: 0xffffffff, refin: true, refout: true, xorout: 0xffffffff, use: 'Ethernet, zip, PNG, ESP-IDF image checks' },
];
const reflect = (x: number, bits: number) => { let r = 0; for (let i = 0; i < bits; i++) if ((x >>> i) & 1) r |= 1 << (bits - 1 - i); return r >>> 0; };
export function crcSteps(bytes: number[], p: CrcParams): number[] {
  const mask = p.width === 32 ? 0xffffffff : (1 << p.width) - 1;
  const top = p.width === 32 ? 0x80000000 : 1 << (p.width - 1);
  let reg = p.init >>> 0; const out: number[] = [];
  for (const b0 of bytes) {
    const b = p.refin ? reflect(b0, 8) : b0;
    reg = (reg ^ (b << (p.width - 8))) >>> 0;
    for (let i = 0; i < 8; i++) reg = (((reg & top) ? ((reg << 1) ^ p.poly) : (reg << 1)) & mask) >>> 0;
    out.push(reg);
  }
  return out;
}
export function crc(bytes: number[], p: CrcParams): number {
  const mask = p.width === 32 ? 0xffffffff : (1 << p.width) - 1;
  const steps = crcSteps(bytes, p);
  let reg = steps.length ? steps[steps.length - 1] : p.init >>> 0;
  if (p.refout) reg = reflect(reg, p.width);
  return ((reg ^ p.xorout) & mask) >>> 0;
}
const CHECK = Array.from('123456789').map(c => c.charCodeAt(0));

export function CrcCalc() {
  const [idx, setIdx] = useState(2);
  const [mode, setMode] = useState<'text' | 'hex'>('text');
  const [input, setInput] = useState('123456789');
  const p = CRCS[idx];
  const bytes = useMemo(() => {
    if (mode === 'text') return Array.from(new TextEncoder().encode(input));
    return input.split(/[\s,]+/).filter(Boolean).map(t => parseInt(t.replace(/^0x/i, ''), 16)).filter(x => x >= 0 && x <= 255);
  }, [input, mode]);
  const steps = crcSteps(bytes, p);
  const digits = p.width / 4;
  return (
    <div className="widget">
      <div className="wrow">
        <label className="field"><span>Algorithm</span>
          <select value={idx} onChange={e => setIdx(Number(e.target.value))}>{CRCS.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}</select></label>
        <Seg label="Input as" value={mode} options={[['text', 'Text'], ['hex', 'Hex bytes']] as const} onChange={setMode} />
        <Txt label={mode === 'text' ? 'Data' : 'Bytes, e.g. 01 03 00 00 00 0A'} value={input} onChange={setInput} mono width={280} />
      </div>
      <div className="kv">
        <div><span>Result</span><b className="big">{hex(crc(bytes, p), digits)}</b></div>
        <div><span>Bytes</span><b>{bytes.length}</b></div>
        <div><span>Polynomial</span><b>{hex(p.poly, digits)}</b></div>
        <div><span>Init / XOR out</span><b>{hex(p.init, digits)} / {hex(p.xorout, digits)}</b></div>
        <div><span>Reflect in / out</span><b>{String(p.refin)} / {String(p.refout)}</b></div>
        <div><span>Self-test, “123456789”</span><b>{hex(crc(CHECK, p), digits)}</b></div>
      </div>
      <p className="note">Used by: {p.use}. Two ends must agree on all five parameters, not just the polynomial; a mismatch in “reflect” or “init” is the usual reason a CRC never matches.</p>
      {bytes.length > 0 && bytes.length <= 24 && (
        <div className="scroll"><table className="mini"><thead><tr><th>Byte</th>{bytes.map((b, i) => <th key={i}>{b.toString(16).toUpperCase().padStart(2, '0')}</th>)}</tr></thead>
          <tbody><tr><td>Register after</td>{steps.map((s, i) => <td key={i}>{s.toString(16).toUpperCase().padStart(digits, '0')}</td>)}</tr></tbody></table></div>
      )}
    </div>
  );
}

/* ---------------- Calculators ---------------- */
const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
function nearestE12(r: number, up = true): number {
  if (!(r > 0)) return NaN;
  const dec = Math.pow(10, Math.floor(Math.log10(r)));
  const cands = [...E12.map(x => x * dec), 10 * dec];
  return up ? cands.find(c => c >= r * 0.9999) ?? 10 * dec : [...cands].reverse().find(c => c <= r * 1.0001) ?? dec;
}
type Calc = 'divider' | 'led' | 'pullup' | 'uart' | 'timer' | 'pwm';

export function Calculators() {
  const [tab, setTab] = useState<Calc>('divider');
  const [a, setA] = useState<Record<string, number>>({ vin: 5, r1: 1000, r2: 2000, vs: 3.3, vf: 2.0, ima: 5, vcc: 3.3, cb: 100, fast: 0, baud: 115200, mismatch: 1, clk: 80e6, pre: 80, cnt: 1000, fpwm: 5000 });
  const s = (k: string) => (x: number) => setA(o => ({ ...o, [k]: x }));
  const vout = a.vin * a.r2 / (a.r1 + a.r2);
  const rled = (a.vs - a.vf) / (a.ima / 1000);
  const tr = a.fast ? 300e-9 : 1000e-9;
  const rmin = (a.vcc - 0.4) / 0.003, rmax = tr / (0.8473 * a.cb * 1e-12);
  const tick = a.clk / a.pre;
  const bits = Math.floor(Math.log2(a.clk / a.fpwm));
  return (
    <div className="widget">
      <Seg value={tab} onChange={setTab} options={[['divider', 'Voltage divider'], ['led', 'LED resistor'], ['pullup', 'I2C pull-up'], ['uart', 'UART timing'], ['timer', 'Timer and prescaler'], ['pwm', 'PWM resolution']] as const} />
      {tab === 'divider' && <>
        <div className="wrow"><Num label="Vin" value={a.vin} onChange={s('vin')} unit="V" /><Num label="R1, top" value={a.r1} onChange={s('r1')} unit="Ω" /><Num label="R2, bottom" value={a.r2} onChange={s('r2')} unit="Ω" /></div>
        <div className="kv"><div><span>Vout = Vin × R2 / (R1 + R2)</span><b className="big">{vout.toFixed(3)} V</b></div><div><span>Current through the divider</span><b>{eng(a.vin / (a.r1 + a.r2), 'A')}</b></div></div>
        {vout > 3.3 && <p className="note warn">Above 3.3 V. Do not connect this to an ESP32 pin.</p>}
        <p className="note">The divider only holds its ratio if the load draws far less current than the divider itself. A GPIO input qualifies; a motor does not.</p>
      </>}
      {tab === 'led' && <>
        <div className="wrow"><Num label="Supply" value={a.vs} onChange={s('vs')} unit="V" /><Num label="LED forward voltage" value={a.vf} onChange={s('vf')} unit="V" /><Num label="Target current" value={a.ima} onChange={s('ima')} unit="mA" /></div>
        <div className="kv"><div><span>R = (Vs − Vf) / I</span><b className="big">{eng(rled, 'Ω')}</b></div><div><span>Next E12 value up</span><b>{eng(nearestE12(rled), 'Ω')}</b></div><div><span>Power in the resistor</span><b>{eng((a.vs - a.vf) * a.ima / 1000, 'W')}</b></div></div>
        <p className="note">Red LEDs drop about 1.8 to 2.2 V, blue and white about 3 V. From a 3.3 V pin a blue LED leaves almost no voltage for the resistor, so its brightness varies a lot between parts.</p>
      </>}
      {tab === 'pullup' && <>
        <div className="wrow"><Num label="Bus voltage" value={a.vcc} onChange={s('vcc')} unit="V" /><Num label="Bus capacitance" value={a.cb} onChange={s('cb')} unit="pF" />
          <Seg label="Speed" value={a.fast} onChange={s('fast')} options={[[0, 'Standard 100 kHz'], [1, 'Fast 400 kHz']] as const} /></div>
        <div className="kv"><div><span>Minimum (3 mA sink, 0.4 V low)</span><b>{eng(rmin, 'Ω')}</b></div><div><span>Maximum (rise time {a.fast ? '300' : '1000'} ns)</span><b>{eng(rmax, 'Ω')}</b></div>
          <div><span>Pick</span><b className="big">{rmax < rmin ? 'No valid value' : eng(nearestE12(Math.sqrt(rmin * rmax), false), 'Ω')}</b></div></div>
        <p className="note">Rmin = (Vcc − 0.4 V) / 3 mA. Rmax = t_rise / (0.8473 × C_bus). Both come from the I2C-bus specification (NXP UM10204). Breakout boards often carry their own pull-ups; several boards on one bus put them in parallel.</p>
      </>}
      {tab === 'uart' && <>
        <div className="wrow"><Num label="Baud rate" value={a.baud} onChange={s('baud')} unit="bit/s" /><Num label="Clock mismatch between the two ends" value={a.mismatch} onChange={s('mismatch')} unit="%" /></div>
        <div className="kv"><div><span>One bit</span><b className="big">{eng(1 / a.baud, 's')}</b></div><div><span>One 8N1 frame, 10 bits</span><b>{eng(10 / a.baud, 's')}</b></div><div><span>Throughput</span><b>{Math.floor(a.baud / 10)} bytes/s</b></div>
          <div><span>Drift at the stop-bit sample</span><b>{(9.5 * a.mismatch).toFixed(1)}% of a bit</b></div></div>
        <p className={'note' + (9.5 * a.mismatch >= 50 ? ' warn' : '')}>The receiver resynchronises on each start bit and samples mid-bit. By the stop bit it has drifted 9.5 bit-times × mismatch. At 50% it samples the wrong bit, which is a total mismatch of about 5.3%. Keep it under 2%.</p>
      </>}
      {tab === 'timer' && <>
        <div className="wrow"><Num label="Source clock" value={a.clk} onChange={s('clk')} unit="Hz" /><Num label="Prescaler (divide by)" value={a.pre} onChange={s('pre')} /><Num label="Alarm count" value={a.cnt} onChange={s('cnt')} unit="ticks" /></div>
        <div className="kv"><div><span>Tick rate = clock / prescaler</span><b>{eng(tick, 'Hz')}</b></div><div><span>One tick</span><b>{eng(1 / tick, 's')}</b></div><div><span>Alarm period</span><b className="big">{eng(a.cnt / tick, 's')}</b></div><div><span>Alarm frequency</span><b>{eng(tick / a.cnt, 'Hz')}</b></div></div>
        <p className="note">Resolution and range trade against each other: a larger prescaler gives longer periods from the same counter width and coarser steps.</p>
      </>}
      {tab === 'pwm' && <>
        <div className="wrow"><Num label="Timer clock" value={a.clk} onChange={s('clk')} unit="Hz" /><Num label="PWM frequency" value={a.fpwm} onChange={s('fpwm')} unit="Hz" /></div>
        <div className="kv"><div><span>Highest duty resolution</span><b className="big">{bits > 0 ? bits + ' bits' : '—'}</b></div><div><span>Duty steps</span><b>{bits > 0 ? Math.pow(2, bits) : '—'}</b></div><div><span>Smallest step</span><b>{bits > 0 ? eng(1 / a.fpwm / Math.pow(2, bits), 's') : '—'}</b></div></div>
        <p className="note">The counter must run through 2^bits steps every period, so frequency × 2^bits cannot exceed the timer clock. The driver also caps the resolution per chip; check the LEDC documentation for your target.</p>
      </>}
    </div>
  );
}
