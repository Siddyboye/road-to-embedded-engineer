import { useMemo, useState } from 'react';
import { questions, type Question } from '../data/quiz';
import { phases } from '../data/syllabus';
import { href, lessonHref } from '../lib/router';
import { grade, useProgress, INTERVALS } from '../lib/store';
import { dueQuestions } from '../lib/progress';
import { parseNum } from '../lib/ui';
import { UartFrame } from '../widgets/timing';

const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

function Runner({ set, title }: { set: Question[]; title: string }) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number[]>([]);
  const [text, setText] = useState('');
  const [match, setMatch] = useState<Record<number, string>>({});
  const [result, setResult] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const q = set[i];
  const rights = useMemo(() => q?.pairs ? [...q.pairs.map(p => p[1])].sort((a, b) => hash(a + q.id) - hash(b + q.id)) : [], [q]);
  if (!q) return (
    <div className="card accent"><h2>{title}: finished</h2><p className="lede">{score} of {set.length} correct.</p>
      <p>Each question is now scheduled: right answers come back after {INTERVALS[1]}, {INTERVALS[2]}, {INTERVALS[3]} and {INTERVALS[4]} days, wrong ones tomorrow.</p>
      <p><a className="btn" href={href('quiz')}>Back to quizzes</a></p></div>
  );
  const finish = (ok: boolean) => { setResult(ok); if (ok) setScore(s => s + 1); grade(q.id, ok); };
  const check = () => {
    if (q.type === 'mcq') return finish(pick[0] === q.answer);
    if (q.type === 'multi') { const a = [...(q.answer as number[])].sort().join(), b = [...pick].sort().join(); return finish(a === b); }
    if (q.type === 'predict') return finish(norm(text) === norm(String(q.answer)));
    if (q.type === 'register' || q.type === 'timing') return finish(parseNum(text) === parseNum(String(q.answer)));
    if (q.type === 'match') return finish(!!q.pairs && q.pairs.every((p, k) => match[k] === p[1]));
  };
  const nextQ = () => { setI(i + 1); setPick([]); setText(''); setMatch({}); setResult(null); setRevealed(false); };
  const ready = q.type === 'mcq' || q.type === 'multi' ? pick.length > 0 : q.type === 'match' ? !!q.pairs && Object.keys(match).length === q.pairs.length : text.trim() !== '';
  return (
    <div className="card quiz">
      <p className="fine">{title}, question {i + 1} of {set.length}. Level {q.level}. {q.tags.join(', ')}</p>
      <h2>{q.prompt}</h2>
      {q.code && <pre><code>{q.code}</code></pre>}
      {q.type === 'timing' && q.byte !== undefined && <UartFrame byte={q.byte} />}
      {(q.type === 'mcq' || q.type === 'multi') && <div className="opts" role={q.type === 'mcq' ? 'radiogroup' : 'group'}>
        {q.options!.map((o, k) => { const on = pick.includes(k); const correct = q.type === 'mcq' ? k === q.answer : (q.answer as number[]).includes(k);
          return <button key={k} type="button" disabled={result !== null} role={q.type === 'mcq' ? 'radio' : 'checkbox'} aria-checked={on}
            className={'opt' + (on ? ' on' : '') + (result !== null && correct ? ' right' : '') + (result !== null && on && !correct ? ' wrong' : '')}
            onClick={() => setPick(q.type === 'mcq' ? [k] : on ? pick.filter(x => x !== k) : [...pick, k])}>{o}</button>; })}
      </div>}
      {(q.type === 'predict' || q.type === 'register' || q.type === 'timing') && <label className="field"><span>{q.type === 'predict' ? 'Output' : 'Value (hex, e.g. 0x1F)'}</span>
        <input className="mono" value={text} disabled={result !== null} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && ready && result === null) check(); }} /></label>}
      {q.type === 'match' && q.pairs && <div className="matchgrid">{q.pairs.map((p, k) => <label key={p[0]} className="field"><span>{p[0]}</span>
        <select value={match[k] ?? ''} disabled={result !== null} onChange={e => setMatch({ ...match, [k]: e.target.value })}><option value="">Choose…</option>{rights.map(r => <option key={r} value={r}>{r}</option>)}</select></label>)}</div>}
      {q.type === 'short' && <>
        <textarea rows={4} value={text} onChange={e => setText(e.target.value)} placeholder="Write your answer before revealing the model answer." disabled={result !== null} />
        {!revealed && <p><button type="button" className="btn" disabled={!ready} onClick={() => setRevealed(true)}>Show the model answer</button></p>}
        {revealed && <><p className="note"><b>Model answer.</b> {String(q.answer)}</p>
          {result === null && <p><button type="button" className="btn" onClick={() => finish(true)}>Mine covered it</button> <button type="button" className="btn ghost" onClick={() => finish(false)}>I missed the point</button></p>}</>}
      </>}
      {q.type !== 'short' && result === null && <p><button type="button" className="btn" disabled={!ready} onClick={check}>Check answer</button></p>}
      {result !== null && <>
        <p className={'note ' + (result ? 'ok' : 'warn')}><b>{result ? 'Correct.' : 'Not quite.'}</b> {q.type !== 'short' && !result && (q.type === 'predict' || q.type === 'register' || q.type === 'timing') ? `Answer: ${q.answer}. ` : ''}{q.explain} <a href={lessonHref(q.lesson)}>Lesson {q.lesson}</a></p>
        <p><button type="button" className="btn" onClick={nextQ}>{i + 1 < set.length ? 'Next question' : 'See the result'}</button></p>
      </>}
    </div>
  );
}

