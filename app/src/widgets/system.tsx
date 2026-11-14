import { useMemo, useState } from 'react';
import { Num, Seg, hex, parseNum } from '../lib/ui';

/* ---------------- FreeRTOS-style scheduler ---------------- */
type Op = ['run', number] | ['lock'] | ['unlock'];
type TaskDef = { name: string; prio: number; start: number; period?: number; script: Op[] };
type Cell = 'run' | 'runlock' | 'blocked' | 'ready' | 'idle';
export type SimResult = { grid: Cell[][]; finish: (number | null)[]; misses: number[] };

// Fixed-priority preemptive scheduling, one tick at a time. Higher number = higher priority.
export function simulate(tasks: TaskDef[], ticks: number, inherit: boolean): SimResult {
  const st = tasks.map(t => ({ pc: 0, left: 0, state: 'wait' as 'wait' | 'ready' | 'blocked' | 'done', eff: t.prio, next: t.start }));
  let owner = -1;
  const grid: Cell[][] = tasks.map(() => []);
  const finish: (number | null)[] = tasks.map(() => null);
  const misses: number[] = tasks.map(() => 0);
  for (let t = 0; t < ticks; t++) {
    tasks.forEach((def, i) => {
      if (st[i].next === t) {
        if (st[i].state === 'ready' || st[i].state === 'blocked') misses[i]++;
        else { st[i].pc = 0; st[i].left = 0; st[i].state = 'ready'; }
        st[i].next = def.period ? t + def.period : -1;
      }
    });
    let running = -1;
    for (let guard = 0; guard < 50; guard++) {
      let best = -1;
      st.forEach((s, i) => { if (s.state === 'ready' && (best < 0 || s.eff > st[best].eff)) best = i; });
      if (best < 0) break;
      const s = st[best], op = tasks[best].script[s.pc];
      if (!op) { s.state = 'done'; finish[best] = finish[best] ?? t; continue; }
      if (op[0] === 'lock') {
        if (owner < 0) { owner = best; s.pc++; }
        else { s.state = 'blocked'; if (inherit && st[owner].eff < s.eff) st[owner].eff = s.eff; }
        continue;
      }
      if (op[0] === 'unlock') {
        owner = -1; s.eff = tasks[best].prio; s.pc++;
        st.forEach(o => { if (o.state === 'blocked') o.state = 'ready'; });
        continue;
      }
      if (s.left === 0) s.left = op[1];
      running = best; break;
    }
    st.forEach((s, i) => grid[i].push(i === running ? (owner === i ? 'runlock' : 'run') : s.state === 'blocked' ? 'blocked' : s.state === 'ready' ? 'ready' : 'idle'));
    if (running >= 0) {
      const s = st[running];
      if (--s.left === 0) { s.pc++; if (s.pc >= tasks[running].script.length) { s.state = 'done'; finish[running] = t + 1; } }
    }
  }
  return { grid, finish, misses };
}

const INVERSION: TaskDef[] = [
  { name: 'High (prio 3)', prio: 3, start: 2, script: [['run', 1], ['lock'], ['run', 2], ['unlock'], ['run', 1]] },
  { name: 'Medium (prio 2)', prio: 2, start: 3, script: [['run', 6]] },
  { name: 'Low (prio 1)', prio: 1, start: 0, script: [['run', 1], ['lock'], ['run', 4], ['unlock'], ['run', 1]] },
];

