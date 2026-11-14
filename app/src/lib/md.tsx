// Markdown lesson renderer. Lesson files are plain Markdown plus two extensions:
//   ::widget <id>          embeds an interactive widget
//   ```expected            fenced block for "serial output you should see"
// Task-list items (- [ ]) become checkboxes saved in your progress.
import { useEffect, useMemo, useRef } from 'react';
import { marked } from 'marked';
import { widgetById } from '../widgets';
import { update, useProgress } from './store';

export function Markdown({ source, id }: { source: string; id: string }) {
  const parts = useMemo(() => source.split(/^::widget\s+([\w-]+)\s*$/m), [source]);
  const progress = useProgress();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current; if (!root) return;
    root.querySelectorAll('pre').forEach(pre => {
      const code = pre.querySelector('code');
      if (code?.classList.contains('language-expected')) pre.classList.add('expected');
      if (pre.querySelector('button.copy')) return;
      const btn = document.createElement('button');
      btn.className = 'copy'; btn.type = 'button'; btn.textContent = 'Copy';
      btn.onclick = () => { navigator.clipboard?.writeText(code?.textContent ?? '').then(() => { btn.textContent = 'Copied'; setTimeout(() => (btn.textContent = 'Copy'), 1200); }, () => { btn.textContent = 'Select and copy'; }); };
      pre.appendChild(btn);
    });
    root.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((box, i) => {
      const key = `${id}:${i}`;
      box.disabled = false; box.checked = !!progress.checks[key];
      box.onchange = () => update(d => { if (box.checked) d.checks[key] = true; else delete d.checks[key]; });
    });
  });

  return (
    <div className="md" ref={ref}>
      {parts.map((part, i) => {
        if (i % 2 === 1) { const w = widgetById(part); return w ? <div className="embed" key={i}><div className="embed-h">{w.title}</div><w.C /></div> : <p key={i} className="note warn">Unknown widget “{part}”.</p>; }
        return <div key={i} dangerouslySetInnerHTML={{ __html: marked.parse(part, { async: false }) as string }} />;
      })}
    </div>
  );
}
