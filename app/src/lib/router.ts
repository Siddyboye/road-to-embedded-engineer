// Hash router with plain names only (letters, digits, hyphens), e.g. #lesson-0-1, #phase-3, #widget-crc.
import { useEffect, useState } from 'react';
export type Route = { page: string; arg: string };
export function parse(hash: string): Route {
  const h = hash.replace(/^#/, '');
  if (!h) return { page: 'dashboard', arg: '' };
  const i = h.indexOf('-');
  return i < 0 ? { page: h, arg: '' } : { page: h.slice(0, i), arg: h.slice(i + 1) };
}
export const href = (page: string, arg = '') => '#' + page + (arg !== '' ? '-' + String(arg).replace(/\./g, '-') : '');
export const lessonHref = (id: string) => href('lesson', id);
export const argToLesson = (arg: string) => arg.replace(/-/g, '.');
export function useRoute(): Route {
  const [r, setR] = useState<Route>(() => parse(location.hash));
  useEffect(() => {
    const on = () => { setR(parse(location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}
