import { useMemo, useState } from 'react';
import { Num, Seg } from '../lib/ui';

/* Small line/bar plot shared by the widgets in this file. */
function Plot(props: { series: { pts: [number, number][]; cls: string; bars?: boolean }[]; h?: number; xLabel?: string; yMin?: number; yMax?: number; xTicks?: number[]; fmt?: (x: number) => string }) {
  const W = 640, H = props.h ?? 180, L = 44, B = props.xLabel ? 40 : 24, T = 8, R = 12;
  const all = props.series.flatMap(s => s.pts);
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = props.yMin ?? Math.min(...ys), y1 = props.yMax ?? Math.max(...ys);
  const X = (x: number) => L + (x - x0) / ((x1 - x0) || 1) * (W - L - R);
  const Y = (y: number) => T + (1 - (y - y0) / ((y1 - y0) || 1)) * (H - T - B);
  const ticks = props.xTicks ?? [x0, (x0 + x1) / 2, x1];
  const fmt = props.fmt ?? ((x: number) => String(Number(x.toPrecision(3))));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="plot" role="img" aria-label={props.xLabel ?? 'plot'}>
      <line x1={L} x2={W - R} y1={Y(Math.max(y0, Math.min(y1, 0)))} y2={Y(Math.max(y0, Math.min(y1, 0)))} className="axis" />
      <line x1={L} x2={L} y1={T} y2={H - B} className="axis" />
      <text x={L - 6} y={T + 10} textAnchor="end" className="wlabel">{fmt(y1)}</text>
      <text x={L - 6} y={H - B} textAnchor="end" className="wlabel">{fmt(y0)}</text>
      {ticks.map(t => <text key={t} x={X(t)} y={H - B + 14} textAnchor="middle" className="wlabel">{fmt(t)}</text>)}
      {props.xLabel && <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" className="wlabel">{props.xLabel}</text>}
      {props.series.map((s, i) => s.bars
        ? <g key={i}>{s.pts.map((p, k) => <line key={k} x1={X(p[0])} x2={X(p[0])} y1={Y(y0)} y2={Y(p[1])} className={s.cls} />)}</g>
        : <polyline key={i} points={s.pts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')} className={s.cls} fill="none" />)}
    </svg>
  );
}

/* ---------------- Quantization ---------------- */
export function quantParams(min: number, max: number, bits: number) {
  const qmin = -(2 ** (bits - 1)), qmax = 2 ** (bits - 1) - 1;
  const lo = Math.min(min, 0), hi = Math.max(max, 0); // the real range must contain 0 so that 0.0 is exactly representable
  const scale = (hi - lo) / (qmax - qmin) || 1;
  const zero = Math.max(qmin, Math.min(qmax, Math.round(qmin - lo / scale)));
  const q = (x: number) => Math.max(qmin, Math.min(qmax, Math.round(x / scale) + zero));
  const dq = (v: number) => (v - zero) * scale;
  return { qmin, qmax, scale, zero, q, dq };
}
export function Quantization() {
  const [min, setMin] = useState(-1.5), [max, setMax] = useState(2.5), [bits, setBits] = useState(8), [x, setX] = useState(0.7);
  const p = quantParams(min, max, bits);
  const pts = useMemo(() => Array.from({ length: 200 }, (_, i) => { const t = i / 199; const v = (min + max) / 2 + (max - min) / 2 * Math.sin(t * 2 * Math.PI); return [t, v] as [number, number]; }), [min, max]);
  const qpts = pts.map(([t, v]) => [t, p.dq(p.q(v))] as [number, number]);
  const worst = Math.max(...pts.map(([, v], i) => Math.abs(v - qpts[i][1])));
  const qx = p.q(x);
  return (
    <div className="widget">
      <div className="wrow">
        <Num label="Smallest real value" value={min} step={0.1} onChange={setMin} /><Num label="Largest real value" value={max} step={0.1} onChange={setMax} />
        <Seg label="Integer width" value={bits} onChange={setBits} options={[[2, '2'], [3, '3'], [4, '4'], [6, '6'], [8, 'int8'], [16, 'int16']] as [number, string][]} />
      </div>
      <Plot series={[{ pts, cls: 'ln-a' }, { pts: qpts, cls: 'ln-b' }]} yMin={Math.min(min, 0)} yMax={Math.max(max, 0)} xLabel="one period of a signal filling the range" />
      <div className="legend"><span className="ln-a">real values</span><span className="ln-b">after quantize and dequantize</span></div>
      <div className="kv">
        <div><span>scale = (max − min) / (qmax − qmin)</span><b className="big">{p.scale.toPrecision(5)}</b></div>
        <div><span>zero_point = round(qmin − min / scale)</span><b className="big">{p.zero}</b></div>
        <div><span>Integer range</span><b>{p.qmin} … {p.qmax}</b></div>
        <div><span>Worst error on this signal</span><b>{worst.toPrecision(3)} (half a step is {(p.scale / 2).toPrecision(3)})</b></div>
      </div>
      <div className="wrow"><Num label="Try a value" value={x} step={0.05} onChange={setX} />
        <div className="readout"><div>q  = clamp(round(x / scale) + zero_point) = <b>{qx}</b></div><div>x̂ = (q − zero_point) × scale = <b>{p.dq(qx).toPrecision(5)}</b>   error {(p.dq(qx) - x).toExponential(2)}</div>{(x < Math.min(min, 0) || x > Math.max(max, 0)) && <div>Outside the calibrated range: the value saturates. This is why calibration data must be representative.</div>}</div></div>
      <p className="note">real = (q − zero_point) × scale. The range is widened to include 0.0 so that zero, used for padding and ReLU, has no error. Fewer bits means bigger steps; an outlier in the calibration data stretches the range and wastes steps on values that never occur.</p>
    </div>
  );
}

/* ---------------- FFT ---------------- */
export function fftMag(signal: number[]): number[] {
  const n = signal.length, re = signal.slice(), im = new Array(n).fill(0);
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k++) {
      const wr = Math.cos(ang * k), wi = Math.sin(ang * k), a = i + k, b = a + len / 2;
      const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
      re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
    }
  }
  return Array.from({ length: n / 2 }, (_, k) => Math.hypot(re[k], im[k]) / (n / 2));
}
export function FftViewer() {
  const N = 256;
  const [fs, setFs] = useState(1000), [f1, setF1] = useState(50), [f2, setF2] = useState(180), [a2, setA2] = useState(0.5), [noise, setNoise] = useState(0.1), [win, setWin] = useState<'rect' | 'hann'>('hann');
  const sig = useMemo(() => {
    let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5; };
    return Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * f1 * i / fs) + a2 * Math.sin(2 * Math.PI * f2 * i / fs) + noise * 2 * rnd());
  }, [fs, f1, f2, a2, noise]);
  const windowed = sig.map((v, i) => win === 'hann' ? v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1))) * 2 : v);
  const mag = useMemo(() => fftMag(windowed), [windowed]);
  let peak = 1; for (let k = 2; k < mag.length; k++) if (mag[k] > mag[peak]) peak = k;
  const alias = (f: number) => { const m = ((f % fs) + fs) % fs; return m > fs / 2 ? fs - m : m; };
  const aliased = [f1, f2].filter(f => f > fs / 2);
  return (
    <div className="widget">
      <div className="wrow">
        <Num label="Sample rate" value={fs} step={50} min={10} unit="Hz" onChange={v => setFs(Math.max(10, v || 10))} /><Num label="Tone 1" value={f1} step={5} unit="Hz" onChange={setF1} /><Num label="Tone 2" value={f2} step={5} unit="Hz" onChange={setF2} />
        <Num label="Tone 2 amplitude" value={a2} step={0.1} onChange={setA2} /><Num label="Noise" value={noise} step={0.05} onChange={setNoise} />
        <Seg label="Window" value={win} onChange={setWin} options={[['rect', 'Rectangular'], ['hann', 'Hann']] as const} />
      </div>
      <Plot series={[{ pts: sig.map((v, i) => [i / fs * 1000, v] as [number, number]), cls: 'ln-a' }]} h={140} xLabel="time, ms" />
      <Plot series={[{ pts: mag.map((m, k) => [k * fs / N, m] as [number, number]), cls: 'ln-b', bars: true }]} h={170} yMin={0} xLabel="frequency, Hz" xTicks={[0, fs / 8, fs / 4, fs * 3 / 8, fs / 2]} />
      <div className="kv"><div><span>Strongest bin</span><b className="big">{(peak * fs / N).toFixed(1)} Hz</b></div><div><span>Bin width = fs / N</span><b>{(fs / N).toFixed(2)} Hz</b></div><div><span>Highest visible frequency = fs / 2</span><b>{fs / 2} Hz</b></div><div><span>Window length</span><b>{N} samples, {(N / fs * 1000).toFixed(0)} ms</b></div></div>
      {aliased.length > 0 && <p className="note warn">{aliased.map(f => `${f} Hz is above fs/2 and shows up at ${alias(f).toFixed(0)} Hz.`).join(' ')} Nothing in the samples can tell you it is an alias; only a filter before the ADC prevents it.</p>}
      <p className="note">Set tone 1 to a frequency between two bins and switch the window to rectangular: energy leaks into neighbouring bins. The Hann window trades a wider peak for much less leakage. A longer window gives narrower bins and slower response; that trade-off sets your feature rate in Phase 9.</p>
    </div>
  );
}