export function Scheduler() {
  const [preset, setPreset] = useState<'periodic' | 'inversion'>('periodic');
  const [inherit, setInherit] = useState(0);
  const [tasks, setTasks] = useState([{ name: 'Sensor', prio: 3, period: 5, exec: 1 }, { name: 'Control', prio: 2, period: 10, exec: 3 }, { name: 'Logger', prio: 1, period: 20, exec: 6 }]);
  const T = preset === 'periodic' ? 40 : 18;
  const defs: TaskDef[] = preset === 'inversion' ? INVERSION
    : tasks.map(t => ({ name: `${t.name} (prio ${t.prio})`, prio: t.prio, start: 0, period: Math.max(1, t.period), script: [['run', Math.max(1, t.exec)]] as Op[] }));
  const r = useMemo(() => simulate(defs, T, !!inherit), [JSON.stringify(defs), T, inherit]);
  const util = tasks.reduce((s, t) => s + t.exec / t.period, 0);
  const bound = tasks.length * (Math.pow(2, 1 / tasks.length) - 1);
  const edit = (i: number, k: 'prio' | 'period' | 'exec') => (v: number) => setTasks(ts => ts.map((t, j) => j === i ? { ...t, [k]: Math.max(1, Math.round(v || 1)) } : t));
  const u = 20, left = 132;
  return (
    <div className="widget">
      <div className="wrow">
        <Seg label="Scenario" value={preset} onChange={setPreset} options={[['periodic', 'Three periodic tasks'], ['inversion', 'Priority inversion']] as const} />
        {preset === 'inversion' && <Seg label="Mutex" value={inherit} onChange={setInherit} options={[[0, 'Plain lock'], [1, 'Priority inheritance']] as [number, string][]} />}
      </div>
      {preset === 'periodic' && <div className="wrow">{tasks.map((t, i) => (
        <fieldset key={t.name} className="group"><legend>{t.name}</legend>
          <Num label="Priority" value={t.prio} step={1} min={1} onChange={edit(i, 'prio')} /><Num label="Period" value={t.period} step={1} min={1} unit="ticks" onChange={edit(i, 'period')} /><Num label="Runs for" value={t.exec} step={1} min={1} unit="ticks" onChange={edit(i, 'exec')} />
        </fieldset>))}</div>}
      <div className="scroll">
        <svg width={left + T * u + 10} height={defs.length * 40 + 30} className="gantt" role="img" aria-label="Which task runs on each tick">
          {defs.map((d, i) => <g key={d.name}>
            <text x={0} y={i * 40 + 26} className="wname">{d.name}</text>
            {r.grid[i].map((c, t) => <rect key={t} x={left + t * u} y={i * 40 + 8} width={u - 1} height={26} className={'g-' + c} />)}
          </g>)}
          {Array.from({ length: T / (preset === 'periodic' ? 5 : 2) + 1 }, (_, k) => k * (preset === 'periodic' ? 5 : 2)).map(t => <text key={t} x={left + t * u} y={defs.length * 40 + 22} className="wlabel" textAnchor="middle">{t}</text>)}
        </svg>
      </div>
      <div className="legend"><span className="g-run">running</span><span className="g-runlock">running, holds the mutex</span><span className="g-ready">ready, waiting for the CPU</span><span className="g-blocked">blocked on the mutex</span></div>
      {preset === 'periodic' ? <>
        <div className="kv"><div><span>CPU utilisation, Σ run/period</span><b className="big">{(util * 100).toFixed(0)}%</b></div><div><span>Rate-monotonic bound for {tasks.length} tasks</span><b>{(bound * 100).toFixed(0)}%</b></div><div><span>Releases missed (previous job unfinished)</span><b>{r.misses.reduce((a, b) => a + b, 0)}</b></div></div>
        <p className={'note' + (r.misses.some(m => m > 0) ? ' warn' : '')}>The highest-priority ready task always runs. Raise the Logger’s run time or give the slow task the highest priority and watch the others miss releases. Below the rate-monotonic bound, shortest-period-first priorities are guaranteed to meet every deadline; above it you must check.</p>
      </> : <>
        <div className="kv"><div><span>High task finishes at tick</span><b className="big">{r.finish[0] ?? '—'}</b></div><div><span>Medium task finishes at tick</span><b>{r.finish[1] ?? '—'}</b></div></div>
        <p className={'note ' + (inherit ? 'ok' : 'warn')}>{inherit
          ? 'With inheritance, Low is lifted to High’s priority while High waits for the mutex. Medium cannot preempt it, Low finishes its critical section quickly, and High runs next.'
          : 'High blocks on the mutex that Low holds. Medium, which needs no mutex at all, preempts Low and runs for six ticks. The highest-priority task is waiting for the lowest, which is waiting for the middle one: priority inversion.'}</p>
      </>}
    </div>
  );
}

/* ---------------- Flash partition map and C sections ---------------- */
type Part = { name: string; type: string; sub: string; off: string; size: string };
const SINGLE: Part[] = [{ name: 'nvs', type: 'data', sub: 'nvs', off: '0x9000', size: '0x6000' }, { name: 'phy_init', type: 'data', sub: 'phy', off: '0xf000', size: '0x1000' }, { name: 'factory', type: 'app', sub: 'factory', off: '0x10000', size: '0x100000' }];
const OTA: Part[] = [{ name: 'nvs', type: 'data', sub: 'nvs', off: '0x9000', size: '0x4000' }, { name: 'otadata', type: 'data', sub: 'ota', off: '0xd000', size: '0x2000' }, { name: 'phy_init', type: 'data', sub: 'phy', off: '0xf000', size: '0x1000' },
  { name: 'factory', type: 'app', sub: 'factory', off: '0x10000', size: '0x100000' }, { name: 'ota_0', type: 'app', sub: 'ota_0', off: '0x110000', size: '0x100000' }, { name: 'ota_1', type: 'app', sub: 'ota_1', off: '0x210000', size: '0x100000' }];
