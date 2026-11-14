import { useState } from 'react';
import { owned, shopping, books, glossary, projects, jobSkills, jobSampleSize, type Tier } from '../data/catalog';
import { lessonById } from '../data/syllabus';
import { widgets, widgetById } from '../widgets';
import content from '../generated/content.json';
import { href, lessonHref } from '../lib/router';
import { update, useProgress, exportJSON, importJSON, resetAll } from '../lib/store';
import { refsToLessons, doneCount } from '../lib/progress';
import { Markdown } from '../lib/md';
import { Bar } from '../lib/ui';
import { Boards } from './Learn';

const sheets = content.sheets as { slug: string; title: string; body: string }[];

export function Hardware() {
  const pr = useProgress();
  const [tier, setTier] = useState<Tier | 'All'>('Must');
  const list = shopping.filter(s => tier === 'All' || s.tier === tier);
  const setState = (name: string, v: string) => update(d => { if (v) d.hardware[name] = v as 'owned' | 'ordered'; else delete d.hardware[name]; });
  return (
    <>
      <h1>Hardware</h1>
      <p className="lede">What is on your bench and what to buy next. Buy the Must tier now; buy everything else the week before the lesson that needs it.</p>
      <div className="card"><h3>On your bench</h3><p className="chips">{owned.map(o => <span className="chip" key={o}>{o}</span>)}{shopping.filter(s => pr.hardware[s.name] === 'owned').map(s => <span className="chip ready" key={s.name}>{s.name}</span>)}</p></div>
      <div className="seg" role="group" aria-label="Tier">{(['Must', 'Should', 'Later', 'All'] as const).map(t => <button key={t} type="button" className={t === tier ? 'on' : ''} onClick={() => setTier(t)}>{t}{t !== 'All' ? ` (${shopping.filter(s => s.tier === t).length})` : ''}</button>)}</div>
      <div className="scroll"><table>
        <thead><tr><th>Part</th><th>Tier</th><th>Why</th><th>First lesson</th><th>₹ rough</th><th>$ rough</th><th>Until it arrives</th><th>Status</th></tr></thead>
        <tbody>{list.map(s => <tr key={s.name} className={pr.hardware[s.name] ?? ''}>
          <td><b>{s.name}</b></td><td><span className={'chip t-' + s.tier}>{s.tier}</span></td><td>{s.why}</td><td><a href={lessonHref(s.first)}>{s.first}</a></td><td className="num">{s.inr}</td><td className="num">{s.usd}</td><td>{s.meanwhile}</td>
          <td><select value={pr.hardware[s.name] ?? ''} aria-label={`Status of ${s.name}`} onChange={e => setState(s.name, e.target.value)}><option value="">To buy</option><option value="ordered">Ordered</option><option value="owned">Owned</option></select></td>
        </tr>)}</tbody></table></div>
      <p className="fine">Prices are rough Indian retail figures from memory, not quotes. Lithium cells need a protection circuit and are never charged unattended. eFuse operations in Phase 5 are irreversible; keep one board aside for them.</p>
    </>
  );
}

export function Reading() {
  const pr = useProgress();
  return (
    <>
      <h1>Reading</h1>
      <p className="lede">Twenty to thirty minutes a day, separate from lab time. Four books carry the course; the rest are for looking things up.</p>
      <div className="scroll"><table>
        <thead><tr><th>Book</th><th>Edition</th><th>Phases</th><th>Read</th><th>Skip</th><th>Progress</th></tr></thead>
        <tbody>{books.map(b => <tr key={b.title}>
          <td><b>{b.title}</b>{b.core && <span className="chip ready">core</span>}<br /><span className="fine">{b.author}</span></td><td>{b.edition}</td><td>{b.phases}</td><td>{b.read}</td><td>{b.skip}</td>
          <td className="bookprog"><input type="range" min={0} max={100} step={5} value={pr.books[b.title] ?? 0} aria-label={`Progress through ${b.title}`} onChange={e => update(d => { d.books[b.title] = Number(e.target.value); })} /><small>{pr.books[b.title] ?? 0}%</small></td>
        </tr>)}</tbody></table></div>
      <p className="fine">Primary sources outrank every book: the ESP32-S3 Technical Reference Manual and datasheet, the ESP-IDF Programming Guide for your version, and each sensor’s datasheet. Only the editions marked verified were checked; confirm the others before buying.</p>
    </>
  );
}

