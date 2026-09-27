import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MIN_BRAND_PRODUCTS,
  MIN_PRICE_OBS,
  MIN_PRICE_LEVELS,
  MIN_PRICE_SALE_OBS,
  MIN_SALE_EPISODES,
  MIN_OWN_TRACKING_DAYS,
  OBSERVED_SOURCES,
  SALE_EPISODE_MAX_GAP_DAYS,
  MIN_TAG_POSTS,
  indexablePricePagePaths,
  isBrandPageIndexable,
  isProductNameIndexable,
  isPricePageIndexable,
  isTagPageIndexable,
  noindexPricePagePaths,
  listSaleEpisodes,
  ownTrackingDays,
  priceSubstance,
  saleEpisodeCount,
  slugifyProduct,
} from '../src/lib/indexPolicy.mjs';

const observation = (date, sale, source = 'auto_check', regular = 99) => ({ date, regular, sale, source });
const eligibleEntry = () => ({
  typical_sale: 49,
  all_time_low: 39,
  history: [
    observation('2026-01-01', 49),
    observation('2026-01-15', 49),
    observation('2026-01-16', null),
    observation('2026-02-15', 49),
  ],
});

test('slugifyProduct preserves the existing product URL format', () => {
  assert.equal(slugifyProduct('FabFilter Pro-Q 4'), 'fabfilter-pro-q-4');
  assert.equal(slugifyProduct('  u-he: Diva / Repro  '), 'u-he-diva-repro');
  assert.equal(slugifyProduct('Soundtoys 5.5'), 'soundtoys-5-5');
});

test('priceSubstance counts observations, sale observations, and effective price levels', () => {
  assert.deepEqual(priceSubstance({ history: [] }), {
    observations: 0,
    saleObservations: 0,
    priceLevels: 0,
  });
  assert.deepEqual(priceSubstance({ history: [
    { regular: 99, sale: null },
    { regular: 99, sale: 49 },
    { regular: 99, sale: 49 },
  ] }), {
    observations: 3,
    saleObservations: 2,
    priceLevels: 2,
  });
  assert.equal(priceSubstance({ history: [{ regular: 99 }] }).saleObservations, 0);
});

test('sale episodes group dates, split at a non-sale day or after a 14-day gap', () => {
  assert.equal(MIN_SALE_EPISODES, 2);
  assert.equal(SALE_EPISODE_MAX_GAP_DAYS, 14);
  const entry = { history: [
    observation('2026-02-02', 39),
    observation('2026-01-15', 49),
    observation('2026-01-01', 49),
    observation('2026-01-15', null),
    observation('2026-01-30', 49),
    observation('2026-02-01', null),
  ] };
  assert.deepEqual(listSaleEpisodes(entry), [
    { start: '2026-02-02', end: '2026-02-02', days: 1 },
    { start: '2026-01-30', end: '2026-01-30', days: 1 },
    { start: '2026-01-01', end: '2026-01-15', days: 15 },
  ]);
  assert.equal(saleEpisodeCount(entry), 3);
  assert.deepEqual(listSaleEpisodes({ history: [
    observation('2026-01-01', null),
    observation('2026-01-02', null),
  ] }), []);
  assert.equal(saleEpisodeCount({}), 0);
});

test('Wayback sale history remains an episode but is excluded from own tracking days', () => {
  const entry = { history: [
    observation('2020-01-01', 49, 'wayback'),
    observation('2026-01-01', 49),
    observation('2026-02-15', null),
  ] };
  assert.equal(saleEpisodeCount(entry), 2);
  assert.equal(ownTrackingDays(entry), 45);
});

test('ownTrackingDays uses only observed sources and elapsed calendar days', () => {
  assert.equal(MIN_OWN_TRACKING_DAYS, 45);
  assert.deepEqual(OBSERVED_SOURCES, ['auto_check', 'pb_deals_poll', 'live_check', 'deal_intake', 'pb_crawl']);
  const sources = OBSERVED_SOURCES.map((source, i) => observation(`2026-01-0${i + 1}`, null, source));
  assert.equal(ownTrackingDays({ history: [
    observation('2020-01-01', 49, 'wayback'),
    ...sources,
    observation('2026-02-15', null, 'pb_crawl'),
    observation('2030-01-01', 49, 'research'),
  ] }), 45);
  assert.equal(ownTrackingDays({ history: [observation('2026-01-01', 49, 'wayback')] }), 0);
});