/* ---------------- Confusion matrix ---------------- */
const erf = (x: number) => { const s = x < 0 ? -1 : 1, a = Math.abs(x), t = 1 / (1 + 0.3275911 * a); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)); };
const cdf = (x: number, mu: number, sd: number) => 0.5 * (1 + erf((x - mu) / (sd * Math.SQRT2)));
export function metrics(tp: number, fp: number, fn: number, tn: number) {
  const precision = tp / (tp + fp || 1), recall = tp / (tp + fn || 1);
  return { accuracy: (tp + tn) / (tp + fp + fn + tn || 1), precision, recall, f1: 2 * precision * recall / (precision + recall || 1), fpr: fp / (fp + tn || 1) };
}
export function ConfusionMatrix() {
  const [thr, setThr] = useState(0.5), [pos, setPos] = useState(100), [neg, setNeg] = useState(900), [sep, setSep] = useState(0.3);
  const muN = 0.5 - sep / 2, muP = 0.5 + sep / 2, sd = 0.15;
  const tp = Math.round(pos * (1 - cdf(thr, muP, sd))), fn = pos - tp, fp = Math.round(neg * (1 - cdf(thr, muN, sd))), tn = neg - fp;
  const m = metrics(tp, fp, fn, tn);
  const pct = (v: number) => (v * 100).toFixed(1) + '%';
  const dens = (mu: number, n: number) => Array.from({ length: 101 }, (_, i) => { const x = i / 100; return [x, n * Math.exp(-0.5 * ((x - mu) / sd) ** 2)] as [number, number]; });
  const top = Math.max(pos, neg);
  return (
    <div className="widget">
      <div className="wrow">
        <Num label="Real positives (events)" value={pos} step={10} min={0} onChange={v => setPos(Math.max(0, Math.round(v || 0)))} /><Num label="Real negatives (background)" value={neg} step={50} min={0} onChange={v => setNeg(Math.max(0, Math.round(v || 0)))} />
        <Num label="How separable the classes are" value={sep} step={0.05} min={0} max={0.8} onChange={setSep} />
      </div>
      <Plot series={[{ pts: dens(muN, neg), cls: 'ln-a' }, { pts: dens(muP, pos), cls: 'ln-b' }, { pts: [[thr, 0], [thr, top]], cls: 'ln-c' }]} h={150} yMin={0} xLabel="model score" xTicks={[0, 0.25, 0.5, 0.75, 1]} />
      <label className="field"><span>Decision threshold: {thr.toFixed(2)}</span><input type="range" min={0} max={1} step={0.01} value={thr} onChange={e => setThr(parseFloat(e.target.value))} /></label>
      <div className="cm" role="table" aria-label="Confusion matrix">
        <div /><div className="cm-h">Predicted positive</div><div className="cm-h">Predicted negative</div>
        <div className="cm-h">Actually positive</div><div className="cm-good">TP {tp}</div><div className="cm-bad">FN {fn}<small>missed events</small></div>
        <div className="cm-h">Actually negative</div><div className="cm-bad">FP {fp}<small>false alarms</small></div><div className="cm-good">TN {tn}</div>
      </div>
      <div className="kv">
        <div><span>Accuracy</span><b>{pct(m.accuracy)}</b></div><div><span>Precision = TP / (TP + FP)</span><b className="big">{pct(m.precision)}</b></div>
        <div><span>Recall = TP / (TP + FN)</span><b className="big">{pct(m.recall)}</b></div><div><span>F1</span><b>{pct(m.f1)}</b></div><div><span>False-alarm rate = FP / (FP + TN)</span><b>{pct(m.fpr)}</b></div>
      </div>
      <p className="note">With 900 background windows for every 100 events, a model that always says “negative” scores 90% accuracy and detects nothing. For a wake word or an anomaly detector, quote recall and false alarms per hour, never accuracy alone. Move the threshold to see the trade.</p>
    </div>
  );
}