export function Jobs() {
  const pr = useProgress();
  const [f, setF] = useState({ title: '', url: '', note: '' });
  return (
    <>
      <h1>Job market</h1>
      <p className="lede">What postings ask for, mapped to lessons, with your progress against each skill. The counts come from a first sample of {jobSampleSize} postings read as excerpts in November 2026: directional, not a census.</p>
      <div className="scroll"><table>
        <thead><tr><th>Skill named in postings</th><th>Postings</th><th>Covered by</th><th>Your progress</th></tr></thead>
        <tbody>{jobSkills.map(s => { const ids = refsToLessons(s.refs); const frac = doneCount(ids, pr) / (ids.length || 1); return <tr key={s.skill}>
          <td><b>{s.skill}</b></td><td className="num">{s.count} of {jobSampleSize}<Bar value={s.count / jobSampleSize} tone="copper" /></td>
          <td>{s.refs.map(r => /^P/.test(r) ? <a key={r} className="chip" href={href('phase', r.slice(1))}>Phase {r.slice(1)}</a> : <a key={r} className="chip" href={lessonHref(r)}>{r}</a>)}</td>
          <td><Bar value={frac} /><small>{Math.round(frac * 100)}%</small></td></tr>; })}</tbody></table></div>
      <div className="card"><h3>What the sample says</h3><ul>
        <li>ESP32 is almost never named; STM32 and ARM Cortex-M are. Lesson 3.11 and HAL-separated drivers answer that.</li>
        <li>NVIDIA and Qualcomm roles in the sample are Linux, QNX and driver work. Phase 8 exists for them.</li>
        <li>Edge-AI roles ask for firmware first, then one inference runtime and quantization.</li></ul></div>
      <h2>Postings you are tracking</h2>
      <p>Save postings here as you find them. Lesson 10.1 turns this list into the full skills-gap matrix.</p>
      <div className="wrow">
        <label className="field"><span>Title and company</span><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></label>
        <label className="field"><span>Link</span><input value={f.url} onChange={e => setF({ ...f, url: e.target.value })} /></label>
        <label className="field"><span>Skills it names</span><input value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></label>
        <button type="button" className="btn" disabled={!f.title.trim()} onClick={() => { update(d => { d.jobs.push(f); }); setF({ title: '', url: '', note: '' }); }}>Save posting</button>
      </div>
      {pr.jobs.length === 0 ? <p className="fine">No postings saved yet. Add the first one that makes you think “I want that job”.</p> :
        <ul className="plain rows">{pr.jobs.map((j, i) => <li key={i}><b>{/^https?:\/\//.test(j.url) ? <a href={j.url} target="_blank" rel="noreferrer">{j.title}</a> : j.title}</b> {j.note} <button type="button" className="btn ghost" onClick={() => update(d => { d.jobs.splice(i, 1); })}>Remove</button></li>)}</ul>}
    </>
  );
}

export function Glossary() {
  const [q, setQ] = useState('');
  const hits = glossary.filter(([t, d]) => (t + ' ' + d).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h1>Glossary</h1>
      <label className="field"><span>Search {glossary.length} terms</span><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="volatile, pull-up, jitter…" /></label>
      {hits.length ? <dl className="glossary">{hits.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl> : <p>No term matches “{q}”. Terms are added as lessons are written.</p>}
    </>
  );
}

export function Cheatsheets({ arg }: { arg: string }) {
  const s = sheets.find(x => x.slug === arg);
  if (s) return <><p className="crumb"><a href={href('sheets')}>Cheatsheets</a> / {s.title}</p><h1>{s.title}</h1><Markdown source={s.body} id={'sheet:' + s.slug} /></>;
  return (
    <>
      <h1>Cheatsheets</h1>
      <p className="lede">One page each, for the moments you need the fact and not the lesson.</p>
      <ul className="plain rows">{sheets.map(x => <li key={x.slug}><a href={href('sheets', x.slug)}><b>{x.title}</b></a></li>)}</ul>
      
    </>
  );
}

export function Projects() {
  return (
    <>
      <h1>Projects</h1>
      <p className="lede">Twenty-two builds across five tiers. The twist is mandatory: it is what stops a project being a copied tutorial. Reference solutions unlock only after you log an attempt.</p>
      {[1, 2, 3, 4, 5].map(t => (
        <section key={t}><h2>Tier {t}{t === 5 ? ': capstones, choose two or three' : ''}</h2>
          <div className="scroll"><table><thead><tr><th>Project</th><th>After</th><th>Board</th><th>Your twist</th></tr></thead>
            <tbody>{projects.filter(p => p.tier === t).map(p => <tr key={p.name}><td><b>{p.name}</b></td><td>{lessonById(p.after) ? <a href={lessonHref(p.after)}>{p.after}</a> : p.after}</td><td><Boards boards={p.board} /></td><td>{p.twist}</td></tr>)}</tbody></table></div>
        </section>))}
      <p className="fine">Milestones, acceptance tests and design-review checklists for each project are written with the phase that unlocks it.</p>
    </>
  );
}

export function Interview() {
  return (
    <>
      <h1>Interview prep</h1>
      <p className="lede">Phase 10 turns the course into interview practice. The habit starts earlier: every lesson ends with “common mistakes and interview angles”, and every quiz question you miss comes back.</p>
      <div className="cols2">
        {[['C drills', 'volatile, pointers, bit tricks, undefined behaviour. Drawn from the Phase 1 question bank.', '10.2'], ['RTOS', 'Priority inversion, deadlock, ISR design, on a whiteboard.', '10.3'], ['Protocols', 'Draw and decode I2C, SPI, UART and CAN frames from memory.', '10.4'],
          ['System design', 'Design a battery-powered sensor node, three ways.', '10.5'], ['Debugging scenarios', 'Ten “the device resets every few hours” cases.', '10.6'], ['Behavioural', 'Stories with a measurable outcome: latency, power, memory.', '10.8']].map(([t, d, l]) =>
          <div className="card" key={t}><h3>{t}</h3><p>{d}</p><p><a href={lessonHref(l)}>Lesson {l}</a></p></div>)}
      </div>
      <p>Today you can already practise with the <a href={href('widget', 'timing')}>timing-diagram decoder</a>, the <a href={href('widget', 'bits')}>bit playground</a> and the <a href={href('widget', 'sched')}>priority-inversion scenario</a>.</p>
    </>
  );
}

export function WidgetsPage({ arg }: { arg: string }) {
  const w = widgetById(arg);
  if (w) return (
    <>
      <p className="crumb"><a href={href('widgets')}>Tools</a> / {w.title}</p>
      <h1>{w.title}</h1>
      <p className="lede">{w.blurb}</p>
      <w.C />
      <p className="fine">Used in {w.lessons.map((l, i) => <span key={l}>{i > 0 && ', '}<a href={lessonHref(l)}>{l}</a></span>)}.</p>
    </>
  );
  return (
    <>
      <h1>Tools</h1>
      <p className="lede">{widgets.length} interactive tools. Each also appears inside the lessons that need it.</p>
      <div className="cols3">{widgets.map(x => <a className="card link" key={x.id} href={href('widget', x.id)}><h3>{x.title}</h3><p>{x.blurb}</p></a>)}</div>
    </>
  );
}

export function Settings() {
  const pr = useProgress();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <>
      <h1>Your data</h1>
      <p className="lede">Progress is stored only in this browser. Export it to move machines or to keep a backup.</p>
      <div className="card">
        <h3>Export</h3>
        <p><button type="button" className="btn" onClick={() => { const blob = new Blob([exportJSON()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'embedded-course-progress.json'; a.click(); setText(exportJSON()); setMsg('Downloaded. The same data is in the box below if your browser blocked the download.'); }}>Export progress</button></p>
        <h3>Import</h3>
        <textarea rows={6} className="mono" value={text} onChange={e => setText(e.target.value)} placeholder="Paste an exported progress file here." aria-label="Progress JSON" />
        <p><button type="button" className="btn ghost" disabled={!text.trim()} onClick={() => { const err = importJSON(text); setMsg(err ?? 'Imported. Your dashboard now shows the imported progress.'); }}>Import progress</button></p>
        {msg && <p className="note">{msg}</p>}
      </div>
      <div className="card"><h3>Start over</h3><p>{Object.keys(pr.lessons).length} lessons and {Object.keys(pr.leitner).length} quiz cards are stored.</p>
        <p><button type="button" className="btn ghost danger" onClick={() => { if (confirm('Erase all progress in this browser? Export first if you want a copy.')) { resetAll(); setMsg('Progress erased.'); } }}>Erase all progress</button></p></div>
    </>
  );
}
