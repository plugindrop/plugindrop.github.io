import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCompareModel, comparePrices } from '../src/lib/compareTable.mjs';
import fs from 'node:fs';

const fact = (value) => ({ value, source_url: 'https://vendor.example/item', quote: 'official', fetched_at: '2026-10-15', source_kind: 'vendor' });
const input = (names, facts, extra = {}) => ({ slug: 'best-free-test', rawBody: '', catalog: { products: names }, vendorMap: [], vendorFacts: facts, vendorProducts: {}, priceEntries: {}, ...extra });

test('free threshold and price exclusion', () => {
  const names = ['A', 'B', 'C', 'D', 'E'];
  const complete = { is_free: fact(true), formats: fact('VST3'), macos_min: fact('12') };
  const four = buildCompareModel(input(names, { A: complete, B: complete, C: complete, D: complete }));
  assert.equal(four.mode, 'table');
  assert.ok(!four.columns.some((c) => /price|boutique/i.test(c.label)));
  const two = buildCompareModel(input(names, { A: complete, B: complete }));
  assert.equal(two.mode, 'list');
  assert.equal(two.rows.length, 2);
});

test('heading aliases and unmatched headings enter denominator', () => {
  const model = buildCompareModel(input(['A', 'B'], {}, { rawBody: '## 1. Alias\n### Unknown', vendorProducts: { id: { name: 'Actual', aliases: ['Alias'], status: 'verified' } } }));
  assert.equal(model.coverage.total, 4);
});

test('research-only history never creates a Today price', () => {
  const priceEntries = Object.fromEntries(['A', 'B'].map((name) => [name, { pb_url: 'https://www.pluginboutique.com/product', history: [{ date: '2020-01-01', source: 'research', regular: 100, sale: 50 }] }]));
  assert.equal(comparePrices(priceEntries.A, Date.parse('2026-10-15')).today, null);
  assert.equal(comparePrices(priceEntries.B, Date.parse('2026-10-15')).today, null);
});

test('stale observed prices have episodes and typical values but no Today', () => {
  const history = [
    { date: '2020-01-01', source: 'auto_check', regular: 100, sale: 40 },
    { date: '2020-01-02', source: 'auto_check', regular: 100, sale: 40 },
    { date: '2020-02-01', source: 'auto_check', regular: 100, sale: 60 },
  ];
  const prices = comparePrices({ history }, Date.parse('2026-10-15'));
  assert.equal(prices.salesRecorded, 2);
  assert.equal(prices.sale, '$50.00');
  assert.equal(prices.today, null);
});

test('fresh typical regular without an observed sale has no Today', () => {
  const prices = comparePrices({ history: [{ date: '2026-10-14', source: 'auto_check', sale: null, regular: 149, reg_src: 'typical' }] }, Date.parse('2026-10-15'));
  assert.equal(prices.today, null);
});

test('shared product headings include unresolved products', () => {
  const caseData = JSON.parse(fs.readFileSync(new URL('../../../tests/fixtures/product_headings.json', import.meta.url), 'utf8'));
  const model = buildCompareModel(input([], {}, { rawBody: caseData.body, vendorProducts: {
    'vp-nova': { name: 'TDR Nova', aliases: ['Nova'], status: 'verified' },
    'vp-surge': { name: 'Surge XT', status: 'verified' },
  } }));
  assert.equal(model.coverage.total, caseData.expected.length);
  assert.deepEqual(model.coverage.productIds, caseData.expected);
});

test('paid columns and rows omit sparse content and missing tracker prices', () => {
  const facts = { A: { formats: fact('VST3'), macos_min: fact('12') }, B: { formats: fact('AU'), macos_min: fact('13') }, C: {} };
  const model = buildCompareModel(input(['A', 'B', 'C'], facts, { slug: 'paid-list', priceEntries: { A: { history: [] }, B: { history: [] } } }));
  assert.ok(!model.columns.some((c) => c.key === 'windows_min'));
  assert.equal(model.mode, 'table');
  assert.ok(!model.columns.some((c) => c.key === 'today'));
  assert.ok(!JSON.stringify(model).includes('not tracked'));
  assert.ok(!JSON.stringify(model).includes('not published'));
});
