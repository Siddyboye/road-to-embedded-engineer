import { useState } from 'react';
import { roadmap, type Box } from '../data/catalog';
import { lessonById } from '../data/syllabus';
import { lessonHref } from '../lib/router';
import { useProgress } from '../lib/store';
import { refState, refsToLessons, doneCount } from '../lib/progress';

const LEVEL = { req: 'Required', rec: 'Recommended', opt: 'Optional' } as const;

export function Roadmap() {
  const pr = useProgress();
  const [sel, setSel] = useState<Box | null>(null);
  const boxes = roadmap.flatMap(s => s.groups.flatMap(g => g.boxes));
  const count = (lv: string) => { const bs = boxes.filter(b => b.level === lv && b.refs.length); return `${bs.filter(b => refState(b.refs, pr) === 'done').length} / ${bs.length}`; };
  return (
    <>
      <h1>Roadmap</h1>
      <p className="lede">Every box from the embedded-engineering roadmap you attached, coloured by priority and filled in as you finish the lessons behind it. Select a box to see those lessons.</p>
      <div className="legend big">
        <span className="lv-req">Required, {count('req')} done</span><span className="lv-rec">Recommended, {count('rec')} done</span><span className="lv-opt">Optional, {count('opt')} done</span>
        <span className="st-done">finished</span><span className="st-part">in progress</span><span className="st-out">not in this course</span>
      </div>
      {sel && (
        <div className="card accent sticky" role="region" aria-live="polite">
          <button type="button" className="btn ghost right" onClick={() => setSel(null)}>Close</button>
          <h3>{sel.name} <small>{LEVEL[sel.level]}</small></h3>
          {sel.note && <p>{sel.note}.</p>}
          {sel.refs.length ? <ul className="plain">{refsToLessons(sel.refs).map(id => { const l = lessonById(id); return l ? <li key={id}><span className={'tick ' + (pr.lessons[id] ?? '')} aria-hidden="true" /> <a href={lessonHref(id)}>{id} {l.title}</a></li> : null; })}</ul>
            : <p>No lesson covers this. It is outside the course on purpose; add it later if a job you want asks for it.</p>}
        </div>
      )}
      {roadmap.map(sec => (
        <section key={sec.title} className={'rm-section rm-' + sec.tone}>
          <h2>{sec.title}</h2>
          <div className="rm-groups">
            {sec.groups.map(g => (
              <div className="rm-group" key={g.title}>
                <h3>{g.title}</h3>
                <div className="rm-boxes">
                  {g.boxes.map(bx => { const st = refState(bx.refs, pr); const ids = refsToLessons(bx.refs); return (
                    <button type="button" key={bx.name} className={`rm-box lv-${bx.level} st-${st}` + (sel === bx ? ' sel' : '')} onClick={() => setSel(bx)}
                      aria-label={`${bx.name}, ${LEVEL[bx.level]}, ${st === 'out' ? 'not in this course' : `${doneCount(ids, pr)} of ${ids.length} lessons done`}`}>
                      {bx.name}{st === 'done' && <i aria-hidden="true">✓</i>}{st === 'part' && <i aria-hidden="true">{doneCount(ids, pr)}/{ids.length}</i>}
                    </button>); })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      <p className="fine">Box names, grouping and the three priority levels follow the Embedded Systems Engineering Roadmap by Meysam Parvizi, revision v2.0.3 (github.com/m3y54m/Embedded-Engineering-Roadmap), licensed CC BY-SA 4.0. This page adapts it by mapping boxes to lessons and adding progress; the adaptation is shared under the same licence.</p>
    </>
  );
}
