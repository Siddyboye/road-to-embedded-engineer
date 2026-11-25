// Checks the pure logic behind the widgets against known answers. Run: npm run selftest
import { CRCS, crc } from '../src/widgets/numbers';
import { simulate } from '../src/widgets/system';
import { quantParams, fftMag, metrics } from '../src/widgets/ml';
import { decodeUart, uartDiagram, i2cDiagram, spiDiagram } from '../src/widgets/timing';
import { bounceWave, debounce, aliasOf } from '../src/widgets/signals';
import { floatBits, bitsFloat, jitterModel } from '../src/widgets/machine';
import { widgets } from '../src/widgets';
import { layout, arbitrate, baudSample, pidRun } from '../src/widgets/extra';
import { allLessons, phases, totalHours } from '../src/data/syllabus';
import content from '../src/generated/content.json';
import { roadmap, shopping, projects, jobSkills } from '../src/data/catalog';
import { questions } from '../src/data/quiz';
import { refsToLessons } from '../src/lib/progress';

let failed = 0;
const ok = (name: string, cond: boolean, detail = '') => { if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`); };
const hexs = (n: number) => '0x' + n.toString(16).toUpperCase();

// CRC catalogue check values for the ASCII string "123456789"
const check = Array.from('123456789').map(c => c.charCodeAt(0));
const want: Record<string, number> = { 'CRC-8': 0xf4, 'CRC-8/MAXIM': 0xa1, 'CRC-16/CCITT-FALSE': 0x29b1, 'CRC-16/XMODEM': 0x31c3, 'CRC-16/MODBUS': 0x4b37, 'CRC-32': 0xcbf43926 };
for (const p of CRCS) ok(`crc ${p.name}`, crc(check, p) === want[p.name], hexs(crc(check, p)));

// UART: encode then decode every byte
let uartOk = true;
for (let b = 0; b < 256; b++) { const d = decodeUart(uartDiagram(b, 'none', 1).rows[0].levels); if (!d || d.byte !== b || !d.ok) uartOk = false; }
ok('uart round trip, all 256 bytes', uartOk);
ok('uart even parity bit for 0x53', uartDiagram(0x53, 'even', 1).rows[0].levels[11] === 0);
// I2C: first byte on SDA, sampled while SCL is high
{ const d = i2cDiagram(0x68, false, 0x75, true, true); const scl = d.rows[0].levels, sda = d.rows[1].levels; const bits: number[] = [];
  for (let i = 3; i < scl.length; i++) if (scl[i] === 1 && scl[i - 1] === 0) bits.push(sda[i]);
  const first = bits.slice(0, 8).reduce((a, b) => (a << 1) | b, 0), second = bits.slice(9, 17).reduce((a, b) => (a << 1) | b, 0);
  ok('i2c address byte 0x68 write = 0xD0', first === 0xd0, hexs(first)); ok('i2c ack is low', bits[8] === 0); ok('i2c data byte', second === 0x75, hexs(second)); }
// SPI: sample MOSI at the marked edges in every mode
for (let mode = 0; mode < 4; mode++) { const d = spiDiagram(mode, 0xa7, 0x3c); let v = 0, m = 0;
  d.dots.filter(p => p.row === 2).forEach(p => { v = (v << 1) | d.rows[2].levels[Math.floor(p.x - 0.01)]; }); d.dots.filter(p => p.row === 3).forEach(p => { m = (m << 1) | d.rows[3].levels[Math.floor(p.x - 0.01)]; });
  ok(`spi mode ${mode} samples MOSI and MISO correctly`, v === 0xa7 && m === 0x3c, `${hexs(v)} ${hexs(m)}`); }

// Scheduler: priority inversion with and without inheritance
const inv = [
  { name: 'H', prio: 3, start: 2, script: [['run', 1], ['lock'], ['run', 2], ['unlock'], ['run', 1]] },
  { name: 'M', prio: 2, start: 3, script: [['run', 6]] },
  { name: 'L', prio: 1, start: 0, script: [['run', 1], ['lock'], ['run', 4], ['unlock'], ['run', 1]] },
] as Parameters<typeof simulate>[0];
const plain = simulate(inv, 18, false), inh = simulate(inv, 18, true);
ok('inversion: High finishes late without inheritance', plain.finish[0] === 15, String(plain.finish[0]));
ok('inversion: High finishes early with inheritance', inh.finish[0] === 9, String(inh.finish[0]));
ok('inversion: all three tasks finish either way', plain.finish.every(f => f !== null) && inh.finish.every(f => f !== null));

// Quantization: int8 over [-1.5, 2.5]
{ const p = quantParams(-1.5, 2.5, 8); ok('quant zero-point', p.zero === -32, String(p.zero)); ok('quant ends map to int8 limits', p.q(-1.5) === -128 && p.q(2.5) === 127); ok('quant 0.0 is exact', p.dq(p.q(0)) === 0); }
// FFT: a pure tone on bin 16 has unit amplitude there
{ const N = 256, mag = fftMag(Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * 16 * i / N))); ok('fft peak bin and amplitude', Math.abs(mag[16] - 1) < 1e-9 && mag[15] < 1e-9, mag[16].toFixed(6)); }
{ const m = metrics(80, 20, 20, 880); ok('metrics', Math.abs(m.precision - 0.8) < 1e-12 && Math.abs(m.recall - 0.8) < 1e-12 && Math.abs(m.accuracy - 0.96) < 1e-12); }

// Phase 0 labs
{ const raw = bounceWave(7, 3), falls = (lv: number[]) => lv.reduce((n, v, i) => n + (i > 0 && v === 0 && lv[i - 1] === 1 ? 1 : 0), 0);
  ok('bounce: raw signal has several falling edges', falls(raw) > 1, String(falls(raw))); ok('bounce: 5 ms window leaves exactly one press', falls(debounce(raw, 5)) === 1); ok('bounce: zero window changes nothing', falls(debounce(raw, 0)) === falls(raw)); }
ok('alias: 3 kHz sampled at 4 kHz looks like 1 kHz', Math.abs(aliasOf(3000, 4000)) === 1000); ok('alias: 70 Hz at 100 Hz looks like 30 Hz', Math.abs(aliasOf(70, 100)) === 30); ok('alias: below Nyquist is unchanged', aliasOf(12, 80) === 12);
ok('float: 1.0 is 0x3F800000', floatBits(1) === 0x3f800000); ok('float: 0.1 is 0x3DCCCCCD', floatBits(0.1) === 0x3dcccccd); ok('float: bits round trip', bitsFloat(0x40490fdb).toFixed(5) === '3.14159');
{ const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  ok('jitter: vTaskDelay(5 ms) at a 10 ms tick returns at once', mean(jitterModel('delay', 5, false)) < 100); ok('jitter: vTaskDelay(25 ms) gives 20 ms', Math.abs(mean(jitterModel('delay', 25, false)) - 20000) < 50); ok('jitter: timer is tight', Math.abs(mean(jitterModel('timer', 5, true)) - 5000) < 1); }

// Labs for the later phases
{ const f = (t: string, n: string) => ({ type: t, name: n }), a = [f('char', 'a'), f('int', 'b'), f('char', 'c'), f('double', 'd'), f('short', 'e')];
  ok('struct: char,int,char,double,short is 32 bytes', layout(a).size === 32, String(layout(a).size)); ok('struct: largest first is 16 bytes', layout([a[3], a[1], a[4], a[0], a[2]]).size === 16); }
ok('can: lowest identifier wins', arbitrate([0x123, 0x12a, 0x0f0]).winner === 2); ok('can: loser backs off at the first differing bit', arbitrate([0x123, 0x12a]).lostAt[1] === 7);
ok('baud: no mismatch receives the byte', baudSample(0x55, 0).rx === 0x55 && !baudSample(0x55, 0).framing); ok('baud: 2% is still fine', baudSample(0xa7, 2).rx === 0xa7); ok('baud: 7% corrupts 0x55', baudSample(0x55, 7).rx !== 0x55 || baudSample(0x55, 7).framing);
ok('pid: proportional only leaves a third of the error', Math.abs(pidRun(2, 0, 0).final - 2 / 3) < 0.01, pidRun(2, 0, 0).final.toFixed(3)); ok('pid: integral removes it', Math.abs(pidRun(2, 10, 0).final - 1) < 0.02);

// Data integrity: every reference points at a real lesson
const ids = new Set(allLessons.map(l => l.id));
ok('lesson ids are unique', ids.size === allLessons.length, `${allLessons.length} lessons`);
ok('course is 668 hours in 11 phases', totalHours === 668 && phases.length === 11, String(totalHours));
const refs = [...roadmap.flatMap(s => s.groups.flatMap(g => g.boxes.flatMap(b => refsToLessons(b.refs)))), ...jobSkills.flatMap(j => refsToLessons(j.refs)), ...shopping.map(s => s.first), ...questions.map(q => q.lesson)];
const bad = refs.filter(r => !ids.has(r));
ok('roadmap, jobs, shopping and quiz refs resolve', bad.length === 0, bad.join(' '));
ok('every lesson has written content', allLessons.every(l => l.id in (content.lessons as Record<string, unknown>)), `${Object.keys(content.lessons).length} of ${allLessons.length}`);
ok('22 projects', projects.length === 22, String(projects.length));
ok('widget lesson refs resolve', widgets.every(w => w.lessons.every(l => ids.has(l))));
{ const pn = (t: string) => { const x = t.trim().toLowerCase(); return /^0x[0-9a-f]+$/.test(x) ? parseInt(x.slice(2), 16) : /^-?\d+(\.\d+)?$/.test(x) ? Number(x) : NaN; };
  const badQ = questions.filter(q => q.type === 'mcq' ? !(q.options && typeof q.answer === 'number' && q.answer >= 0 && q.answer < q.options.length)
    : q.type === 'multi' ? !(q.options && Array.isArray(q.answer) && q.answer.length > 0 && q.answer.every(a => a >= 0 && a < q.options!.length))
    : q.type === 'register' || q.type === 'timing' ? Number.isNaN(pn(String(q.answer))) || (q.type === 'timing' && pn(String(q.answer)) !== q.byte)
    : q.type === 'match' ? !(q.pairs && q.pairs.length > 1) : String(q.answer).trim() === '');
  ok('every quiz answer key is well formed', badQ.length === 0, badQ.map(q => q.id).join(' '));
  ok('every phase has a quiz', phases.every(p => questions.some(q => q.phase === p.id)), `${questions.length} questions`); }
ok('quiz ids unique', new Set(questions.map(q => q.id)).size === questions.length);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
