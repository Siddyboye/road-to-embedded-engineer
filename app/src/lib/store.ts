// Local-first progress store. Everything lives in localStorage under one key,
// with export and import so you can move it between machines.
import { useSyncExternalStore } from 'react';

export type Card = { box: number; due: string; right: number; wrong: number };
export type Progress = {
  lessons: Record<string, 'started' | 'done'>;
  checks: Record<string, boolean>;
  hardware: Record<string, 'owned' | 'ordered'>;
  books: Record<string, number>;
  leitner: Record<string, Card>;
  days: string[];
  jobs: { title: string; url: string; note: string }[];
  theme?: 'light' | 'dark';
};

const KEY = 'ebb-progress-v1';
const empty = (): Progress => ({ lessons: {}, checks: {}, hardware: {}, books: {}, leitner: {}, days: [], jobs: [] });
const pad = (n: number) => String(n).padStart(2, '0');
export const isoDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDay(d); };

function load(): Progress {
  try { const raw = localStorage.getItem(KEY); if (raw) return { ...empty(), ...JSON.parse(raw) }; } catch { /* storage unavailable */ }
  return empty();
}
let state: Progress = load();
const subs = new Set<() => void>();
function commit(next: Progress) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* keep in memory only */ }
  subs.forEach(f => f());
}

export function update(fn: (draft: Progress) => void, activity = true) {
  const draft: Progress = JSON.parse(JSON.stringify(state));
  fn(draft);
  if (activity && !draft.days.includes(isoDay())) draft.days.push(isoDay());
  commit(draft);
}
export const useProgress = (): Progress => useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => state);
export const getProgress = () => state;
export const exportJSON = () => JSON.stringify(state, null, 2);
export function importJSON(text: string): string | null {
  try { const obj = JSON.parse(text); if (typeof obj !== 'object' || !obj) return 'Not a progress file.'; commit({ ...empty(), ...obj }); return null; }
  catch { return 'That is not valid JSON.'; }
}
export const resetAll = () => commit(empty());

export function streak(days: string[]): number {
  const set = new Set(days); let d = isoDay(); if (!set.has(d)) d = addDays(d, -1);
  let n = 0; while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

// Leitner boxes: a right answer moves the card up a box, a wrong one sends it back to box 1.
export const INTERVALS = [0, 1, 3, 7, 14, 30];
export function grade(qid: string, correct: boolean) {
  update(d => {
    const c = d.leitner[qid] ?? { box: 0, due: isoDay(), right: 0, wrong: 0 };
    c.box = correct ? Math.min(5, c.box + 1) : 1;
    if (correct) c.right++; else c.wrong++;
    c.due = addDays(isoDay(), INTERVALS[c.box]);
    d.leitner[qid] = c;
  });
}