export function QuizPage({ arg }: { arg: string }) {
  const pr = useProgress();
  const due = dueQuestions(pr);
  const [frozen] = useState(due);
  if (arg === 'review') return frozen.length ? <><p className="crumb"><a href={href('quiz')}>Quizzes</a> / Review</p><Runner key="review" set={frozen} title="Review" /></> : <><h1>Review</h1><p>Nothing is due today. <a href={href('quiz')}>Back to quizzes</a>.</p></>;
  const m = /^p(\d+)$/.exec(arg);
  if (m) { const set = questions.filter(q => q.phase === Number(m[1])); return set.length ? <><p className="crumb"><a href={href('quiz')}>Quizzes</a> / Phase {m[1]}</p><Runner key={arg} set={set} title={`Phase ${m[1]} quiz`} /></> : <><h1>Phase {m[1]} quiz</h1><p>This quiz arrives with the phase’s content. <a href={href('quiz')}>Back to quizzes</a>.</p></>; }
  const seen = Object.keys(pr.leitner).length;
  return (
    <>
      <h1>Quizzes</h1>
      <p className="lede">Answer, get the explanation, and let the schedule bring each question back just before you would forget it.</p>
      <div className="cols2">
        <div className="card accent"><h2>Review</h2><p>{due.length ? `${due.length} questions are due today.` : seen ? 'Nothing due today.' : 'Take a phase quiz first; its questions then enter the review schedule.'}</p>{due.length > 0 && <p><a className="btn" href={href('quiz', 'review')}>Start review</a></p>}</div>
        <div className="card"><h2>Leitner boxes</h2><div className="boxes">{[1, 2, 3, 4, 5].map(b => <div key={b}><b>{Object.values(pr.leitner).filter(c => c.box === b).length}</b><small>box {b}, every {INTERVALS[b]} d</small></div>)}</div></div>
      </div>
      <h2>By phase</h2>
      <ul className="plain rows">{phases.map(p => { const n = questions.filter(q => q.phase === p.id).length; return <li key={p.id}><b>Phase {p.id}</b> {p.title} {n ? <a className="btn ghost" href={href('quiz', 'p' + p.id)}>{n} questions</a> : <span className="fine">arrives with the phase</span>}</li>; })}</ul>
      <p className="fine">{questions.length} questions so far. Types: multiple choice, multi-select, predict the output, fill in the value, matching, waveform decoding and written answers with a model answer.</p>
    </>
  );
}
