import { useEffect, useMemo, useState } from 'react';
import { Num, Seg, Txt, eng, hex, parseNum } from '../lib/ui';

// A diagram is a set of rows sampled on a common grid. Labels span grid columns.
type Label = { from: number; to: number; text: string; info: string; tone?: 'ctl' | 'data' | 'ack' };
type Diagram = { rows: { name: string; levels: number[] }[]; labels: Label[]; dots: { row: number; x: number }[]; unit: number };

const bitsMSB = (v: number, n = 8) => Array.from({ length: n }, (_, i) => (v >> (n - 1 - i)) & 1);
const bitsLSB = (v: number, n = 8) => Array.from({ length: n }, (_, i) => (v >> i) & 1);

export function uartDiagram(byte: number, parity: 'none' | 'even' | 'odd', stop: number, hide = false): Diagram {
  const data = bitsLSB(byte);
  const levels = [1, 1, 0, ...data];
  const labels: Label[] = [
    { from: 0, to: 2, text: 'idle', info: 'The line rests high. That is why a disconnected RX pin with a pull-up reads as silence, not as data.', tone: 'ctl' },
    { from: 2, to: 3, text: 'start', info: 'Start bit: the transmitter pulls the line low for one bit time. The receiver starts its timer on this falling edge.', tone: 'ctl' },
    ...data.map((b, i): Label => ({ from: 3 + i, to: 4 + i, text: hide ? '?' : `d${i}=${b}`, info: `Data bit ${i}. UART sends the least significant bit first.`, tone: 'data' })),
  ];
  let x = 11;
  if (parity !== 'none') {
    const ones = data.reduce((s, b) => s + b, 0);
    const pbit = parity === 'even' ? ones % 2 : 1 - (ones % 2);
    levels.push(pbit);
    labels.push({ from: x, to: x + 1, text: hide ? 'p' : `p=${pbit}`, info: `Parity bit. ${parity} parity makes the count of 1s (data plus parity) ${parity}. It catches any single flipped bit.`, tone: 'ack' });
    x++;
  }
  for (let i = 0; i < stop; i++) levels.push(1);
  labels.push({ from: x, to: x + stop, text: 'stop', info: 'Stop bit: the line returns high so the next start bit is a visible falling edge.', tone: 'ctl' });
  levels.push(1, 1);
  labels.push({ from: x + stop, to: x + stop + 2, text: 'idle', info: 'Idle again. The next frame may start at any time; that is what asynchronous means.', tone: 'ctl' });
  return { rows: [{ name: 'TX', levels }], labels, dots: [], unit: 44 };
}

export function i2cDiagram(addr: number, read: boolean, data: number, ack1: boolean, ack2: boolean): Diagram {
  const scl: number[] = [1, 1, 1], sda: number[] = [1, 1, 0];
  const labels: Label[] = [
    { from: 0, to: 2, text: 'idle', info: 'Both lines are pulled high by resistors. No device is driving the bus.', tone: 'ctl' },
    { from: 2, to: 3, text: 'S', info: 'Start: SDA falls while SCL is high. Data never changes while SCL is high except for start and stop, so this is unmistakable.', tone: 'ctl' },
  ];
  const dots: Diagram['dots'] = [];
  const pushBit = (b: number, text: string, info: string, tone: Label['tone']) => {
    const x = scl.length;
    scl.push(0, 1); sda.push(b, b);
    labels.push({ from: x, to: x + 2, text, info, tone });
    dots.push({ row: 1, x: x + 1.5 });
  };
  const first = ((addr & 0x7f) << 1) | (read ? 1 : 0);
  bitsMSB(first).forEach((b, i) => pushBit(b, i < 7 ? `a${6 - i}=${b}` : read ? 'R' : 'W',
    i < 7 ? `Address bit ${6 - i}, most significant first. SDA changes while SCL is low and is read while SCL is high.` : `Read/write bit: ${read ? '1 = the master will read' : '0 = the master will write'}.`, i < 7 ? 'data' : 'ctl'));
  pushBit(ack1 ? 0 : 1, ack1 ? 'ACK' : 'NACK', ack1 ? 'ACK: the addressed device pulls SDA low on the ninth clock. Someone is there.' : 'NACK: nobody pulled SDA low. Wrong address, missing pull-ups, or the device is not powered.', 'ack');
  bitsMSB(data).forEach((b, i) => pushBit(b, `d${7 - i}=${b}`, `Data bit ${7 - i}, most significant first.`, 'data'));
  pushBit(ack2 ? 0 : 1, ack2 ? 'ACK' : 'NACK', read ? 'When reading, the master acknowledges each byte it wants more of, and sends NACK after the last one.' : 'The device acknowledges the data byte.', 'ack');
  const x = scl.length;
  scl.push(0, 1, 1, 1, 1); sda.push(0, 0, 1, 1, 1);
  labels.push({ from: x, to: x + 3, text: 'P', info: 'Stop: SDA rises while SCL is high. The bus is free.', tone: 'ctl' });
  labels.push({ from: x + 3, to: x + 5, text: 'idle', info: 'Both lines high again.', tone: 'ctl' });
  return { rows: [{ name: 'SCL', levels: scl }, { name: 'SDA', levels: sda }], labels, dots, unit: 15 };
}

