import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MIN_BRAND_PRODUCTS,
  MIN_PRICE_OBS,
  MIN_TAG_POSTS,
  isBrandPageIndexable,
  isPricePageIndexable,
  isTagPageIndexable,
  noindexPricePagePaths,
  slugifyProduct,
} from '../src/lib/indexPolicy.mjs';

test('slugifyProduct preserves the existing product URL format', () => {
  assert.equal(slugifyProduct('FabFilter Pro-Q 4'), 'fabfilter-pro-q-4');
  assert.equal(slugifyProduct('  u-he: Diva / Repro  '), 'u-he-diva-repro');
  assert.equal(slugifyProduct('Soundtoys 5.5'), 'soundtoys-5-5');
});

test('isPricePageIndexable uses three observations as the boundary', () => {
  assert.equal(MIN_PRICE_OBS, 3);
  assert.equal(isPricePageIndexable({ history: [] }), false);
  assert.equal(isPricePageIndexable({ history: [{}] }), false);
  assert.equal(isPricePageIndexable({ history: [{}, {}, {}] }), true);
});

test('noindexPricePagePaths returns plugin and bundle paths below the boundary', () => {
  const priceData = {
    plugins: {
      'Zero Observations': { history: [] },
      'One Observation': { history: [{}] },
      'Three Observations': { history: [{}, {}, {}] },
    },
    bundles: {
      'Bundle With No History Field': {},
    },
  };

  assert.deepEqual(noindexPricePagePaths(priceData), [
    '/plugin-prices/zero-observations/',
    '/plugin-prices/one-observation/',
    '/plugin-prices/bundle-with-no-history-field/',
  ]);
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
