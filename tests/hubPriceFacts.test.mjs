import test from 'node:test';
import assert from 'node:assert/strict';
import { productEvidenceRows, monthEventDifference, tagArticlePriceRows } from '../src/lib/hubPriceFacts.mjs';

const history = [
  { date: '2026-01-01', source: 'auto_check', regular: 100, sale: 50 },
  { date: '2026-01-16', source: 'auto_check', regular: 100, sale: null },
  { date: '2026-02-01', source: 'auto_check', regular: 100, sale: 40 },
  { date: '2026-02-20', source: 'auto_check', regular: 100, sale: null },
];

test('product evidence reports measured depth and latest episode', () => {
  const row = productEvidenceRows([{ name: 'Acme One', entry: { history } }])[0];
  assert.equal(row.maxDiscount, 60);
  assert.equal(row.maxDate, '2026-02-01');
  assert.equal(row.lastSale, '2026-02-01');
  assert.equal(row.saleShare, null);
});

test('maximum discount date comes from the deepest check within an episode', () => {
  const row = productEvidenceRows([{ name: 'Acme One', entry: { history: [
    { date: '2026-07-12', source: 'auto_check', regular: 100, sale: 75 },
    { date: '2026-07-13', source: 'auto_check', regular: 100, sale: 66 },
  ] } }])[0];
  assert.equal(row.maxDiscount, 34);
  assert.equal(row.maxDate, '2026-07-13');
});

test('monthly event difference compares starts, ends and new lows', () => {
  const result = monthEventDifference({ plugins: { 'Acme One': { history } } }, '2026-02');
  assert.equal(result.previousMonth, '2026-01');
  assert.deepEqual(result.starts, { count: 1, delta: 0 });
  assert.deepEqual(result.ends, { count: 1, delta: 0 });
  assert.deepEqual(result.newLows, { count: 1, delta: 1 });
});

test('monthly events use episode dates when checks contain only sale rows', () => {
  const result = monthEventDifference({ plugins: { 'Acme One': { history: [
    { date: '2026-09-30', source: 'pb_deals_poll', regular: 100, sale: 75 },
    { date: '2026-10-01', source: 'auto_check', regular: 100, sale: 60 },
    { date: '2026-10-15', source: 'auto_check', regular: 100, sale: 50 },
  ] } } }, '2026-10');
  assert.deepEqual(result.starts, { count: 0, delta: -1 });
  assert.deepEqual(result.ends, { count: 1, delta: 1 });
});

test('tag evidence follows article order and handles missing record', () => {
  const rows = tagArticlePriceRows([{ id: 'one' }, { id: 'two' }],
    [{ name: 'Acme One', entry: { history } }, null], { plugins: { 'Acme One': { history } } });
  assert.equal(rows[0].lastCheck, '2026-02-20');
  assert.equal(rows[1].lastCheck, null);
});
