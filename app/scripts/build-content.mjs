// Collects Markdown under /content into src/generated/content.json.
// Lesson files: content/phase<N>/<id>.md with front matter (id, title, status),
// or one file per phase holding many lessons separated by lines of the form:  === <id> | <optional status>
// Cheatsheets: content/cheatsheets/<slug>.md with front matter (title, order).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');

function parse(file) {
  const raw = readFileSync(file, 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  const meta = {};
  if (m) for (const line of m[1].split(/\r?\n/)) { const i = line.indexOf(':'); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  return { meta, body: m ? raw.slice(m[0].length) : raw };
}

// Compact section markers used in the per-phase files: a line "@why" becomes the full heading.
const SECTIONS = { why: 'Why this matters', need: 'Prerequisites, hardware, time', build: 'Build it first', how: 'How it works', deep: 'Go deeper', when: 'When to use it, when not to',
  break: 'Break it', check: 'Check yourself', stretch: 'Stretch goals', read: 'Reading', pit: 'Common mistakes and interview angles' };
const expand = body => body.replace(/^@(\w+)[ \t]*$/gm, (line, key) => (SECTIONS[key] ? '## ' + SECTIONS[key] : line));

const lessons = {}, sheets = [];
for (const dir of readdirSync(contentDir)) {
  const full = join(contentDir, dir);
  if (!statSync(full).isDirectory()) continue;
  for (const f of readdirSync(full).filter(x => x.endsWith('.md'))) {
    const { meta, body } = parse(join(full, f));
    if (dir === 'cheatsheets') sheets.push({ slug: basename(f, '.md'), title: meta.title ?? basename(f, '.md'), order: Number(meta.order ?? 99), body });
    else if (/^=== /m.test(body)) {
      // A phase file holding several lessons, each introduced by a line:  === <id> | <optional status>
      for (const chunk of body.split(/^(?==== )/m)) {
        const head = /^=== (\S+)(?:\s*\|\s*(.*))?\r?\n/.exec(chunk);
        if (head) lessons[head[1]] = { status: head[2]?.trim() || undefined, body: expand(chunk.slice(head[0].length)) };
      }
    }
    else lessons[meta.id ?? basename(f, '.md')] = { title: meta.title, status: meta.status, body };
  }
}
sheets.sort((a, b) => a.order - b.order);

// Every "::widget <id>" in the content must exist in the widget registry. A mismatch almost always
// means src/ and content/ come from different versions of the course.
const registry = readFileSync(join(root, 'src', 'widgets', 'index.ts'), 'utf8');
const known = new Set([...registry.matchAll(/\{ id: '([\w-]+)'/g)].map(m => m[1]));
const missing = new Set();
for (const text of [...Object.values(lessons).map(l => l.body), ...sheets.map(s => s.body)]) for (const m of text.matchAll(/^::widget\s+([\w-]+)\s*$/gm)) if (!known.has(m[1])) missing.add(m[1]);
if (missing.size) {
  console.error(`\ncontent uses widgets that src/widgets/index.ts does not define: ${[...missing].join(', ')}\n` +
    'Your app/src folder is older than your app/content folder. Replace the whole app/ folder from the latest zip (do not merge), then run again.\n');
  process.exit(1);
}
mkdirSync(join(root, 'src', 'generated'), { recursive: true });
writeFileSync(join(root, 'src', 'generated', 'content.json'), JSON.stringify({ lessons, sheets }, null, 1));
console.log(`content: ${Object.keys(lessons).length} lesson(s), ${sheets.length} cheatsheet(s)`);
