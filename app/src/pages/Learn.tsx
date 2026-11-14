import { phases, allLessons, lessonById, phaseOfLesson } from '../data/syllabus';
import { phaseHasQuiz } from '../data/quiz';
import { widgets } from '../widgets';
import content from '../generated/content.json';
import { href, lessonHref } from '../lib/router';
import { update, useProgress } from '../lib/store';
import { references } from '../data/refs';
import { phaseFraction } from '../lib/progress';
import { Markdown } from '../lib/md';
import { Bar } from '../lib/ui';

const lessonsContent = content.lessons as Record<string, { title?: string; status?: string; body: string }>;
const BOARD: Record<string, string> = { S3: 'ESP32-S3', CAM: 'ESP32-CAM', VE: 'DevKitC-VE', both: 'any ESP32 board', new: 'needs new hardware', host: 'your computer' };
export const Boards = ({ boards }: { boards: string }) => <>{boards.split(',').map(b => b.trim()).map(b => <span key={b} className={'chip b-' + b}>{BOARD[b] ?? b}</span>)}</>;
const TEMPLATE = ['Why this matters', 'Prerequisites, hardware, time', 'Build it first', 'How it works', 'Go deeper', 'When to use it, when not to', 'Break it', 'Check yourself', 'Stretch goals', 'Reading', 'Common mistakes and interview angles'];

export function PhasePage({ arg }: { arg: string }) {
  const pr = useProgress();
  const p = phases.find(x => String(x.id) === arg);
  if (!p) return <><h1>Phases</h1><p>No such phase. <a href={href('dashboard')}>Back to the dashboard</a>.</p></>;
  const f = phaseFraction(p, pr);
  return (
    <>
      <p className="crumb"><a href={href('dashboard')}>Dashboard</a> / Phase {p.id}</p>
      <h1>Phase {p.id}: {p.title}</h1>
      <p className="lede">{p.goal}</p>
      <div className="phasemeta"><span>Weeks {p.weeks}</span><span>{p.hours} hours</span><span>{p.lessons.length} lessons</span><span className="grow"><Bar value={f} /></span><span>{Math.round(f * 100)}%</span></div>
      <ol className="lessons">
        {p.lessons.map(l => (
          <li key={l.id} className={pr.lessons[l.id] ?? ''}>
            <span className={'tick ' + (pr.lessons[l.id] ?? '')} aria-label={pr.lessons[l.id] ?? 'not started'} />
            <a href={lessonHref(l.id)}><b>{l.id}</b> {l.title}</a>
            <span className="lbuild">{l.build}</span>
            <span className="lmeta"><Boards boards={l.boards} />{lessonsContent[l.id] ? <span className="chip ready">written</span> : null}</span>
          </li>
        ))}
      </ol>
      <div className="cols2">
        {p.projects && <div className="card"><h3>Mini-projects</h3><p>{p.projects}</p></div>}
        <div className="card"><h3>Capstone</h3><p>{p.capstone}</p></div>
      </div>
      <p>{phaseHasQuiz(p.id) ? <a className="btn" href={href('quiz', 'p' + p.id)}>Take the Phase {p.id} quiz</a> : <span className="fine">The quiz for this phase arrives with its content.</span>}
        {p.id > 0 && <> <a className="btn ghost" href={href('phase', String(p.id - 1))}>Previous phase</a></>}{p.id < 10 && <> <a className="btn ghost" href={href('phase', String(p.id + 1))}>Next phase</a></>}</p>
    </>
  );
}

export function LessonPage({ id }: { id: string }) {
  const pr = useProgress();
  const l = lessonById(id), p = phaseOfLesson(id);
  if (!l || !p) return <><h1>Lesson not found</h1><p><a href={href('dashboard')}>Back to the dashboard</a>.</p></>;
  const i = allLessons.indexOf(l), prev = allLessons[i - 1], next = allLessons[i + 1];
  const body = lessonsContent[id];
  const related = widgets.filter(w => w.lessons.includes(id));
  const state = pr.lessons[id];
  const set = (s: 'started' | 'done' | undefined) => update(d => { if (s) d.lessons[id] = s; else delete d.lessons[id]; });
  return (
    <article>
      <p className="crumb"><a href={href('dashboard')}>Dashboard</a> / <a href={href('phase', String(p.id))}>Phase {p.id}</a> / {l.id}</p>
      <h1><span className="lid">{l.id}</span> {body?.title ?? l.title}</h1>
      <p className="lmeta"><Boards boards={l.boards} />{body?.status && <span className="chip warn">{body.status}</span>}</p>
      <div className="card accent"><b>Build first.</b> {l.build}.</div>
      {body ? <Markdown source={body.body} id={id} /> : (
        <div className="card">
          <h3>This lesson is not written yet</h3>
          <p>Content is generated phase by phase and verified before it lands here. When it does, it follows this template:</p>
          <ol className="template">{TEMPLATE.map(t => <li key={t}>{t}</li>)}</ol>
        </div>
      )}
      {related.length > 0 && <div className="card"><h3>Tools for this lesson</h3><ul className="plain">{related.map(w => <li key={w.id}><a href={href('widget', w.id)}>{w.title}</a>: {w.blurb}</li>)}</ul></div>}
      {references[id] && (
        <section className="card refcard">
          <h3>Reference solution</h3>
          {pr.checks['ref:' + id] ? (
            <><p className="fine">In the repository. Compare it with yours; do not copy it. It has not been compiled unless <code>firmware/README.md</code> says so.</p>
              <ul>{references[id].map(r => <li key={r}><code>{r}</code></li>)}</ul></>
          ) : (
            <><p className="fine">Write your own first. The reference stays closed until you say you have tried.</p>
              <button type="button" className="btn ghost" onClick={() => update(d => { d.checks['ref:' + id] = true; })}>I have attempted it: show where it is</button></>
          )}
        </section>
      )}
      <div className="lessonbar">
        {state !== 'done' ? <button type="button" className="btn" onClick={() => set('done')}>Mark lesson done</button> : <button type="button" className="btn ghost" onClick={() => set(undefined)}>Done. Undo</button>}
        {!state && <button type="button" className="btn ghost" onClick={() => set('started')}>Mark as started</button>}
        <span className="grow" />
        {prev && <a className="btn ghost" href={lessonHref(prev.id)}>Back: {prev.id}</a>}
        {next && <a className="btn ghost" href={lessonHref(next.id)}>Next: {next.id}</a>}
      </div>
    </article>
  );
}
