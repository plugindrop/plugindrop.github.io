import test from 'node:test';
import assert from 'node:assert/strict';
import { measureHome } from '../src/lib/homeDensity.mjs';
import { readFileSync } from 'node:fs';

test('home density counts cards, copy, images and initially visible cards', () => {
  const html = `<img src="outside"><article data-deal-card data-product-key="A"><p class="tagline">Useful</p><img src="a"></article><div class="grid-item" data-extra="true"><article data-deal-card data-product-key="B"><p class="tagline tagline--fallback">Category</p><img src="b"></article></div><article data-deal-card data-product-key="C"><p class="card-copy-line"><q cite="https://example.com">Maker</q></p><span class="off-tag is-muted">-20%</span><p>above its previous low</p></article>`;
  const m = measureHome(html);
  assert.equal(m.M1, 2); assert.equal(m.M2, 1); assert.equal(m.M3, 2); assert.equal(m.M4, 1);
  assert.equal(m.M5, 2); assert.equal(m.M6, 3); assert.equal(m.M12.maxBrandShare, null);
});
test('home exposes view buttons and a responsive list initializer', () => {
  const filters = readFileSync(new URL('../src/components/HomeFilters.astro', import.meta.url), 'utf8');
  assert.match(filters, /data-view-choice="grid"/);
  assert.match(filters, /data-view-choice="list"/);
  assert.match(filters, /aria-pressed/);
  assert.match(filters, /matchMedia\('\(max-width: 680px\)'\)/);
});
test('home feature uses four rows, text category chips, and sourced formats', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const hot = html.match(/class="hot-grid"[^>]*>([\s\S]*?)<\/div><\/div><\/section>/)?.[1] ?? '';
  assert.equal((hot.match(/variant-row/g) ?? []).length, 4);
  const categories = html.match(/class="category-tiles[^\"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  assert.equal((categories.match(/<img\b/g) ?? []).length, 0);
  assert.match(html, /variant-spotlight[^>]*data-formats="[^"]+"/);
});
