import { useMemo, useState } from 'react';
import { Num, Seg, Slide, Txt, eng, hex, parseNum } from '../lib/ui';

/* ---------------- Ring buffer ---------------- */
export function RingLab() {
  const N = 8;
  const [data, setData] = useState<string[]>(Array(N).fill('')), [head, setHead] = useState(0), [tail, setTail] = useState(0), [next, setNext] = useState(0), [msg, setMsg] = useState('Empty: head equals tail.');
  const count = head - tail;
  const put = () => { if (count === N) return setMsg('Full: put refused. Nothing was overwritten. The producer must drop the byte or wait.'); const d = data.slice(); d[head % N] = String.fromCharCode(65 + next % 26); setData(d); setHead(head + 1); setNext(next + 1); setMsg(`Stored at slot ${head % N}, then head advanced.`); };
  const get = () => { if (count === 0) return setMsg('Empty: get refused.'); setMsg(`Read “${data[tail % N]}” from slot ${tail % N}, then tail advanced. The byte is not erased; it is simply no longer between tail and head.`); setTail(tail + 1); };
  return (
    <div className="widget">
      <div className="cells">{data.map((v, i) => { const live = ((i - tail % N + N) % N) < count; return <div key={i} className={'cellb' + (live ? ' live' : '')}><b>{v || '·'}</b><small>{i}</small>
        <em>{head % N === i ? 'head' : ''}{head % N === i && tail % N === i ? ' ' : ''}{tail % N === i ? 'tail' : ''}</em></div>; })}</div>
      <div className="wrow"><button type="button" className="btn" onClick={put}>Put a byte</button><button type="button" className="btn ghost" onClick={get}>Get a byte</button>
        <button type="button" className="btn ghost" onClick={() => { let h = head, n = next; const d = data.slice(); while (h - tail < N) { d[h % N] = String.fromCharCode(65 + n % 26); h++; n++; } setData(d); setHead(h); setNext(n); setMsg('Filled. All eight slots hold data.'); }}>Fill it</button></div>
      <div className="kv"><div><span>head (producer writes here)</span><b>{head} → slot {head % N}</b></div><div><span>tail (consumer reads here)</span><b>{tail} → slot {tail % N}</b></div><div><span>count = head − tail</span><b className="big">{count}</b></div><div><span>space</span><b>{N - count}</b></div></div>
      <p className="note">{msg}</p>
      <p className="fine">head and tail only ever count up; the slot is the counter masked with capacity − 1, which is why the capacity is a power of two. One side writes head, the other writes tail, so an interrupt and a task can share it without a lock.</p>
    </div>
  );
}

