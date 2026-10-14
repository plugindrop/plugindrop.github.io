import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { weeklyPriceFacts } from '../src/lib/priceTrends.mjs';
import corrections from '../src/data/corrections.json' with { type: 'json' };

test('weekly facts use only dated direct observations and previous direct lows', () => {
  const data = { plugins: { 'FabFilter Test': { history: [
    { date: '2026-10-01', sale: 80, regular: 100, source: 'auto_check' },
    { date: '2026-10-11', sale: 40, regular: 100, source: 'research' },
    { date: '2026-10-12', sale: 70, regular: 100, source: 'auto_check' },
  ] } } };
  const facts = weeklyPriceFacts(data, new Date('2026-10-14T00:00:00Z'));
  assert.equal(facts.observedSales, 1);
  assert.deepEqual(facts.newLows.map(x => x.name), ['FabFilter Test']);
  assert.equal(weeklyPriceFacts(data, new Date('2026-11-14T00:00:00Z')).observedSales, 0);
});

test('correction dates match source commit dates', () => {
  assert.ok(corrections.every(item => /^2026-10-04$/.test(item.date) && /^[0-9a-f]{9}$/.test(item.commit)));
});

test('home and corrections build output contains the required navigation', { skip: !process.env.PRICE_TRENDS_BUILD_DIR }, () => {
  const out = process.env.PRICE_TRENDS_BUILD_DIR;
  const home = readFileSync(join(out, 'index.html'), 'utf8');
  const page = readFileSync(join(out, 'corrections', 'index.html'), 'utf8');
  for (const route of ['/free/', '/brand-sale-trends/', '/sale-calendar/', '/how-we-track-prices/', '/plugin-prices/', '/corrections/']) {
    assert.ok(home.includes(`href="${route}"`), route);
  }
  assert.match(home, /This week&#39;s data|This week's data/);
  assert.match(page, /Colour Copy/);
});
