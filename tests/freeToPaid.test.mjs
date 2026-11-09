import test from 'node:test';
import assert from 'node:assert/strict';
import { freeToPaid } from '../src/lib/freeToPaid.mjs';

const slug = 'best-free-synth-plugins';
const map = { [slug]: { free_reference: 'Vital', paid_product_key: 'Paid Synth', category: 'Synth', pb_check: { in_stock: true } } };
const history = [
  { date: '2026-10-01', regular: 100, sale: null, source: 'auto_check' },
  { date: '2026-10-20', regular: 100, sale: 50, source: 'auto_check' },
  { date: '2026-10-22', regular: 100, sale: null, source: 'auto_check' },
  { date: '2026-11-09', regular: 100, sale: 50, source: 'auto_check' },
];
const entry = { pb_url: '/product/1-Synth/4-Synth/123-Paid-Synth', history,
  typical_sale: 50, all_time_low: 50 };
const prices = { plugins: { 'Paid Synth': entry } };

test('missing map, price entry, and product URL do not render', () => {
  assert.equal(freeToPaid('other', map, prices), null);
  assert.equal(freeToPaid(slug, map, { plugins: {} }), null);
  assert.equal(freeToPaid(slug, map, { plugins: { 'Paid Synth': { ...entry, pb_url: '/search?q=synth' } } }), null);
});

test('fresh sale gives price and percentage without forbidden claims', () => {
  const model = freeToPaid(slug, map, prices, new Date('2026-11-10'));
  assert.ok(model);
  assert.equal(model.pct, 50);
  assert.match(model.body, /50% off right now/);
  assert.doesNotMatch(`${model.heading} ${model.body}`, /better|upgrade|superior|best alternative/i);
});

test('old observation hides price', () => {
  const model = freeToPaid(slug, map, prices, new Date('2026-12-01'));
  assert.ok(model);
  assert.equal(model.showPrice, false);
  assert.doesNotMatch(model.body, /\$|off right now/);
});