const DECLS: [string, string, string][] = [
  ['const char banner[] = "hello";', '.rodata (flash)', 'Read-only data stays in flash and is mapped into the address space. It costs no RAM.'],
  ['int counter = 42;', '.data (RAM, copied from flash at boot)', 'Initialised globals need RAM for the variable and flash for the initial value.'],
  ['static uint8_t buffer[4096];', '.bss (RAM, zeroed at boot)', 'Zero-initialised statics take RAM but no flash. Large buffers here are a common reason the RAM runs out.'],
  ['void app_main(void) { ... }', '.text (flash)', 'Code executes from flash through the cache. Functions marked IRAM_ATTR are copied to RAM instead.'],
  ['int local = 0;  // inside a function', 'stack of the current task', 'Each FreeRTOS task has its own fixed-size stack. A large local array can overflow it.'],
  ['char *p = malloc(256);', 'heap', 'Allocated at run time. Can fail, can fragment, and must be freed.'],
  ['static int calls;  // inside a function', '.bss (RAM)', 'A static local lives for the whole program, like a global, but is only visible in that function.'],
];
export function MemoryMap() {
  const [view, setView] = useState<'flash' | 'c'>('flash');
  const [flashMb, setFlashMb] = useState(16);
  const [parts, setParts] = useState<Part[]>(SINGLE);
  const [pick, setPick] = useState(0);
  const total = flashMb * 1024 * 1024;
  const rows = parts.map(p => ({ ...p, o: parseNum(p.off), s: parseNum(p.size) }));
  const problems: string[] = [];
  rows.forEach((r, i) => {
    if (Number.isNaN(r.o) || Number.isNaN(r.s)) { problems.push(`${r.name}: offset or size is not a number.`); return; }
    if (r.o < 0x9000) problems.push(`${r.name}: starts below 0x9000, inside the bootloader or the partition table.`);
    if (r.type === 'app' && r.o % 0x10000 !== 0) problems.push(`${r.name}: app partitions must start on a 0x10000 (64 KB) boundary.`);
    if (r.o + r.s > total) problems.push(`${r.name}: runs past the end of the ${flashMb} MB flash.`);
    rows.forEach((q, j) => { if (j > i && r.o < q.o + q.s && q.o < r.o + r.s) problems.push(`${r.name} overlaps ${q.name}.`); });
  });
  const used = rows.reduce((s, r) => s + (r.s || 0), 0) + 0x9000;
  const edit = (i: number, k: keyof Part, v: string) => setParts(ps => ps.map((p, j) => j === i ? { ...p, [k]: v } : p));
  const csv = '# Name,   Type, SubType, Offset,  Size\n' + parts.map(p => `${p.name}, ${p.type}, ${p.sub}, ${p.off}, ${p.size},`).join('\n');
  return (
    <div className="widget">
      <Seg value={view} onChange={setView} options={[['flash', 'Flash partition table'], ['c', 'Where does this C declaration live?']] as const} />
      {view === 'flash' ? <>
        <div className="wrow">
          <Seg label="Flash size" value={flashMb} onChange={setFlashMb} options={[[4, '4 MB'], [8, '8 MB'], [16, '16 MB']] as [number, string][]} />
          <div className="field"><span>Start from</span><div className="seg"><button type="button" onClick={() => setParts(SINGLE)}>Single app</button><button type="button" onClick={() => setParts(OTA)}>Factory + two OTA slots</button></div></div>
        </div>
        <div className="flashbar" aria-label="Flash layout">
          <i className="f-boot" style={{ width: `${Math.max(0.6, 0x8000 / total * 100)}%` }} title="bootloader region" />
          <i className="f-pt" style={{ width: `${Math.max(0.4, 0x1000 / total * 100)}%` }} title="partition table at 0x8000" />
          {[...rows].sort((x, y) => x.o - y.o).map(r => <i key={r.name} className={'f-' + r.type} style={{ width: `${Math.max(0.6, (r.s || 0) / total * 100)}%` }} title={`${r.name} ${r.off} + ${r.size}`}><b>{(r.s || 0) / total > 0.05 ? r.name : ''}</b></i>)}
        </div>
        <div className="legend"><span className="f-boot">bootloader</span><span className="f-pt">partition table</span><span className="f-data">data</span><span className="f-app">app</span><span>unused: {((total - used) / 1024 / 1024).toFixed(2)} MB</span></div>
        <div className="scroll"><table className="mini"><thead><tr><th>Name</th><th>Type</th><th>SubType</th><th>Offset</th><th>Size</th><th></th></tr></thead><tbody>
          {parts.map((p, i) => <tr key={i}>{(['name', 'type', 'sub', 'off', 'size'] as (keyof Part)[]).map(k => <td key={k}><input className="mono cellin" value={p[k]} spellCheck={false} aria-label={`${k} of row ${i + 1}`} onChange={e => edit(i, k, e.target.value)} /></td>)}
            <td><button type="button" className="btn ghost" onClick={() => setParts(ps => ps.filter((_, j) => j !== i))} aria-label={`Remove ${p.name}`}>Remove</button></td></tr>)}
        </tbody></table></div>
        <button type="button" className="btn ghost" onClick={() => setParts(ps => [...ps, { name: 'storage', type: 'data', sub: 'littlefs', off: hex(Math.max(0x10000, ...rows.map(r => (r.o + r.s) || 0)), 6).toLowerCase(), size: '0x100000' }])}>Add a partition</button>
        {problems.length ? <ul className="note warn">{problems.map(x => <li key={x}>{x}</li>)}</ul> : <p className="note ok">No overlaps, alignment is valid, everything fits.</p>}
        <pre><code>{csv}</code></pre>
        <p className="note">The partition table itself sits at 0x8000 by default and everything below it belongs to the bootloader, so the first usable offset is 0x9000. Save the CSV as <code>partitions.csv</code> and select “Custom partition table CSV” in menuconfig.</p>
      </> : <>
        <div className="decls">{DECLS.map((d, i) => <button type="button" key={d[0]} className={'decl' + (i === pick ? ' on' : '')} onClick={() => setPick(i)}><code>{d[0]}</code></button>)}</div>
        <div className="kv"><div><span>Section</span><b className="big">{DECLS[pick][1]}</b></div></div>
        <p className="note">{DECLS[pick][2]}</p>
      </>}
    </div>
  );
}

