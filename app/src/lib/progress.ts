import { phases, allLessons, type Phase } from '../data/syllabus';
import { questions } from '../data/quiz';
import { isoDay, type Progress } from './store';

/** Expand refs such as '1.8' or 'P4' (a whole phase) into lesson ids. */
export function refsToLessons(refs: string[]): string[] {
  return refs.flatMap(r => /^P\d+$/.test(r) ? (phases.find(p => p.id === Number(r.slice(1)))?.lessons.map(l => l.id) ?? []) : [r]);
}
export const doneCount = (ids: string[], pr: Progress) => ids.filter(id => pr.lessons[id] === 'done').length;
export const phaseFraction = (p: Phase, pr: Progress) => doneCount(p.lessons.map(l => l.id), pr) / p.lessons.length;
export const nextLesson = (pr: Progress) => allLessons.find(l => pr.lessons[l.id] !== 'done');
export const hoursDone = (pr: Progress) => phases.reduce((s, p) => s + p.hours * phaseFraction(p, pr), 0);
export function refState(refs: string[], pr: Progress): 'none' | 'part' | 'done' | 'out' {
  const ids = refsToLessons(refs); if (!ids.length) return 'out';
  const n = doneCount(ids, pr); return n === 0 ? 'none' : n === ids.length ? 'done' : 'part';
}
export const dueQuestions = (pr: Progress) => questions.filter(q => { const c = pr.leitner[q.id]; return c && c.due <= isoDay(); });
export function weakTags(pr: Progress): { tag: string; right: number; wrong: number }[] {
  const m = new Map<string, { right: number; wrong: number }>();
  questions.forEach(q => { const c = pr.leitner[q.id]; if (!c) return; q.tags.forEach(t => { const e = m.get(t) ?? { right: 0, wrong: 0 }; e.right += c.right; e.wrong += c.wrong; m.set(t, e); }); });
  return [...m.entries()].map(([tag, e]) => ({ tag, ...e })).filter(e => e.wrong > 0).sort((a, b) => b.wrong / (b.right + b.wrong) - a.wrong / (a.right + a.wrong));
}
