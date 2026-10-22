import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measurePricePages } from '../src/lib/pricePageDensity.mjs';
const root = process.argv[2] ?? fileURLToPath(new URL('../dist/plugin-prices/', import.meta.url));
const pages = {};
for (const slug of await readdir(root, { withFileTypes: true })) {
  if (!slug.isDirectory()) continue;
  try { pages[slug.name] = await readFile(join(root, slug.name, 'index.html'), 'utf8'); } catch { /* no built page */ }
}
console.log(JSON.stringify(measurePricePages(pages), null, 2));
