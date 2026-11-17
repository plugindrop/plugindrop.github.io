// Guard: published articles must not repeat an H2 heading, must not append the legacy body again
// (repeated long paragraphs), and must not contain leaked generator instructions.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(fileURLToPath(new URL('../', import.meta.url)), 'src', 'content', 'blog');
const LEAKS = [/Rewriting only the .{0,40} section/i, /plain, declarative English/i, /no invented quotes or ratings/i];
const MAX_REPEATED_PARAGRAPHS = 3;
let failed = 0;
for (const file of fs.readdirSync(dir).filter((f) => /\.mdx?$/.test(f))) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n');
  const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
  if (/^draft:\s*true/m.test(front) || /^noindex:\s*true/m.test(front)) continue;
  const seen = new Map();
  for (const m of text.matchAll(/^## (.+?)\s*$/gm)) seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
  for (const [heading, n] of seen) if (n > 1) { console.error(`FAIL: ${file}: H2 "${heading}" appears ${n} times`); failed++; }
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
  const paras = new Map();
  for (const raw of body.split('\n\n')) {
    const p = raw.trim().replace(/\s+/g, ' ');
    if (p.length >= 120 && !/^(\[|<|\||- \[)/.test(p)) paras.set(p, (paras.get(p) ?? 0) + 1);
  }
  const repeated = [...paras.values()].reduce((a, n) => a + (n > 1 ? n - 1 : 0), 0);
  if (repeated > MAX_REPEATED_PARAGRAPHS) { console.error(`FAIL: ${file}: ${repeated} repeated long paragraphs (legacy body appended again?)`); failed++; }
  for (const re of LEAKS) if (re.test(text)) { console.error(`FAIL: ${file}: leaked generator instruction (${re})`); failed++; }
}
if (failed) process.exit(1);
console.log('PASS: no duplicate H2 headings, repeated body blocks or leaked instructions in published articles.');