export function spiDiagram(mode: number, mosi: number, miso: number): Diagram {
  const cpol = mode >> 1, cpha = mode & 1;
  const N = 2 + 16 + 2;
  const cs = Array(N).fill(1), sck = Array(N).fill(cpol), mo = Array(N).fill(0), mi = Array(N).fill(0);
  const mb = bitsMSB(mosi), sb = bitsMSB(miso);
  const labels: Label[] = [{ from: 0, to: 2, text: 'idle', info: `Chip select is high, so the device ignores the bus. The clock idles ${cpol ? 'high' : 'low'} (CPOL=${cpol}).`, tone: 'ctl' }];
  const dots: Diagram['dots'] = [];
  for (let i = 0; i < 8; i++) {
    const x = 2 + 2 * i;
    cs[x] = cs[x + 1] = 0;
    sck[x] = cpol; sck[x + 1] = 1 - cpol;
    const from = cpha ? x + 1 : x, to = Math.min(N - 2, from + 2);
    for (let k = from; k < to; k++) { mo[k] = mb[i]; mi[k] = sb[i]; }
    const sx = cpha ? x + 2 : x + 1;
    dots.push({ row: 2, x: sx }, { row: 3, x: sx });
    labels.push({ from: x, to: x + 2, text: `b${7 - i}`, info: `Bit ${7 - i}: MOSI=${mb[i]}, MISO=${sb[i]}. Sampled on the ${cpha ? 'trailing' : 'leading'} clock edge (CPHA=${cpha}), changed on the other edge. Both directions move at once: SPI is always full duplex.`, tone: 'data' });
  }
  if (cpha) { mo[1] = mo[0]; }
  labels.push({ from: 18, to: 20, text: 'idle', info: 'Chip select returns high. The device latches or acts on what it received.', tone: 'ctl' });
  return { rows: [{ name: 'CS', levels: cs }, { name: 'SCK', levels: sck }, { name: 'MOSI', levels: mo }, { name: 'MISO', levels: mi }], labels, dots, unit: 22 };
}

