import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MIN_BRAND_PRODUCTS,
  MIN_PRICE_OBS,
  MIN_PRICE_LEVELS,
  MIN_PRICE_SALE_OBS,
  MIN_TAG_POSTS,
  indexablePricePagePaths,
  isBrandPageIndexable,
  isProductNameIndexable,
  isPricePageIndexable,
  isTagPageIndexable,
  noindexPricePagePaths,
  priceSubstance,
  slugifyProduct,
} from '../src/lib/indexPolicy.mjs';

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

test('isPricePageIndexable applies all gate v2 boundaries', () => {
  assert.equal(MIN_PRICE_OBS, 3);
  assert.equal(MIN_PRICE_SALE_OBS, 1);
  assert.equal(MIN_PRICE_LEVELS, 2);
  assert.equal(isPricePageIndexable({ history: [
    { regular: 99 }, { regular: 99 }, { regular: 99 },
  ] }), false);
  assert.equal(isPricePageIndexable({ history: [
    { regular: 99, sale: 49 }, { regular: 99, sale: 49 }, { regular: 99, sale: 49 },
  ] }), false);
  assert.equal(isPricePageIndexable({ history: [
    { regular: 99 }, { regular: 99 }, { regular: 99, sale: 49 },
  ] }), true);
  assert.equal(isPricePageIndexable({ history: [
    { regular: 99 }, { regular: 99, sale: 49 },
  ] }), false);
  assert.equal(isPricePageIndexable({}), false);
});

test('price page path helpers are complementary across plugins and bundles', () => {
  const priceData = {
    plugins: {
      'No Sale': { history: [{ regular: 99 }, { regular: 99 }, { regular: 99 }] },
      'Plugin Pass': { history: [{ regular: 99 }, { regular: 99 }, { regular: 99, sale: 49 }] },
    },
    bundles: {
      'Bundle Pass': { history: [{ regular: 199 }, { regular: 199 }, { regular: 199, sale: 99 }] },
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
