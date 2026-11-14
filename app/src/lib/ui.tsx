import { useEffect, useState, type ReactNode } from 'react';

export function Num(props: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string }) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <span className="field-row">
        <input type="number" value={Number.isFinite(props.value) ? props.value : 0} step={props.step ?? 'any'} min={props.min} max={props.max}
          onChange={e => props.onChange(parseFloat(e.target.value))} />
        {props.unit && <em>{props.unit}</em>}
      </span>
    </label>
  );
}
export function Txt(props: { label: string; value: string; onChange: (v: string) => void; mono?: boolean; width?: number }) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input type="text" className={props.mono ? 'mono' : ''} style={props.width ? { width: props.width } : undefined} value={props.value} spellCheck={false}
        onChange={e => props.onChange(e.target.value)} />
    </label>
  );
}
export function Seg<T extends string | number>(props: { label?: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      {props.label && <span>{props.label}</span>}
      <div className="seg" role="group" aria-label={props.label}>
        {props.options.map(([v, text]) => (
          <button key={String(v)} type="button" className={v === props.value ? 'on' : ''} aria-pressed={v === props.value} onClick={() => props.onChange(v)}>{text}</button>
        ))}
      </div>
    </div>
  );
}
export const Stat = (p: { k: string; v: ReactNode; sub?: string }) => (
  <div className="stat"><div className="stat-v">{p.v}</div><div className="stat-k">{p.k}</div>{p.sub && <div className="stat-sub">{p.sub}</div>}</div>
);
export const Bar = ({ value, tone }: { value: number; tone?: string }) => (
  <div className="bar" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}><i className={tone} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} /></div>
);
export const hex = (n: number, digits = 2) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(digits, '0');
export const parseNum = (s: string): number => {
  const t = s.trim().toLowerCase().replace(/_/g, '');
  if (/^0x[0-9a-f]+$/.test(t)) return parseInt(t.slice(2), 16);
  if (/^0b[01]+$/.test(t)) return parseInt(t.slice(2), 2);
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return NaN;
};
// Engineering notation: 4700 -> "4.7 k"
export function eng(v: number, unit = ''): string {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0 ' + unit;
  const prefixes = ['p', 'n', 'µ', 'm', '', 'k', 'M', 'G'];
  let i = 4, a = Math.abs(v);
  while (a >= 1000 && i < prefixes.length - 1) { a /= 1000; i++; }
  while (a < 1 && i > 0) { a *= 1000; i--; }
  return `${v < 0 ? '-' : ''}${Number(a.toPrecision(3))} ${prefixes[i]}${unit}`;
}

/** Labelled range slider with its current value shown on the right. */
export function Slide(p: { label: string; value: number; min: number; max: number; step?: number; show?: string; onChange: (v: number) => void }) {
  return (
    <label className="slide"><span>{p.label}</span><b>{p.show ?? p.value}</b>
      <input type="range" min={p.min} max={p.max} step={p.step ?? 1} value={p.value} onChange={e => p.onChange(parseFloat(e.target.value))} /></label>
  );
}
/** Seconds elapsed while `running` is true, updated every animation frame. */
export function useTicker(running: boolean): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!running) return;
    let raf = 0, last = performance.now();
    const step = (now: number) => { const dt = (now - last) / 1000; last = now; setT(x => x + dt); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  return t;
}
/** Small deterministic random generator so a widget draws the same picture for the same seed. */
export function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
