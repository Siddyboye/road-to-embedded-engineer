import { phases, allLessons, totalHours, checkpoints, phaseOfLesson } from '../data/syllabus';
import { shopping } from '../data/catalog';
import { href, lessonHref } from '../lib/router';
import { useProgress, streak, isoDay, addDays, type Progress } from '../lib/store';
import { doneCount, phaseFraction, nextLesson, hoursDone, dueQuestions, weakTags } from '../lib/progress';
import { Bar, Stat } from '../lib/ui';


/** The whole course as one bar: each phase as wide as its hours, filled as far as you have got. */
function CourseArc({ pr }: { pr: Progress }) {
  const W = 1000, gap = 4, usable = W - gap * (phases.length - 1);
  let x = 0;
  const segs = phases.map(p => { const w = p.hours / totalHours * usable, seg = { p, x, w, f: phaseFraction(p, pr) }; x += w + gap; return seg; });
  return (
    <svg viewBox={`0 0 ${W} 92`} className="arc" role="img" aria-label="Course progress by phase">
      {segs.map(({ p, x, w, f }) => (
        <a key={p.id} href={href('phase', String(p.id))} aria-label={`Phase ${p.id}: ${p.title}, ${Math.round(f * 100)}% done`}>
          <rect x={x} y="30" width={w} height="26" rx="5" className={'arc-track' + (p.id === 9 ? ' target' : '')} />
          <rect x={x} y="30" width={Math.max(0, w * f)} height="26" rx="5" className="arc-fill" />
          <text x={x + w / 2} y="48" textAnchor="middle" className="arc-n">{p.id}</text>
          <text x={x + w / 2} y="76" textAnchor="middle" className="arc-h">{p.hours} h</text>
        </a>))}
      {checkpoints.map(c => { const s = segs[c.afterPhase], cx = s.x + s.w + gap / 2; return <g key={c.id}><path d={`M${cx} 12 l6 6 l-6 6 l-6 -6 z`} className="arc-gem" /><text x={cx} y="9" textAnchor="middle" className="arc-h">{c.id}</text></g>; })}
    </svg>
  );
}
/** Eighteen weeks of activity, one square per day. */
function Heatmap({ days }: { days: string[] }) {
  const set = new Set(days), today = isoDay(), dow = new Date(today + 'T12:00:00').getDay(), weeks = 18;
  const start = addDays(today, -(weeks - 1) * 7 - dow);
  return (
    <svg viewBox={`0 0 ${weeks * 15} 108`} className="hm" role="img" aria-label={`${days.length} active days`}>
      {Array.from({ length: weeks * 7 }, (_, i) => { const d = addDays(start, i); if (d > today) return null; return <rect key={d} x={Math.floor(i / 7) * 15} y={(i % 7) * 15} width="12" height="12" rx="3" className={(set.has(d) ? 'on' : '') + (d === today ? ' today' : '')}><title>{d}{set.has(d) ? ': active' : ''}</title></rect>; })}
    </svg>
  );
}

export function Dashboard() {
  const pr = useProgress();
  const done = doneCount(allLessons.map(l => l.id), pr);
  const next = nextLesson(pr);
  const nextPhase = next ? phaseOfLesson(next.id) : undefined;
  const due = dueQuestions(pr).length;
  const weak = weakTags(pr).slice(0, 4);
  const toBuy = shopping.filter(s => s.tier === 'Must' && !pr.hardware[s.name]);
  return (
    <>
      <h1>Embedded engineer, by building</h1>
      <p className="lede">{done === 0 ? 'Nothing is ticked yet. Start with lesson 0.1: it takes one evening and ends with your board talking to you.' : `${done} of ${allLessons.length} lessons done. Keep the chain going.`}</p>
      <div className="stats">
        <Stat k="lessons done" v={`${done} / ${allLessons.length}`} />
        <Stat k="hours of the course" v={`${Math.round(hoursDone(pr))} / ${totalHours}`} sub="estimated from lessons ticked" />
        <Stat k="day streak" v={streak(pr.days)} sub={pr.days.length ? `${pr.days.length} active days in total` : 'starts with your first tick'} />
        <Stat k="reviews due" v={due} sub={due ? 'spaced repetition' : 'nothing waiting'} />
      </div>
      <section className="card"><h2>The course at a glance</h2><CourseArc pr={pr} /><p className="fine">Each block is a phase, as wide as its hours. Diamonds are the four checkpoints; the outlined block is Edge AI, your main target. Select a block to open its phase.</p></section>
      <div className="cols2">
        <section className="card accent">
          <h2>Next up</h2>
          {next && nextPhase ? <>
            <p className="eyeline">Phase {nextPhase.id}, lesson {next.id}</p>
            <h3><a href={lessonHref(next.id)}>{next.title}</a></h3>
            <p><b>Build first:</b> {next.build}.</p>
            <p><a className="btn" href={lessonHref(next.id)}>Open lesson {next.id}</a> {due > 0 && <a className="btn ghost" href={href('quiz', 'review')}>Review {due} due</a>}</p>
          </> : <p>Every lesson is ticked. Go and build something nobody asked for.</p>}
        </section>
        <section className="card">
          <h2>Before you can continue</h2>
          {toBuy.length ? <><p>{toBuy.length} Must-tier parts are not marked owned or ordered. The soonest needed:</p>
            <ul className="plain">{[...toBuy].sort((a, b) => parseFloat(a.first) - parseFloat(b.first)).slice(0, 4).map(s => <li key={s.name}><b>{s.name}</b>, first used in <a href={lessonHref(s.first)}>{s.first}</a></li>)}</ul>
            <p><a href={href('hardware')}>Open the shopping list</a></p></> : <p>All Must-tier hardware is owned or on its way.</p>}
          {weak.length > 0 && <><h3>Weak areas</h3><ul className="plain">{weak.map(w => <li key={w.tag}><b>{w.tag}</b>: {w.wrong} wrong of {w.right + w.wrong}</li>)}</ul></>}
        </section>
      </div>
      <h2>Phases</h2>
      <div className="phaselist">
        {phases.map(p => { const f = phaseFraction(p, pr); return (
          <a key={p.id} className={'phaserow' + (p.id === 9 ? ' target' : '')} href={href('phase', String(p.id))}>
            <span className="pnum">{p.id}</span>
            <span className="ptitle">{p.title}<small>weeks {p.weeks}, {p.hours} h{p.id === 9 ? ', your main target' : ''}</small></span>
            <span className="pbar"><Bar value={f} /><small>{Math.round(f * 100)}%</small></span>
          </a>); })}
      </div>
      <section className="card"><h2>Activity</h2><Heatmap days={pr.days} /><p className="fine">{pr.days.length ? `${pr.days.length} active days. A day counts when you tick a lesson, a checklist item or a quiz answer.` : 'A square lights up on each day you tick a lesson, a checklist item or a quiz answer.'}</p></section>
      <h2>Checkpoints</h2>
      <div className="cols2">
        {checkpoints.map(c => { const ids = phases.filter(p => p.id <= c.afterPhase).flatMap(p => p.lessons.map(l => l.id)); const f = doneCount(ids, pr) / ids.length; return (
          <div className="card" key={c.id}><h3>{c.id}, week {c.week}</h3><p>{c.show}</p><Bar value={f} tone="copper" /></div>); })}
      </div>
    </>
  );
}
