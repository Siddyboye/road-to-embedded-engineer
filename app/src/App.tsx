import { useEffect, useMemo, useRef, useState } from 'react';
import { useRoute, href, argToLesson } from './lib/router';
import { update, useProgress } from './lib/store';
import { dueQuestions } from './lib/progress';
import { allLessons, phases } from './data/syllabus';
import { glossary } from './data/catalog';
import { widgets } from './widgets';
import { lessonHref } from './lib/router';
import { Dashboard } from './pages/Dashboard';
import { Roadmap } from './pages/Roadmap';
import { PhasePage, LessonPage } from './pages/Learn';
import { QuizPage } from './pages/Quiz';
import { Hardware, Reading, Jobs, Glossary, Cheatsheets, Projects, Interview, WidgetsPage, Settings } from './pages/Reference';

const NAV: [string, string][][] = [
  [['dashboard', 'Dashboard'], ['roadmap', 'Roadmap'], ['phase-0', 'Phases'], ['quiz', 'Quizzes'], ['projects', 'Projects']],
  [['widgets', 'Tools'], ['sheets', 'Cheatsheets'], ['glossary', 'Glossary']],
  [['hardware', 'Hardware'], ['reading', 'Reading'], ['jobs', 'Job market'], ['interview', 'Interview prep']],
  [['settings', 'Your data']],
];

type Hit = { kind: string; label: string; to: string };
const INDEX: Hit[] = [
  ...NAV.flat().map(([key, label]) => ({ kind: 'page', label, to: '#' + key })),
  ...phases.map(p => ({ kind: 'phase ' + p.id, label: p.title, to: href('phase', String(p.id)) })),
  ...allLessons.map(l => ({ kind: l.id, label: l.title, to: lessonHref(l.id) })),
  ...widgets.map(w => ({ kind: 'tool', label: w.title + ': ' + w.blurb, to: href('widget', w.id) })),
  ...glossary.map(([t]) => ({ kind: 'term', label: t, to: href('glossary') })),
];

/** Command palette: Ctrl or Cmd + K, or "/", from anywhere. */
function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => { const words = q.toLowerCase().split(/\s+/).filter(Boolean); return INDEX.filter(h => words.every(w => (h.kind + ' ' + h.label).toLowerCase().includes(w))).slice(0, 40); }, [q]);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { setSel(0); }, [q]);
  const go = (h?: Hit) => { if (h) { location.hash = h.to; onClose(); } };
  return (
    <div className="kbar-back" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="kbar" role="dialog" aria-label="Jump to a lesson, page or tool">
        <input ref={input} value={q} placeholder="Jump to a lesson, tool, page or term…" aria-label="Search" onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(hits.length - 1, s + 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); } else if (e.key === 'Enter') go(hits[sel]); else if (e.key === 'Escape') onClose(); }} />
        <ul role="listbox">{hits.map((h, i) => <li key={h.kind + h.label} role="option" aria-selected={i === sel} className={i === sel ? 'on' : ''} onMouseEnter={() => setSel(i)} onClick={() => go(h)}><small>{h.kind}</small><span>{h.label}</span></li>)}
          {hits.length === 0 && <li><span>Nothing matches “{q}”.</span></li>}</ul>
        <p className="fine"><kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open, <kbd>Esc</kbd> to close</p>
      </div>
    </div>
  );
}

export function App() {
  const { page, arg } = useRoute();
  const pr = useProgress();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const due = dueQuestions(pr).length;
  useEffect(() => { setOpen(false); }, [page, arg]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', pr.theme ?? 'dark'); }, [pr.theme]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? '');
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { e.preventDefault(); setPalette(p => !p); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
  const active = (key: string) => { const base = key.split('-')[0]; return base === page || (base === 'phase' && page === 'lesson') || (base === 'widgets' && page === 'widget'); };
  const toggleTheme = () => update(d => { d.theme = (d.theme ?? 'dark') === 'dark' ? 'light' : 'dark'; }, false);
  let view;
  switch (page) {
    case 'dashboard': view = <Dashboard />; break;
    case 'roadmap': view = <Roadmap />; break;
    case 'phase': view = <PhasePage arg={arg || '0'} />; break;
    case 'lesson': view = <LessonPage id={argToLesson(arg)} />; break;
    case 'quiz': view = <QuizPage key={arg} arg={arg} />; break;
    case 'projects': view = <Projects />; break;
    case 'widgets': view = <WidgetsPage arg="" />; break;
    case 'widget': view = <WidgetsPage arg={arg} />; break;
    case 'sheets': view = <Cheatsheets arg={arg} />; break;
    case 'glossary': view = <Glossary />; break;
    case 'hardware': view = <Hardware />; break;
    case 'reading': view = <Reading />; break;
    case 'jobs': view = <Jobs />; break;
    case 'interview': view = <Interview />; break;
    case 'settings': view = <Settings />; break;
    default: view = <><h1>Page not found</h1><p>There is nothing at “{page}”. <a href={href('dashboard')}>Go to the dashboard</a>.</p></>;
  }
  return (
    <div className="shell">
      <a className="skip" href={location.hash || '#dashboard'} onClick={e => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <header className="topbar">
        <button type="button" className="menu" aria-expanded={open} aria-controls="nav" onClick={() => setOpen(o => !o)}>Menu</button>
        <a className="brand" href={href('dashboard')}>Embedded, by building</a>
        <button type="button" className="kbtn" onClick={() => setPalette(true)}><span>Jump to…</span><kbd>Ctrl K</kbd></button>
        <button type="button" className="btn ghost" onClick={toggleTheme}>{(pr.theme ?? 'dark') === 'dark' ? 'Light' : 'Dark'}</button>
      </header>
      <nav id="nav" className={open ? 'open' : ''} aria-label="Sections">
        {NAV.map((group, i) => <ul key={i}>{group.map(([key, label]) => <li key={key}><a href={'#' + key} className={active(key) ? 'on' : ''} aria-current={active(key) ? 'page' : undefined}>{label}{key === 'quiz' && due > 0 && <span className="badge">{due}</span>}</a></li>)}</ul>)}
      </nav>
      <main id="main" tabIndex={-1} key={page + ':' + arg}>{view}</main>
      {palette && <Palette onClose={() => setPalette(false)} />}
    </div>
  );
}
