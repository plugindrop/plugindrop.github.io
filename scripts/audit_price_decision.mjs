import { readFileSync } from 'node:fs';
import priceData from '../src/data/price_history.json' with { type: 'json' };
import { isPricePageIndexable, slugifyProduct } from '../src/lib/indexPolicy.mjs';
import { comparablePrices, isStandardCents, lowestSeen, pbPathOf, sourceKindOf } from '../src/lib/priceBasis.mjs';
import { buildPageFacts, buildResearchNote } from '../src/lib/priceInsights.mjs';
import { formatPrice } from '../src/lib/priceUtils.ts';

const entries = [...Object.entries(priceData.plugins ?? {}), ...Object.entries(priceData.bundles ?? {})];
const counts = { on_sale: 0, list: 0, no_tracked_sale: 0, no_checks: 0 };
let withUntil = 0, withResearchNote = 0;
const excluded = [];
const errors = [];
const prediction = /\b(expect|likely|due|next sale|usually|typically|every (?:January|February|March|April|May|June|July|August|September|October|November|December))\b/i;
const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&(?:#39|apos);/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const section = (html, idOrTitle) => {
  const start = idOrTitle === 'decision' ? html.search(/<section[^>]*id="decision"/) : html.indexOf(idOrTitle);
  if (start < 0) return '';
  const open = idOrTitle === 'decision' ? start : html.lastIndexOf('<section', start);
  return html.slice(open, html.indexOf('</section>', start) + 10);
};

for (const [name, entry] of entries) {
  if (!isPricePageIndexable(entry)) continue;
  const slug = slugifyProduct(name);
  const facts = buildPageFacts(entry, { buildDate: priceData.last_updated });
  counts[facts.state]++;
  if (facts.until) withUntil++;
  if (buildResearchNote(name, facts)) withResearchNote++;
  for (const row of entry.history ?? []) {
    if (row.source === 'wayback' && Number.isFinite(row.regular) && !isStandardCents(row.regular))
      excluded.push({ name, date: row.date, value: row.regular });
  }
  let html;
  try { html = readFileSync(new URL(`../dist/plugin-prices/${slug}/index.html`, import.meta.url), 'utf8'); }
  catch { errors.push(`${name}: built HTML missing`); continue; }
  const decision = text(section(html, 'decision'));
  const sales = text(section(html, 'Sales we tracked at Plugin Boutique'));
  const low = lowestSeen(entry);
  if (html.includes('No discount recorded')) errors.push(`${name}: obsolete empty-state text`);
  const chartLow = text(html).match(/Lowest seen at Plugin Boutique\s+(\$[\d,.]+)/)?.[1] ?? null;
  if (comparablePrices(entry).length >= 2 && low && !chartLow) errors.push(`${name}: chart low missing`);
  if (chartLow && chartLow !== formatPrice(low?.price ?? null)) errors.push(`${name}: chart low ${chartLow} differs from ${formatPrice(low?.price ?? null)}`);
  const comparable = new Set(comparablePrices(entry).map((r) => formatPrice(r.price)));
  const displayedAmounts = new Set((decision + ' ' + sales).match(/\$[\d,.]+/g) ?? []);
  const path = pbPathOf(entry.pb_url);
  for (const row of entry.history ?? []) {
    if (!Number.isFinite(row.sale)) continue;
    const kind = sourceKindOf(row, path);
    if (!kind.startsWith('research_')) continue;
    const amount = formatPrice(row.sale);
    if (!comparable.has(amount) && displayedAmounts.has(amount))
      errors.push(`${name}: unconfirmed research price ${amount} in decision or sales`);
  }
  if (!decision) errors.push(`${name}: decision missing`);
  if (facts.state === 'on_sale' && !decision.includes('When does the current')) errors.push(`${name}: current sale end question missing`);
  if (facts.until && !decision.includes(facts.until)) errors.push(`${name}: valid end date missing`);
  if (facts.state === 'list' && (!decision.includes('How much cheaper does') || !decision.includes('When was')))
    errors.push(`${name}: list questions missing`);
  if ((html.match(/a sale can start before or end after them/g) ?? []).length > 1)
    errors.push(`${name}: duplicate sale uncertainty line`);
  if (prediction.test(decision)) errors.push(`${name}: prediction wording in decision`);
}
console.log('states:', counts);
console.log('validUntil:', withUntil, 'research notes:', withResearchNote);
console.log('excluded archive rows:', excluded);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('PASS');
