import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

import { formatPrice } from '../src/lib/priceUtils.ts';
import { listSaleEpisodes, saleEpisodeCount, OBSERVED_SOURCES } from '../src/lib/indexPolicy.mjs';

test('formatPrice rounds nonintegers to cents and removes .00', () => {
  assert.equal(formatPrice(null), '—');
  assert.equal(formatPrice(12), '$12');
  assert.equal(formatPrice(12.345), '$12.35');
  assert.equal(formatPrice(12.5), '$12.50');
  assert.equal(formatPrice(12.999), '$13');
});

// Evaluate the page's own FAQ functions with small entries, so the assertions
// exercise the copy shipped in Astro rather than a duplicate test implementation.
const page = readFileSync(new URL('../src/pages/plugin-prices/[slug].astro', import.meta.url), 'utf8');
const faqSource = page.split('// --- FAQ -------------------------------------------------------------------')[1]
  .split('// --- Cheaper alternatives')[0];
const faqCode = stripTypeScriptTypes(faqSource);
function faqsFor(entry) {
  const name = 'Test Plugin';
  const current = null;
  const onSale = false;
  const isSearchUrl = () => false;
  return Function('entry', 'name', 'current', 'onSale', 'isSearchUrl',
    'listSaleEpisodes', 'saleEpisodeCount', 'OBSERVED_SOURCES', 'formatPrice',
    `${faqCode}\nreturn faqs;`)(entry, name, current, onSale, isSearchUrl,
    listSaleEpisodes, saleEpisodeCount, OBSERVED_SOURCES, formatPrice);
}

const row = (date, sale, source = 'auto_check') => ({ date, sale, regular: 100, source });

test('FAQ omits duration when fewer than two sale periods exist', () => {
  for (const history of [[], [row('2026-01-01', 40)]]) {
    const faqs = faqsFor({ pb_url: '', history });
    assert.equal(faqs.some(({ q }) => q.startsWith('How long do')), false);
    assert.equal(faqs.length, 3);
  }
});

test('FAQ uses separate periods, median observed span, and sourced low', () => {
  const faqs = faqsFor({ pb_url: '', history: [
    row('2021-01-01', 30, 'wayback'),
    row('2026-01-01', 40),
    row('2026-01-03', 40),
    row('2026-01-04', null),
    row('2026-02-01', 50),
  ] });
  assert.equal(faqs.length, 4);
  assert.match(faqs[0].a, /3 separate sales/);
  assert.match(faqs[0].a, /observed gaps between sale periods/);
  assert.match(faqs[1].a, /median observed span is 1 day/);
  assert.match(faqs[2].a, /\$30, observed on 2021-01-01 from an Internet Archive snapshot/);
});
