import test from 'node:test';
import assert from 'node:assert/strict';
import { priceRecord } from '../src/lib/priceRecord.mjs';

test('requires two observed sale episodes', () => {
  assert.deepEqual(priceRecord({ history: [{ date: '2026-01-01', sale: 20, source: 'research' }] }), { enough: false, checks: 0, observed: null });
});

test('reports observed checks even before two sale episodes exist', () => {
  assert.deepEqual(priceRecord({ history: [{ date: '2026-01-01', sale: 20, source: 'auto_check' }] }), { enough: false, checks: 1, observed: { date: '2026-01-01', price: 20 } });
});

test('uses observed sales and excludes research lows', () => {
  const history = [
    { date: '2026-01-01', regular: 100, sale: 50, source: 'auto_check' },
    { date: '2026-01-02', regular: 100, sale: null, source: 'pb_deals_poll' },
    { date: '2026-02-01', regular: 100, sale: 40, source: 'auto_check' },
    { date: '2026-02-02', regular: 100, sale: null, source: 'pb_deals_poll' },
    { date: '2025-01-01', regular: 100, sale: 1, source: 'research' },
  ];
  const actual = priceRecord({ history });
  assert.equal(actual.episodes, 2);
  assert.equal(actual.checks, 4);
  assert.equal(actual.previous.depth, 60);
  assert.equal(actual.returned.price, '$100.00');
  assert.equal(actual.lowest, '$40.00');
});
