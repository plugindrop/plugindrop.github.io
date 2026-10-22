import test from 'node:test';
import assert from 'node:assert/strict';
import { measureHome } from '../src/lib/homeDensity.mjs';

test('home density counts cards, copy, images and initially visible cards', () => {
  const html = `<img src="outside"><article data-deal-card data-product-key="A"><p class="tagline">Useful</p><img src="a"></article><div class="grid-item" data-extra="true"><article data-deal-card data-product-key="B"><p class="tagline tagline--fallback">Category</p><img src="b"></article></div><article data-deal-card data-product-key="C"><p class="card-copy-line"><q cite="https://example.com">Maker</q></p><span class="off-tag is-muted">-20%</span><p>Above its usual sale price</p></article>`;
  const m = measureHome(html);
  assert.equal(m.M1, 2); assert.equal(m.M2, 1); assert.equal(m.M3, 2); assert.equal(m.M4, 1);
  assert.equal(m.M5, 2); assert.equal(m.M6, 3); assert.equal(m.M12.maxBrandShare, null);
});
