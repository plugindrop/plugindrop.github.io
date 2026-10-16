import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { comparisonPriceFacts } from '../src/lib/priceInsights.mjs';

const post = (slug) => fs.readFileSync(path.resolve('dist', 'posts', slug, 'index.html'), 'utf8');

test('a product with no price columns cannot qualify for a fact table', () => {
  const empty = { typical_regular: null, typical_sale: null, all_time_low: null, history: [], pb_url: '' };
  assert.equal(comparisonPriceFacts(empty).hasPrice, false);
  assert.equal([empty, empty].filter((entry) => comparisonPriceFacts(entry).hasPrice).length >= 2, false);
});

test('vendor columns are absent without vendor_facts.json', () => {
  const html = post('best-eq-plugins-2026');
  assert.match(html, /<div class="facts-scroll" data-facts-table\b/);
  assert.doesNotMatch(html.match(/<thead\b[\s\S]*?<\/thead>/)?.[0] ?? '', /Apple Silicon/);
});

test('null fact cells are rendered as not listed', () => {
  assert.match(post('best-eq-plugins-2026'), /<span[^>]*aria-label="not listed"[^>]*>—<\/span>/);
});

test('a mapped list renders a fact table annotated with coverage counts', () => {
  assert.match(post('best-limiter-plugins-2026'), /data-facts-table[^>]*data-coverage-total="\d+"[^>]*data-coverage-qualified="\d+"/);
});
