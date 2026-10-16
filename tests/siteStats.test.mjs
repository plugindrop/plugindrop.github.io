import test from 'node:test';
import assert from 'node:assert/strict';
import { siteStats } from '../src/lib/siteStats.mjs';
import priceData from '../src/data/price_history.json' with { type: 'json' };

test('deduplicates measured products by PB ID and normalised name', () => {
  const plugins = {};
  for (let i = 0; i < 15; i++) {
    plugins[`Product ${i}`] = { pb_url: `https://www.pluginboutique.com/product/2-Effects/5/${i}-one`, brand: 'A', history: [{ date: '2026-05-04', source: 'auto_check' }] };
  }
  const bundles = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`Copy ${i}`, { pb_url: `https://www.pluginboutique.com/product/1-Bundles/3/${i}-two`, brand: 'A', history: [{ date: '2026-05-05', source: 'pb_deals_poll' }] }]));
  const stats = siteStats({ plugins, bundles });
  assert.equal(stats.trackedProducts, 15);
  assert.equal(stats.pricePages, 30);
  assert.equal(stats.trackingSince, '2026-05-04');
  assert.equal(stats.brandsTracked, 1);
});

test('excludes research, wayback and typical rows', () => {
  const stats = siteStats({ plugins: {
    Archive: { brand: 'B', history: [{ date: '2021-01-01', source: 'wayback' }, { date: '2022-01-01', source: 'research' }] },
    Measured: { brand: 'C', history: [{ date: '2026-06-01', source: 'pb_deals_poll' }] },
  } });
  assert.equal(stats.trackedProducts, 1);
  assert.equal(stats.trackingSince, '2026-06-01');
  assert.equal(stats.brandsTracked, 1);
});

test('relative and absolute PB product URLs share one identity', () => {
  const history = [{ date: '2026-10-14', source: 'auto_check' }];
  assert.equal(siteStats({ plugins: { A: { pb_url: '/product/2-Effects/5/12345-A', history }, B: { pb_url: 'https://www.pluginboutique.com/product/2-Effects/5/12345-A', history } } }).trackedProducts, 1);
});

test('the live data uses one measured count and start date', () => {
  const stats = siteStats(priceData);
  assert.ok(stats.trackedProducts > 0);
  assert.ok(stats.pricePages >= stats.trackedProducts);
  const dates = Object.values({ ...priceData.plugins, ...priceData.bundles })
    .flatMap((entry) => entry.history ?? [])
    .filter((row) => ['auto_check', 'pb_deals_poll'].includes(row.source))
    .map((row) => row.date);
  assert.equal(stats.trackingSince, dates.sort()[0]);
});