/* ---------------- State machine designer ---------------- */
type Tr = { from: string; ev: string; to: string; act: string };
const BUTTON: Tr[] = [
  { from: 'IDLE', ev: 'PRESS', to: 'DEBOUNCE', act: 'start_timer' },
  { from: 'DEBOUNCE', ev: 'TIMEOUT', to: 'PRESSED', act: 'on_press' },
  { from: 'DEBOUNCE', ev: 'RELEASE', to: 'IDLE', act: '' },
  { from: 'PRESSED', ev: 'RELEASE', to: 'IDLE', act: 'on_click' },
  { from: 'PRESSED', ev: 'HOLD', to: 'HELD', act: 'on_long_press' },
  { from: 'HELD', ev: 'RELEASE', to: 'IDLE', act: '' },
];
const ident = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
export function StateMachine() {
  const [rows, setRows] = useState<Tr[]>(BUTTON);
  const clean = rows.map(r => ({ from: ident(r.from), ev: ident(r.ev), to: ident(r.to), act: r.act.trim().replace(/[^A-Za-z0-9_]/g, '_') })).filter(r => r.from && r.ev && r.to);
  const states = Array.from(new Set(clean.flatMap(r => [r.from, r.to])));
  const events = Array.from(new Set(clean.map(r => r.ev)));
  const [cur, setCur] = useState('IDLE');
  const [log, setLog] = useState<string[]>([]);
  const here = states.includes(cur) ? cur : states[0] ?? '';
  const R = 110, cx = 190, cy = 150;
  const pos = (s: string) => { const i = states.indexOf(s), a = -Math.PI / 2 + 2 * Math.PI * i / Math.max(1, states.length); return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; };
  const fire = (ev: string) => { const t = clean.find(r => r.from === here && r.ev === ev); if (t) { setCur(t.to); setLog(l => [`${here} --${ev}--> ${t.to}${t.act ? `   ${t.act}()` : ''}`, ...l].slice(0, 6)); } else setLog(l => [`${here}: ${ev} ignored`, ...l].slice(0, 6)); };
  const edit = (i: number, k: keyof Tr, v: string) => setRows(rs => rs.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const acts = Array.from(new Set(clean.map(r => r.act).filter(Boolean)));
  const code = [
    `#include <stddef.h>`, '',
    `typedef enum { ${states.map(s => 'ST_' + s).join(', ')}, ST_COUNT } state_t;`,
    `typedef enum { ${events.map(e => 'EV_' + e).join(', ')}, EV_COUNT } event_t;`,
    `typedef struct { state_t next; void (*action)(void); } transition_t;`, '',
    ...acts.map(a => `static void ${a}(void);`), '',
    `/* Every state and event pair is listed. Pairs you did not define stay in the same state with no action. */`,
    `static const transition_t table[ST_COUNT][EV_COUNT] = {`,
    ...states.flatMap(s => events.map(e => { const t = clean.find(r => r.from === s && r.ev === e); return `    [ST_${s}][EV_${e}] = { ${t ? 'ST_' + t.to : 'ST_' + s}, ${t && t.act ? t.act : 'NULL'} },`; })),
    `};`, '',
    `static state_t state = ST_${states[0] ?? 'IDLE'};`,
    `void fsm_dispatch(event_t ev) {`,
    `    const transition_t *t = &table[state][ev];`,
    `    if (t->action) t->action();`,
    `    state = t->next;`,
    `}`,
  ].join('\n');
  return (
    <div className="widget">
      <div className="fsm">
        <svg viewBox="0 0 380 300" role="img" aria-label="State diagram" className="fsmsvg">
          <defs><marker id="fsm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" className="fsm-head" /></marker></defs>
          {clean.map((t, i) => { const [x1, y1] = pos(t.from), [x2, y2] = pos(t.to);
            if (t.from === t.to) return <g key={i}><circle cx={x1} cy={y1 - 38} r={13} className={'fsm-edge' + (t.from === here ? ' live' : '')} /><text x={x1} y={y1 - 56} textAnchor="middle" className="fsm-ev">{t.ev}</text></g>;
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
            const bend = 22, qx = mx - dy / len * bend, qy = my + dx / len * bend, sx = x1 + (qx - x1) / Math.hypot(qx - x1, qy - y1) * 30, sy = y1 + (qy - y1) / Math.hypot(qx - x1, qy - y1) * 30, ex = x2 + (qx - x2) / Math.hypot(qx - x2, qy - y2) * 32, ey = y2 + (qy - y2) / Math.hypot(qx - x2, qy - y2) * 32;
            return <g key={i}><path d={`M${sx} ${sy}Q${qx} ${qy} ${ex} ${ey}`} className={'fsm-edge' + (t.from === here ? ' live' : '')} markerEnd="url(#fsm-arrow)" /><text x={qx} y={qy} textAnchor="middle" className="fsm-ev">{t.ev}</text></g>; })}
          {states.map(s => { const [x, y] = pos(s); return <g key={s}><circle cx={x} cy={y} r={28} className={'fsm-state' + (s === here ? ' on' : '')} /><text x={x} y={y + 4} textAnchor="middle" className="fsm-name">{s.length > 8 ? s.slice(0, 7) + '…' : s}</text></g>; })}
        </svg>
        <div>
          <div className="field"><span>Send an event (state: <b>{here}</b>)</span><div className="seg">{events.map(e => <button key={e} type="button" onClick={() => fire(e)}>{e}</button>)}<button type="button" onClick={() => { setCur(states[0] ?? ''); setLog([]); }}>Reset</button></div></div>
          <pre className="log"><code>{log.length ? log.join('\n') : 'No events yet.'}</code></pre>
        </div>
      </div>
      <div className="scroll"><table className="mini"><thead><tr><th>In state</th><th>On event</th><th>Go to</th><th>Action</th><th></th></tr></thead><tbody>
        {rows.map((r, i) => <tr key={i}>{(['from', 'ev', 'to', 'act'] as (keyof Tr)[]).map(k => <td key={k}><input className="mono cellin" value={r[k]} spellCheck={false} aria-label={`${k} of transition ${i + 1}`} onChange={e => edit(i, k, e.target.value)} /></td>)}
          <td><button type="button" className="btn ghost" onClick={() => setRows(rs => rs.filter((_, j) => j !== i))} aria-label="Remove transition">Remove</button></td></tr>)}
      </tbody></table></div>
      <button type="button" className="btn ghost" onClick={() => setRows(rs => [...rs, { from: here || 'IDLE', ev: 'EVENT', to: here || 'IDLE', act: '' }])}>Add a transition</button>
      <pre><code>{code}</code></pre>
      <p className="note">A table makes every state and event pair visible, including the ones you forgot. The generated code is a starting point: review the unlisted pairs before using it.</p>
    </div>
  );
}
