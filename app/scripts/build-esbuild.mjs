// Fallback build that needs only esbuild (no Vite). Writes dist-esbuild/index.html.
//   node scripts/build-esbuild.mjs            two files: index.html + assets
//   node scripts/build-esbuild.mjs --single   one self-contained index.html
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const single = process.argv.includes('--single');
const out = join(root, 'dist-esbuild');

execFileSync(process.execPath, [join(root, 'scripts', 'build-content.mjs')], { stdio: 'inherit' });
const result = await esbuild.build({
  entryPoints: [join(root, 'src', 'main.tsx')], bundle: true, minify: true, format: 'iife', target: 'es2020',
  jsx: 'automatic', loader: { '.json': 'json' }, define: { 'process.env.NODE_ENV': '"production"' },
  outdir: join(out, 'assets'), entryNames: 'app', write: false, logLevel: 'info',
  nodePaths: (process.env.NODE_PATH ?? '').split(':').filter(Boolean),
});
const js = result.outputFiles.find(f => f.path.endsWith('.js')).text;
const css = result.outputFiles.find(f => f.path.endsWith('.css')).text;
const shell = readFileSync(join(root, 'index.html'), 'utf8');
mkdirSync(join(out, 'assets'), { recursive: true });
let html;
if (single) {
  html = shell.replace('</head>', () => `<style>${css}</style></head>`)
    .replace(/<script type="module"[^>]*><\/script>/, () => `<script>${js.replace(/<\/script/g, '<\\/script')}</script>`);
} else {
  writeFileSync(join(out, 'assets', 'app.js'), js); writeFileSync(join(out, 'assets', 'app.css'), css);
  html = shell.replace('</head>', '<link rel="stylesheet" href="./assets/app.css"></head>').replace(/<script type="module"[^>]*><\/script>/, '<script src="./assets/app.js"></script>');
}
writeFileSync(join(out, 'index.html'), html);
console.log(`built ${single ? 'single-file ' : ''}dist-esbuild/index.html (${(html.length / 1024).toFixed(0)} KB html, ${(js.length / 1024).toFixed(0)} KB js)`);