/* ---------------- Struct layout and padding ---------------- */
const TYPES: Record<string, number> = { char: 1, 'uint8_t': 1, short: 2, 'uint16_t': 2, int: 4, float: 4, 'void *': 4, double: 8, 'int64_t': 8 };
type Field = { type: string; name: string };
export function layout(fields: Field[]) {
  let off = 0, maxAlign = 1; const cells: { f: number; pad: boolean }[] = [], offsets: number[] = [];
  fields.forEach((fd, i) => { const size = TYPES[fd.type], align = size; maxAlign = Math.max(maxAlign, align); while (off % align) { cells.push({ f: -1, pad: true }); off++; } offsets.push(off); for (let k = 0; k < size; k++) cells.push({ f: i, pad: false }); off += size; });
  while (off % maxAlign) { cells.push({ f: -1, pad: true }); off++; }
  return { cells, offsets, size: off, padding: cells.filter(c => c.pad).length };
}
const START: Field[] = [{ type: 'char', name: 'flag' }, { type: 'int', name: 'count' }, { type: 'char', name: 'mode' }, { type: 'double', name: 'value' }, { type: 'short', name: 'id' }];
export function StructLab() {
  const [fields, setFields] = useState<Field[]>(START);
  const L = layout(fields);
  const move = (i: number, d: number) => setFields(fs => { const j = i + d; if (j < 0 || j >= fs.length) return fs; const c = fs.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; });
  const hue = ['var(--ch1)', 'var(--ch2)', 'var(--ch3)', 'var(--ch4)', 'var(--copper)', 'var(--sig)'];
  return (
    <div className="widget">
      <div className="cells tight" aria-label="Bytes of the struct">{L.cells.map((c, i) => <div key={i} className={'cellb mini' + (c.pad ? ' pad' : '')} style={c.pad ? undefined : { background: `color-mix(in srgb, ${hue[c.f % hue.length]} 55%, transparent)` }} title={c.pad ? 'padding' : fields[c.f].name}><small>{i}</small></div>)}</div>
      <div className="kv"><div><span>sizeof(struct)</span><b className="big">{L.size} bytes</b></div><div><span>Padding</span><b>{L.padding} bytes wasted</b></div><div><span>Sum of the fields alone</span><b>{L.size - L.padding} bytes</b></div></div>
      <div className="scroll"><table className="mini"><thead><tr><th>Field</th><th>Size</th><th>Offset</th><th>Move</th></tr></thead><tbody>{fields.map((f, i) => <tr key={f.name}>
        <td><select value={f.type} aria-label={`Type of ${f.name}`} onChange={e => setFields(fs => fs.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}>{Object.keys(TYPES).map(t => <option key={t}>{t}</option>)}</select> <span style={{ color: hue[i % hue.length] }}>{f.name}</span>;</td>
        <td>{TYPES[f.type]}</td><td>{L.offsets[i]}</td><td><button type="button" className="btn ghost" onClick={() => move(i, -1)} aria-label={`Move ${f.name} up`}>↑</button> <button type="button" className="btn ghost" onClick={() => move(i, 1)} aria-label={`Move ${f.name} down`}>↓</button></td></tr>)}</tbody></table></div>
      <p><button type="button" className="btn" onClick={() => setFields(fs => [...fs].sort((a, b) => TYPES[b.type] - TYPES[a.type]))}>Order largest first</button> <button type="button" className="btn ghost" onClick={() => setFields(START)}>Reset</button></p>
      <p className="note">Each field starts at an offset that is a multiple of its own alignment, and the whole struct is padded to a multiple of its largest member. Ordering fields from largest to smallest removes most padding. The model uses the common rule “alignment equals size”; confirm on your target with <code>sizeof</code> and <code>offsetof</code>, which is the lab in lesson 1.4.</p>
    </div>
  );
}

/* ---------------- Heap fragmentation ---------------- */
export function HeapLab() {
  const N = 40;
  const [cells, setCells] = useState<number[]>(Array(N).fill(0)), [id, setId] = useState(1), [msg, setMsg] = useState('An empty 40-block heap. Allocate a mix of sizes, free some, and watch the holes.');
  const free = cells.filter(c => c === 0).length;
  let largest = 0, run = 0; cells.forEach(c => { run = c === 0 ? run + 1 : 0; largest = Math.max(largest, run); });
  const alloc = (size: number) => {
    let start = -1, r = 0;
    for (let i = 0; i < N; i++) { r = cells[i] === 0 ? r + 1 : 0; if (r === size) { start = i - size + 1; break; } }
    if (start < 0) return setMsg(`malloc(${size}) failed: ${free} blocks are free in total, but the largest single hole is ${largest}. That is fragmentation.`);
    setCells(cs => cs.map((c, i) => (i >= start && i < start + size ? id : c))); setId(id + 1); setMsg(`malloc(${size}) took blocks ${start} to ${start + size - 1} (first fit).`);
  };
  const ids = Array.from(new Set(cells.filter(c => c > 0)));
  const freeIds = (pick: number[]) => { setCells(cs => cs.map(c => (pick.includes(c) ? 0 : c))); setMsg(`Freed ${pick.length} allocation${pick.length === 1 ? '' : 's'}.`); };
  const hue = ['var(--ch1)', 'var(--ch2)', 'var(--ch3)', 'var(--ch4)', 'var(--copper)'];
  return (
    <div className="widget">
      <div className="cells tight">{cells.map((c, i) => <div key={i} className={'cellb mini' + (c ? '' : ' pad')} style={c ? { background: `color-mix(in srgb, ${hue[c % hue.length]} 55%, transparent)` } : undefined}><small>{c || ''}</small></div>)}</div>
      <div className="wrow"><div className="field"><span>Allocate</span><div className="seg">{[1, 2, 4, 8].map(s => <button key={s} type="button" onClick={() => alloc(s)}>{s} block{s > 1 ? 's' : ''}</button>)}</div></div>
        <div className="field"><span>Free</span><div className="seg"><button type="button" onClick={() => freeIds(ids.slice(0, 1))}>Oldest</button><button type="button" onClick={() => freeIds(ids.filter((_, k) => k % 2 === 0))}>Every other one</button><button type="button" onClick={() => { setCells(Array(N).fill(0)); setMsg('Heap reset.'); }}>Everything</button></div></div></div>
      <div className="kv"><div><span>Free in total</span><b>{free} blocks</b></div><div><span>Largest free hole</span><b className="big">{largest} blocks</b></div><div><span>Fragmentation</span><b>{free ? Math.round((1 - largest / free) * 100) : 0}%</b></div></div>
      <p className={'note ' + (msg.includes('failed') ? 'warn' : '')}>{msg}</p>
      <p className="fine">Try it: allocate 2 blocks ten times, free every other one, then ask for 4. On a device that runs for months, this is how a heap with plenty of free memory still fails. ESP-IDF reports both numbers: <code>heap_caps_get_free_size</code> and <code>heap_caps_get_largest_free_block</code>.</p>
    </div>
  );
}

/* ---------------- UART baud mismatch ---------------- */
export function baudSample(byte: number, mismatchPct: number) {
  const bits = [0, ...Array.from({ length: 8 }, (_, i) => (byte >> i) & 1), 1];
  const at = Array.from({ length: 10 }, (_, k) => (k + 0.5) * (1 + mismatchPct / 100));
  const seen = at.map(t => (t >= 10 || t < 0 ? 1 : bits[Math.floor(t)]));
  const rx = seen.slice(1, 9).reduce((v, b, i) => v | (b << i), 0);
  return { bits, at, seen, rx, framing: seen[9] !== 1 };
}
export function BaudLab() {
  const [text, setText] = useState('0x55'), [m, setM] = useState(0);
  const byte = (parseNum(text) || 0) & 0xff, s = baudSample(byte, m), u = 50, x0 = 44;
  let d = `M${x0 - 30} 30 H${x0}`; s.bits.forEach((b, i) => { d += `V${b ? 30 : 70}H${x0 + (i + 1) * u}`; }); d += 'V30H580';
  const ok = s.rx === byte && !s.framing;
  return (
    <div className="widget">
      <div className="wrow"><Txt label="Byte sent" value={text} onChange={setText} mono width={80} /><Slide label="Receiver clock compared with the sender" value={m} min={-8} max={8} step={0.25} show={(m > 0 ? '+' : '') + m + '% ' + (m > 0 ? 'slow' : m < 0 ? 'fast' : '')} onChange={setM} /></div>
      <svg viewBox="0 0 600 130" className="lab" role="img" aria-label="Where the receiver samples each bit">
        {s.bits.map((_, i) => <g key={i}><line x1={x0 + i * u} x2={x0 + i * u} y1="20" y2="84" className="gridl" /><text x={x0 + (i + 0.5) * u} y="100" textAnchor="middle">{i === 0 ? 'start' : i === 9 ? 'stop' : 'd' + (i - 1)}</text></g>)}
        <path d={d} className="c2" />
        {s.at.map((t, k) => { const wrong = Math.floor(t) !== k; return <g key={k}><line x1={x0 + t * u} x2={x0 + t * u} y1="16" y2="84" className={wrong ? 'c3' : 'c1'} /><circle cx={x0 + t * u} cy={s.seen[k] ? 30 : 70} r="4" className={wrong ? 'f3' : 'f1'} /></g>; })}
        <text x={x0} y="122" className="t-ink">Yellow: sample lands in the right bit. Magenta: it has drifted into a neighbour.</text>
      </svg>
      <div className="kv"><div><span>Sent</span><b>{hex(byte)}</b></div><div><span>Received</span><b className="big">{hex(s.rx)}</b></div><div><span>Stop bit seen as</span><b>{s.framing ? '0: framing error' : '1: valid'}</b></div><div><span>Drift at the stop bit</span><b>{Math.abs(9.5 * m).toFixed(0)}% of a bit</b></div></div>
      <p className={'note ' + (ok ? 'ok' : 'warn')}>{ok ? 'Every sample lands inside its own bit. The receiver re-times itself on each start edge, so the error only has ten bit-times to accumulate.' : 'The error has grown to more than half a bit before the frame ends, so late samples read the neighbouring bit. Note that some bytes still arrive correctly by luck: test with 0x55 and 0xAA, which alternate every bit.'}</p>
    </div>
  );
}

/* ---------------- I2C rise time ---------------- */
export function RiseLab() {
  const [logR, setLogR] = useState(Math.log10(4700)), [c, setC] = useState(100), [fast, setFast] = useState(1);
  const r = Number((10 ** logR).toPrecision(2)), tau = r * c * 1e-12, tr = 0.8473 * tau, limit = fast ? 300e-9 : 1000e-9, half = fast ? 1250e-9 : 5000e-9;
  const W = half, X = (t: number) => 50 + t / W * 520, Y = (v: number) => 130 - v * 100;
  const pts = Array.from({ length: 200 }, (_, i) => { const t = i / 199 * W; return `${X(t).toFixed(1)},${Y(1 - Math.exp(-t / tau)).toFixed(1)}`; }).join(' ');
  const t30 = -tau * Math.log(0.7), t70 = -tau * Math.log(0.3), isink = 3.3 / r;
  return (
    <div className="widget">
      <div className="wrow"><Slide label="Pull-up resistor" value={logR} min={2.5} max={5} step={0.01} show={eng(r, 'Ω')} onChange={setLogR} /><Slide label="Bus capacitance: wires, pins, every device" value={c} min={10} max={400} step={10} show={c + ' pF'} onChange={setC} />
        <Seg label="Bus speed" value={fast} onChange={setFast} options={[[0, '100 kHz'], [1, '400 kHz']] as [number, string][]} /></div>
      <svg viewBox="0 0 600 160" className="lab" role="img" aria-label="Voltage on the bus line as it rises after being released">
        <line x1="50" x2="570" y1={Y(0.7)} y2={Y(0.7)} className="gridl dash" /><line x1="50" x2="570" y1={Y(0.3)} y2={Y(0.3)} className="gridl dash" /><text x="6" y={Y(0.7) + 4}>70%</text><text x="6" y={Y(0.3) + 4}>30%</text>
        <rect x={X(t30)} y="26" width={Math.max(0, Math.min(X(t30 + limit), 570) - X(t30))} height="108" className="band" style={{ fill: 'var(--good-soft)' }} />
        <polyline points={pts} className={tr <= limit ? 'c4' : 'c3'} />
        {t70 < W && <line x1={X(t70)} x2={X(t70)} y1="26" y2="134" className="c1 dash" />}
        <text x="50" y="152">released</text><text x="570" y="152" textAnchor="end">{eng(W, 's')}: half a clock period</text><text x={X(t30) + 4} y="22">allowed rise window</text>
      </svg>
      <div className="kv"><div><span>Rise time, 30% to 70% = 0.8473 × R × C</span><b className="big">{eng(tr, 's')}</b></div><div><span>Limit at this speed</span><b>{eng(limit, 's')}</b></div><div><span>Current when a device pulls low</span><b>{eng(isink, 'A')}</b></div></div>
      <p className={'note ' + (tr > limit ? 'warn' : isink > 0.003 ? 'warn' : 'ok')}>{tr > limit ? 'Too slow. The line has not reached a valid high in time, so the receiver sees a late or missing edge. Lower the resistor, shorten the wires, or slow the bus.' : isink > 0.003 ? 'Fast enough, but a device pulling the line low must now sink more than the 3 mA the standard guarantees. Raise the resistor.' : 'Within both limits: fast enough to rise in time, weak enough for every device to pull low.'}</p>
      <p className="fine">Nothing drives an I2C line high. The pull-up charges the bus capacitance through an RC curve, which is why I2C is slow and short-range, and why the internal pull-ups of a microcontroller (tens of kilohms) are rarely enough.</p>
    </div>
  );
}

/* ---------------- CAN arbitration ---------------- */
export function arbitrate(ids: number[]) {
  const bits = ids.map(id => Array.from({ length: 11 }, (_, i) => (id >> (10 - i)) & 1));
  const lostAt: number[] = ids.map(() => -1), bus: number[] = [];
  for (let i = 0; i < 11; i++) {
    const active = ids.map((_, n) => lostAt[n] < 0);
    const level = bits.reduce((b, row, n) => (active[n] ? b & row[i] : b), 1);
    bus.push(level);
    ids.forEach((_, n) => { if (active[n] && bits[n][i] === 1 && level === 0) lostAt[n] = i; });
  }
  return { bits, bus, lostAt, winner: lostAt.findIndex(l => l < 0) };
}
export function CanLab() {
  const [texts, setTexts] = useState(['0x123', '0x12A', '0x0F0']);
  const ids = texts.map(t => (parseNum(t) || 0) & 0x7ff), a = arbitrate(ids);
  return (
    <div className="widget">
      <div className="wrow">{texts.map((t, n) => <Txt key={n} label={`Node ${String.fromCharCode(65 + n)} identifier (11-bit)`} value={t} mono width={90} onChange={v => setTexts(ts => ts.map((x, j) => (j === n ? v : x)))} />)}</div>
      <div className="scroll"><table className="mini arb"><thead><tr><th>Bit</th>{Array.from({ length: 11 }, (_, i) => <th key={i}>{10 - i}</th>)}<th>Result</th></tr></thead><tbody>
        {a.bits.map((row, n) => <tr key={n}><td>Node {String.fromCharCode(65 + n)}</td>{row.map((b, i) => <td key={i} className={a.lostAt[n] >= 0 && i > a.lostAt[n] ? 'quiet' : a.lostAt[n] === i ? 'lost' : b ? '' : 'dom'}>{a.lostAt[n] >= 0 && i > a.lostAt[n] ? '·' : b}</td>)}<td>{a.winner === n ? 'wins, keeps sending' : a.lostAt[n] < 0 ? 'same identifier: collision' : `backs off at bit ${10 - a.lostAt[n]}`}</td></tr>)}
        <tr className="busrow"><td>Bus</td>{a.bus.map((b, i) => <td key={i} className={b ? '' : 'dom'}>{b}</td>)}<td>{hex(ids[a.winner] ?? 0, 3)}</td></tr></tbody></table></div>
      <p className="note">Every node transmits its identifier at once and reads the bus back. A 0 is “dominant”: it overrides any 1. A node that sends 1 and reads 0 knows a more important message is on the wire, stops, and retries later. Nothing is corrupted and no time is lost, and the lowest identifier always wins. Give two nodes the same identifier with different data and you have a real bus error: identifiers must be unique per sender.</p>
    </div>
  );
}

/* ---------------- Battery life and duty cycle ---------------- */
export function PowerLab() {
  const [a, setA] = useState({ active: 90, secs: 3, sleep: 12, mins: 10, mah: 2000 });
  const s = (k: keyof typeof a) => (v: number) => setA(o => ({ ...o, [k]: Math.max(0, v || 0) }));
  const T = Math.max(a.mins * 60, a.secs + 0.001), qa = a.active * a.secs, qs = a.sleep / 1000 * (T - a.secs), avg = (qa + qs) / T, hours = a.mah / avg;
  const share = qa / (qa + qs);
  return (
    <div className="widget">
      <div className="wrow"><Num label="Current while awake" value={a.active} onChange={s('active')} unit="mA" /><Num label="Time awake per wake-up" value={a.secs} onChange={s('secs')} unit="s" /><Num label="Current asleep" value={a.sleep} onChange={s('sleep')} unit="µA" />
        <Num label="Wake-up every" value={a.mins} onChange={s('mins')} unit="min" /><Num label="Battery" value={a.mah} onChange={s('mah')} unit="mAh" /></div>
      <div className="flashbar" aria-label="Where the charge goes"><i className="f-app" style={{ width: `${share * 100}%` }}><b>{share > 0.12 ? 'awake' : ''}</b></i><i className="f-data" style={{ width: `${(1 - share) * 100}%` }}><b>{share < 0.88 ? 'asleep' : ''}</b></i></div>
      <div className="kv"><div><span>Average current</span><b className="big">{eng(avg / 1000, 'A')}</b></div><div><span>Battery life</span><b className="big">{hours > 48 ? (hours / 24).toFixed(0) + ' days' : hours.toFixed(1) + ' hours'}</b></div><div><span>Charge spent awake</span><b>{(share * 100).toFixed(0)}%</b></div><div><span>Duty cycle</span><b>{(a.secs / T * 100).toFixed(2)}%</b></div></div>
      <p className="note">{share > 0.5 ? 'Most of the charge goes on the short awake time. Shorten it: connect faster, send less, or wake less often. Lowering sleep current further will barely help.' : 'Most of the charge goes on sleeping. The sleep current, including regulators, LEDs and pull-ups on the board, is now what limits battery life.'} Real cells deliver less than their label at low temperature and high peak current, so treat this as an upper bound; lesson 6.5 measures it.</p>
    </div>
  );
}

/* ---------------- PID on a small motor ---------------- */
export function pidRun(kp: number, ki: number, kd: number, limit = 3) {
  const dt = 0.005, tau = 0.25, gain = 1, out: [number, number][] = []; let v = 0, integ = 0, prev = 0, peak = 0, settle = 0;
  for (let i = 0; i < 600; i++) {
    const t = i * dt, sp = t >= 0.2 ? 1 : 0, err = sp - v;
    integ += err * dt; const u = Math.max(-limit, Math.min(limit, kp * err + ki * integ + kd * (err - prev) / dt)); prev = err;
    v += (gain * u - v) / tau * dt; out.push([t, v]); peak = Math.max(peak, v); if (Math.abs(v - 1) > 0.02 && t > 0.2) settle = t;
  }
  return { out, overshoot: Math.max(0, peak - 1) * 100, settle: settle - 0.2, final: v };
}
export function PidLab() {
  const [kp, setKp] = useState(2), [ki, setKi] = useState(0), [kd, setKd] = useState(0);
  const r = useMemo(() => pidRun(kp, ki, kd), [kp, ki, kd]);
  const X = (t: number) => 44 + t / 3 * 530, Y = (v: number) => 150 - v / 1.6 * 130;
  return (
    <div className="widget">
      <div className="wrow"><Slide label="Kp: push in proportion to the error" value={kp} min={0} max={20} step={0.5} onChange={setKp} /><Slide label="Ki: push harder the longer the error lasts" value={ki} min={0} max={40} step={1} onChange={setKi} /><Slide label="Kd: ease off as the error closes" value={kd} min={0} max={0.5} step={0.01} onChange={setKd} /></div>
      <svg viewBox="0 0 600 176" className="lab" role="img" aria-label="Speed against time after a step in the target">
        <line x1="44" x2="574" y1={Y(0)} y2={Y(0)} className="gridl" /><path d={`M44 ${Y(0)} H${X(0.2)} V${Y(1)} H574`} className="c1 dash" />
        <polyline points={r.out.map(([t, v]) => `${X(t).toFixed(1)},${Y(Math.max(-0.1, Math.min(1.7, v))).toFixed(1)}`).join(' ')} className="c4" />
        <text x="6" y={Y(1) + 4}>target</text><text x="574" y="170" textAnchor="end">3 s</text><text x="44" y="170">0</text>
      </svg>
      <div className="kv"><div><span>Overshoot</span><b>{r.overshoot.toFixed(1)}%</b></div><div><span>Settles within 2% after</span><b>{r.settle <= 0 ? 'at once' : r.settle > 2.75 ? 'never, in this window' : r.settle.toFixed(2) + ' s'}</b></div><div><span>Final error</span><b className="big">{((1 - r.final) * 100).toFixed(1)}%</b></div></div>
      <p className="note">{ki === 0 && Math.abs(1 - r.final) > 0.02 ? 'With Kp alone the speed stops short of the target: some error must remain to produce any push. Add Ki and the remaining error is integrated away.' : r.overshoot > 15 ? 'It gets there, but overshoots. Reduce Ki or add a little Kd.' : 'On target with little overshoot. Now raise Kp until it rings, to find where your margin ends.'} The motor is modelled as a first-order lag with a limited drive; the encoder from lesson 2.8 and the timer from 2.3 are what make this loop real.</p>
    </div>
  );
}
