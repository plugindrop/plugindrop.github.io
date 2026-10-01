import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blog = path.join(site, 'src/content/blog');
const redirects = JSON.parse(fs.readFileSync(path.join(site, 'src/data/expired_redirects.json'), 'utf8'));
const live = new Set();
for (const name of fs.readdirSync(blog)) {
  if (!/\.mdx?$/.test(name)) continue;
  const source = fs.readFileSync(path.join(blog, name), 'utf8');
  const fm = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fm && !/^draft:\s*true\s*$/m.test(fm[1])) live.add(name.replace(/\.mdx?$/, ''));
}
const shadows = Object.keys(redirects).filter(slug => live.has(slug));
const previous = Number(process.argv[2] || 0);
const decrease = previous - live.size;
const violations = [];
// shadowed redirects are skipped at build time by astro.config.mjs (staleRedirectSlugs); informational only
const warnings = shadows.length ? [`expired redirects shadow live articles (auto-skipped): ${shadows.join(', ')}`] : [];
if (previous > 0 && decrease >= 10 && decrease / previous >= 0.05) {
  violations.push(`published article count dropped ${previous} -> ${live.size}`);
}
console.log(JSON.stringify({ count: live.size, previous, violations, warnings }));
process.exitCode = violations.length ? 2 : 0;
