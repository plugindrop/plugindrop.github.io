// Guard: a deal card's body must never send the reader straight to the store (AdSense: no outbound-only cards).
// Only the explicit "Get it for $X" button (.card-cta) may point at the affiliate URL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.join(fileURLToPath(new URL('../', import.meta.url)), 'dist');
if (!fs.existsSync(dist)) { console.error('FAIL: dist missing. Run npm run build first.'); process.exit(1); }
const MAX_PER_SITE = 2; // content-less products without any own page/post may still fall back to the store
const hits = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'index.html') {
      const html = fs.readFileSync(p, 'utf8');
      if (/<meta name="robots" content="noindex/.test(html)) continue;
      for (const m of html.matchAll(/<a\b[^>]*>/g)) {
        const tag = m[0];
        if (!/class="[^"]*\bcard-main\b/.test(tag)) continue;
        const href = /href="([^"]+)"/.exec(tag)?.[1] ?? '';
        if (/^https?:\/\//.test(href)) hits.push(`${path.relative(dist, p)} -> ${href.slice(0, 90)}`);
      }
    }
  }
}
walk(dist);
if (hits.length > MAX_PER_SITE) {
  for (const h of hits) console.error(`FAIL: card body links straight to the store: ${h}`);
  console.error(`FAIL: ${hits.length} store-direct card bodies (allowed: ${MAX_PER_SITE}).`);
  process.exit(1);
}
console.log(`PASS: ${hits.length} store-direct card bodies (allowed: ${MAX_PER_SITE}).`);
