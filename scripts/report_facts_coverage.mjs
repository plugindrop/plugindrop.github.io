import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import map from '../src/data/post_catalog_map.json' with { type: 'json' };
import prices from '../src/data/price_history.json' with { type: 'json' };
import { comparisonPriceFacts } from '../src/lib/priceInsights.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outerData = path.resolve(root, '..', '..', 'data');
const entries = { ...prices.bundles, ...prices.plugins };
const results = [];
for (const [slug, item] of Object.entries(map)) {
  if (!['list', 'comparison', 'review'].includes(item.kind)) continue;
  const source = ['md', 'mdx'].map((ext) => path.join(root, 'src', 'content', 'blog', `${slug}.${ext}`)).find(fs.existsSync);
  if (!source) continue;
  const frontmatter = fs.readFileSync(source, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  if (/^(?:noindex|draft):\s*true\s*$/m.test(frontmatter)) continue;
  const productCount = item.products.length;
  const priced = item.products.filter((name) => comparisonPriceFacts(entries[name])?.hasPrice).length;
  const expected = item.kind === 'review' ? productCount === 1 && priced === 1 : productCount >= 2 && priced >= 2;
  const htmlFile = path.join(root, 'dist', 'posts', slug, 'index.html');
  const html = fs.existsSync(htmlFile) ? fs.readFileSync(htmlFile, 'utf8') : '';
  const present = item.kind === 'review' ? /<div class="fact-card" data-fact-card\b/.test(html) : /<div class="facts-table-block" data-facts-table\b/.test(html);
  const reason = present ? 'present' : !productCount || (item.kind === 'review' ? productCount !== 1 : productCount < 2)
    ? 'mapping missing or insufficient products' : priced < (item.kind === 'review' ? 1 : 2)
      ? 'price data missing' : !expected ? 'mapping mismatch' : 'rendered HTML missing';
  results.push({ slug, kind: item.kind, products: productCount, priced, present, reason });
}
for (const kind of ['list', 'comparison', 'review']) {
  const group = results.filter((row) => row.kind === kind);
  console.log(`${kind}: ${group.length} public articles, ${group.filter((row) => row.present).length} with ${kind === 'review' ? 'card' : 'table'}`);
  for (const row of group.filter((row) => !row.present)) console.log(`  ${row.slug}: ${row.reason} (${row.products} mapped, ${row.priced} priced)`);
}
console.log(`Review coverage: ${results.filter((row) => row.kind === 'review' && row.present).length}/${results.filter((row) => row.kind === 'review').length}`);

// A checked-in 28-day views export can be supplied without any API request.
const viewsFiles = fs.existsSync(outerData) ? fs.readdirSync(outerData).filter((name) => /views/i.test(name) && /\.(?:json|csv)$/.test(name)) : [];
if (!viewsFiles.length) {
  console.log('G3: views取得元が見つからない (no local 28-day views export; cannot judge top 80%)');
} else {
  console.log(`G3: local views candidates: ${viewsFiles.join(', ')}; verify 28-day period and schema before calculating top 80%`);
}
