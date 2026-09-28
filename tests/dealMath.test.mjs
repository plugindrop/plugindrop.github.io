import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { nowVsTypical, topNTotal, upgradeVsNew } from '../src/lib/dealMath.mjs';

const entry = (regular = 100, sale = 60, current = 80, count = 3) => ({
  typical_regular: regular, typical_sale: sale, all_time_low: null,
  history: Array.from({ length: count }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, regular, sale: i === 1 ? null : i === 0 ? sale : current, source: 'auto_check' })),
});

test('now versus typical sale uses observed price facts', () => {
  assert.deepEqual(nowVsTypical(entry()), { now: 80, typicalSale: 60, difference: 20 });
  assert.equal(nowVsTypical(entry(100, null, 100)), null);
  assert.equal(nowVsTypical(entry(100, 60, 80, 1)), null);
  assert.equal(nowVsTypical(undefined), null);
  assert.deepEqual(nowVsTypical(entry(100, 60, 100)), { now: 100, typicalSale: 60, difference: 40 });
});

test('top N totals require every price and enough products', () => {
  assert.deepEqual(topNTotal([entry(), entry(), entry()]), { count: 3, now: 240, typicalSale: 180 });
  assert.equal(topNTotal([entry(), entry()]), null);
  assert.equal(topNTotal([entry(), entry(100, null), entry()]), null);
  assert.equal(topNTotal([entry()], 0), null);
});

test('upgrade comparison requires a published USD price', () => {
  assert.deepEqual(upgradeVsNew({ upgrade_price: { value: 40, currency: 'USD' } }, entry()), { upgrade: 40, new: 80, difference: 40 });
  assert.equal(upgradeVsNew({}, entry()), null);
  assert.equal(upgradeVsNew({ upgrade_price: { value: 40, currency: 'EUR' } }, entry()), null);
  assert.equal(upgradeVsNew({ upgrade_price: { value: 40, currency: 'USD' } }, undefined), null);
});

test('zero calculable rows omit the Price math section', () => {
  const html = fs.readFileSync(new URL('../dist/posts/best-eq-plugins-2026/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /data-price-math/);
});
