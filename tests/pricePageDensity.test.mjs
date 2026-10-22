import assert from 'node:assert/strict';
import test from 'node:test';
import { measurePricePages } from '../src/lib/pricePageDensity.mjs';
test('price page report counts rendered blocks and initial iframes', () => {
  const result = measurePricePages({ a: '<section data-product-facts><section data-alternatives-count="2">', b: '<iframe></iframe>' });
  assert.equal(result.M18.percent, 50);
  assert.equal(result.M19.count, 1);
  assert.equal(result.M20, 1);
});