test('isPricePageIndexable preserves existing gates and applies new boundaries', () => {
  assert.equal(MIN_PRICE_OBS, 3);
  assert.equal(MIN_PRICE_SALE_OBS, 1);
  assert.equal(MIN_PRICE_LEVELS, 2);
  const pass = eligibleEntry();
  assert.equal(isPricePageIndexable(pass), true);
  assert.equal(isPricePageIndexable({ ...pass, history: [
    observation('2026-01-01', 49),
    observation('2026-01-16', null),
    observation('2026-02-15', 49),
  ] }), true);
  assert.equal(isPricePageIndexable({ ...pass, history: pass.history.slice(0, 2) }), false);
  assert.equal(isPricePageIndexable({ ...pass, history: pass.history.map((row) => ({ ...row, sale: null })) }), false);
  assert.equal(isPricePageIndexable({ ...pass, history: pass.history.map((row) => ({ ...row, regular: 49, sale: 49 })) }), false);
  assert.equal(isPricePageIndexable({ ...pass, history: pass.history.filter((row) => row.date !== '2026-02-15') }), false);
  assert.equal(isPricePageIndexable({ ...pass, history: [
    observation('2026-01-01', 49),
    observation('2026-01-15', 49),
    observation('2026-01-29', 49),
    observation('2026-02-12', 49),
    observation('2026-02-15', 49),
  ] }), false);
  assert.equal(isPricePageIndexable({ ...pass, history: pass.history.map((row) => ({ ...row, source: 'wayback' })) }), false);
  assert.equal(isPricePageIndexable({ ...pass, all_time_low: 50 }), false);
  assert.equal(isPricePageIndexable({ ...pass, all_time_low: 49 }), true);
  assert.equal(isPricePageIndexable({ ...pass, all_time_low: null }), true);
  assert.equal(isPricePageIndexable({ ...pass, typical_sale: null }), true);
  assert.equal(isPricePageIndexable({}), false);
  assert.equal(isPricePageIndexable({ ...pass, pb_url: '/search?q=zombie' }), false);
});

test('price page path helpers are complementary across plugins and bundles', () => {
  const priceData = {
    plugins: {
      'No Sale': { history: [{ regular: 99 }, { regular: 99 }, { regular: 99 }] },
      'Plugin Pass': eligibleEntry(),
    },
    bundles: {
      'Bundle Pass': eligibleEntry(),
      'Bundle With No History Field': {},
    },
  };

  assert.deepEqual(noindexPricePagePaths(priceData), [
    '/plugin-prices/no-sale/',
    '/plugin-prices/bundle-with-no-history-field/',
  ]);
  assert.deepEqual(indexablePricePagePaths(priceData), [
    '/plugin-prices/plugin-pass/',
    '/plugin-prices/bundle-pass/',
  ]);
  assert.equal(
    new Set([...noindexPricePagePaths(priceData), ...indexablePricePagePaths(priceData)]).size,
    4,
  );
  assert.equal(isProductNameIndexable(priceData, 'Plugin Pass'), true);
  assert.equal(isProductNameIndexable(priceData, 'Bundle Pass'), true);
  assert.equal(isProductNameIndexable(priceData, 'Unknown Product'), false);
});

test('tag indexability uses three public posts as the boundary', () => {
  assert.equal(MIN_TAG_POSTS, 3);
  assert.equal(isTagPageIndexable(1), false);
  assert.equal(isTagPageIndexable(3), true);
});

test('brand indexability uses three products as the boundary', () => {
  assert.equal(MIN_BRAND_PRODUCTS, 3);
  assert.equal(isBrandPageIndexable(2), false);
  assert.equal(isBrandPageIndexable(3), true);
});
