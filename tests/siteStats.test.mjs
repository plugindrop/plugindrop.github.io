import test from 'node:test';
import assert from 'node:assert/strict';
import { siteStats, brandStats, MEASURED_SOURCES } from '../src/lib/siteStats.mjs';
import { brandTrends } from '../src/lib/priceTrends.mjs';
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

test('brandStats deduplicates measured PB products and uses canonical SSL prefixes', () => {
  const history = [
    { date: '2026-06-01', source: 'auto_check', regular: 100, sale: 50 },
    { date: '2026-06-02', source: 'pb_deals_poll', regular: 100, sale: null },
  ];
  const data = { plugins: {
    'SSL Native Channel': { pbProductId: '123', brand: 'Wrong Brand', history },
    'SSL Native Channel Copy': { pbProductId: '123', history },
    'SSL Native EQ': { history: [{ date: '2026-06-05', source: 'auto_check', regular: 80, sale: null }] },
    'Unknown Product': { history: [{ date: '2026-05-01', source: 'auto_check' }] },
  } };
  const stats = brandStats(data, { now: Date.parse('2026-06-06'), dealPool: [] });
  assert.deepEqual(MEASURED_SOURCES, ['auto_check', 'pb_deals_poll']);
  assert.deepEqual(stats.get('Solid State Logic'), {
    tracked: 2, onSaleNow: 0, typicallyDiscounted: 1, indexable: 0, trackingSince: '2026-06-01',
  });
  assert.equal(stats.has('Wrong Brand'), false);
  assert.equal(stats.has(null), false);
});

test('brandStats counts the already deduplicated live deal pool', () => {
  const history = [{ date: '2026-06-01', source: 'auto_check' }];
  const data = { plugins: {
    'Cherry Audio One': { pbProductId: 11, history },
    'Cherry Audio One Copy': { pbProductId: 11, history },
    'Cherry Audio Two': { pbProductId: 12, history },
  } };
  const dealPool = [
    { name: 'Cherry Audio One', entry: data.plugins['Cherry Audio One'] },
    { name: 'Cherry Audio Two', entry: data.plugins['Cherry Audio Two'] },
  ];
  const stats = brandStats(data, { now: Date.parse('2026-06-02'), dealPool });
  assert.equal(stats.get('Cherry Audio').tracked, 2);
  assert.equal(stats.get('Cherry Audio').onSaleNow, dealPool.length);
});

test('brandStats excludes research and wayback from tracking start and sale episodes', () => {
  const data = { plugins: {
    'FabFilter Pro-Q': { history: [
      { date: '2021-01-01', source: 'wayback', regular: 100, sale: 40 },
      { date: '2022-01-01', source: 'research', regular: 100, sale: 50 },
      { date: '2026-05-04', source: 'auto_check', regular: 100, sale: null },
      { date: '2026-05-17', source: 'pb_deals_poll', regular: 100, sale: 60 },
    ] },
    'FabFilter Archive': { history: [{ date: '2020-01-01', source: 'wayback', sale: 10 }] },
  } };
  assert.deepEqual(brandStats(data, { now: Date.parse('2026-05-18'), dealPool: [] }).get('FabFilter'), {
    tracked: 1, onSaleNow: 0, typicallyDiscounted: 1, indexable: 0, trackingSince: '2026-05-04',
  });
});

test('brandStats applies the price page indexability gate', () => {
  const history = [
    { date: '2026-01-01', source: 'auto_check', regular: 100, sale: 50 },
    { date: '2026-01-16', source: 'auto_check', regular: 100, sale: null },
    { date: '2026-02-01', source: 'auto_check', regular: 100, sale: 60 },
    { date: '2026-02-15', source: 'auto_check', regular: 100, sale: null },
  ];
  const data = { plugins: {
    'Arturia Eligible': { history },
    'Arturia Short': { history: history.slice(0, 2) },
  } };
  assert.equal(brandStats(data, { now: Date.parse('2026-02-16'), dealPool: [] }).get('Arturia').indexable, 1);
});

test('brandTrends can use own measured sources only for its period', () => {
  const data = { plugins: { 'Waves One': { history: [
    { date: '2025-01-01', source: 'pb_crawl', regular: 100 },
    { date: '2026-05-04', source: 'auto_check', regular: 100 },
    { date: '2026-05-17', source: 'pb_deals_poll', regular: 100 },
    { date: '2026-06-01', source: 'deal_intake', regular: 100 },
  ] } } };
  const original = brandTrends(data)[0].measured;
  const scoped = brandTrends(data, { measuredPeriodSources: MEASURED_SOURCES })[0].measured;
  assert.equal(original.first, '2025-01-01');
  assert.equal(original.last, '2026-06-01');
  assert.equal(scoped.first, '2026-05-04');
  assert.equal(scoped.last, '2026-05-17');
  assert.equal(scoped.checks, original.checks);
});