function Wave({ d, cursor }: { d: Diagram; cursor: number }) {
  const left = 52, rowH = 30, gap = 16, n = d.rows[0].levels.length;
  const W = left + n * d.unit + 12, H = d.rows.length * (rowH + gap) + 34;
  const yOf = (row: number, level: number) => 10 + row * (rowH + gap) + (level ? 0 : rowH);
  const path = (levels: number[], row: number) => {
    let s = `M${left} ${yOf(row, levels[0])}`;
    levels.forEach((lv, i) => { if (i > 0 && lv !== levels[i - 1]) s += `V${yOf(row, lv)}`; s += `H${left + (i + 1) * d.unit}`; });
    return s;
  };
  const ly = d.rows.length * (rowH + gap) + 8;
  return (
    <div className="scroll">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Timing diagram" className="wave">
        {d.labels.map((l, i) => <rect key={'bg' + i} x={left + l.from * d.unit} y={4} width={(l.to - l.from) * d.unit} height={ly - 6} className={'cell ' + (l.tone ?? '') + (cursor >= l.from && cursor < l.to ? ' now' : '')} />)}
        {d.rows.map((r, i) => <g key={r.name}><text x={4} y={yOf(i, 0) - rowH / 2 + 4} className="wname">{r.name}</text><path d={path(r.levels, i)} className="wline" /></g>)}
        {d.dots.map((p, i) => <circle key={i} cx={left + p.x * d.unit} cy={yOf(p.row, d.rows[p.row].levels[Math.min(n - 1, Math.floor(p.x - 0.01))])} r={3} className="wdot" />)}
        {d.labels.map((l, i) => <text key={'t' + i} x={left + (l.from + l.to) / 2 * d.unit} y={ly + 14} textAnchor="middle" className="wlabel">{l.text}</text>)}
        <line x1={left + cursor * d.unit} x2={left + cursor * d.unit} y1={2} y2={ly} className="wcursor" />
      </svg>
    </div>
  );
}

export function decodeUart(samples: number[]): { byte: number; ok: boolean; why: string } | null {
  const start = samples.findIndex((s, i) => s === 0 && (i === 0 || samples[i - 1] === 1));
  if (start < 0 || start + 9 >= samples.length) return null;
  let byte = 0; for (let i = 0; i < 8; i++) byte |= samples[start + 1 + i] << i;
  const stop = samples[start + 9];
  return { byte, ok: stop === 1, why: stop === 1 ? 'Stop bit is high: frame valid.' : 'Stop bit is low: framing error. Wrong baud rate is the usual cause.' };
}

export function TimingDiagram() {
  const [proto, setProto] = useState<'uart' | 'i2c' | 'spi'>('uart');
  const [byteText, setByteText] = useState('0x53');
  const [parity, setParity] = useState<'none' | 'even' | 'odd'>('none');
  const [stop, setStop] = useState(1);
  const [baud, setBaud] = useState(115200);
  const [addrText, setAddrText] = useState('0x68');
  const [read, setRead] = useState(0);
  const [ack, setAck] = useState(1);
  const [mode, setMode] = useState(0);
  const [misoText, setMisoText] = useState('0xA5');
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [quiz, setQuiz] = useState<number | null>(null);
  const [guess, setGuess] = useState('');
  const [paste, setPaste] = useState('1 1 0 1 1 0 0 1 0 1 0 1 1');

  const byte = (parseNum(byteText) || 0) & 0xff, addr = (parseNum(addrText) || 0) & 0x7f, miso = (parseNum(misoText) || 0) & 0xff;
  const d = useMemo(() => proto === 'uart' ? uartDiagram(quiz ?? byte, parity, stop, quiz !== null)
    : proto === 'i2c' ? i2cDiagram(addr, !!read, byte, !!ack, !!ack)
    : spiDiagram(mode, byte, miso), [proto, byte, parity, stop, addr, read, ack, mode, miso, quiz]);
  const n = d.rows[0].levels.length;
  useEffect(() => { setCursor(0); setPlaying(false); }, [proto]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setCursor(c => { const next = c + (proto === 'uart' ? 0.25 : 0.5); if (next >= n) { setPlaying(false); return n; } return next; }), 90);
    return () => clearInterval(t);
  }, [playing, n, proto]);
  const here = d.labels.find(l => cursor >= l.from && cursor < l.to) ?? d.labels[d.labels.length - 1];
  const pasted = decodeUart(paste.split(/[\s,]+/).filter(Boolean).map(x => (x === '0' ? 0 : 1)));
  const guessNum = parseNum(guess);

  return (
    <div className="widget">
      <div className="wrow">
        <Seg label="Protocol" value={proto} onChange={setProto} options={[['uart', 'UART'], ['i2c', 'I2C'], ['spi', 'SPI']] as const} />
        {proto === 'i2c' && <Txt label="7-bit address" value={addrText} onChange={setAddrText} mono width={80} />}
        {quiz === null && <Txt label={proto === 'spi' ? 'MOSI byte' : 'Data byte'} value={byteText} onChange={setByteText} mono width={80} />}
        {proto === 'uart' && <>
          <Seg label="Parity" value={parity} onChange={setParity} options={[['none', 'None'], ['even', 'Even'], ['odd', 'Odd']] as const} />
          <Seg label="Stop bits" value={stop} onChange={setStop} options={[[1, '1'], [2, '2']] as [number, string][]} />
          <Num label="Baud" value={baud} onChange={setBaud} />
        </>}
        {proto === 'i2c' && <>
          <Seg label="Direction" value={read} onChange={setRead} options={[[0, 'Write'], [1, 'Read']] as [number, string][]} />
          <Seg label="Device answers" value={ack} onChange={setAck} options={[[1, 'ACK'], [0, 'NACK']] as [number, string][]} />
        </>}
        {proto === 'spi' && <>
          <Seg label="Mode" value={mode} onChange={setMode} options={[[0, '0'], [1, '1'], [2, '2'], [3, '3']] as [number, string][]} />
          <Txt label="MISO byte" value={misoText} onChange={setMisoText} mono width={80} />
        </>}
      </div>
      <Wave d={d} cursor={cursor} />
      <div className="wrow">
        <button type="button" className="btn" onClick={() => { if (cursor >= n) setCursor(0); setPlaying(p => !p); }}>{playing ? 'Pause' : cursor >= n ? 'Replay' : 'Play'}</button>
        <input type="range" min={0} max={n} step={0.25} value={cursor} onChange={e => { setPlaying(false); setCursor(parseFloat(e.target.value)); }} aria-label="Scrub through the frame" style={{ flex: 1, minWidth: 160 }} />
      </div>
      <p className="note"><b>{here.text}</b> {here.info}</p>
      <div className="kv">
        {proto === 'uart' && <><div><span>Bit time at {baud} baud</span><b>{eng(1 / baud, 's')}</b></div><div><span>Frame</span><b>{n - 4} bits, {eng((n - 4) / baud, 's')}</b></div><div><span>On the wire, first to last</span><b>{quiz === null ? d.rows[0].levels.slice(2, n - 2).join(' ') : 'hidden'}</b></div></>}
        {proto === 'i2c' && <><div><span>First byte on the wire</span><b>{hex(((addr << 1) | read) & 0xff)}</b></div><div><span>Dots</span><b>SDA is sampled while SCL is high</b></div></>}
        {proto === 'spi' && <><div><span>CPOL, CPHA</span><b>{mode >> 1}, {mode & 1}</b></div><div><span>Dots</span><b>the edge where both sides sample</b></div></>}
      </div>
      {proto === 'uart' && (
        <div className="subpanel">
          <h4>Decode it yourself</h4>
          <div className="wrow">
            <button type="button" className="btn" onClick={() => { setQuiz(Math.floor(Math.random() * 256)); setGuess(''); setCursor(0); }}>New mystery byte</button>
            {quiz !== null && <><Txt label="Your answer (hex)" value={guess} onChange={setGuess} mono width={90} />
              <button type="button" className="btn ghost" onClick={() => setQuiz(null)}>Show labels again</button></>}
          </div>
          {quiz !== null && guess !== '' && <p className={'note ' + (guessNum === quiz ? 'ok' : 'warn')}>{guessNum === quiz ? `Correct: ${hex(quiz)}.` : 'Not yet. Skip the start bit, read eight bits, and remember the first one is bit 0.'}</p>}
          <Txt label="Or paste one sample per bit time from your logic analyzer" value={paste} onChange={setPaste} mono width={420} />
          <p className="note">{pasted ? <>Decoded <b>{hex(pasted.byte)}</b>{pasted.byte >= 32 && pasted.byte < 127 ? ` (“${String.fromCharCode(pasted.byte)}”)` : ''}. {pasted.why}</> : 'Need a falling edge followed by at least nine more samples.'}</p>
        </div>
      )}
    </div>
  );
}

/** A bare UART frame with the data bits unlabeled, used by timing-diagram quiz questions. */
export function UartFrame({ byte }: { byte: number }) {
  return <Wave d={uartDiagram(byte & 0xff, 'none', 1, true)} cursor={-1} />;
}
