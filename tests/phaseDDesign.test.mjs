import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist');
const html = route => readFileSync(join(dist, route, 'index.html'), 'utf8');
const count = (source, pattern) => [...source.matchAll(pattern)].length;

test('Phase D directories render product imagery and shared cards', () => {
  for (const route of ['categories', 'brands', 'best', 'plugin-prices']) {
    const page = html(route);
    assert.ok(count(page, /<img\b/g) >= 3, `${route}: product images`);
    assert.ok(count(page, /data-deal-card\b/g) >= 1, `${route}: shared cards`);
  }
});

test('Phase D detail keeps its price data below an image led buy box', () => {
  const page = html('plugin-prices/arturia-pigments');
  assert.match(page, /class="product-showcase"/);
  assert.match(page, /class="product-signals"/);
  assert.ok(page.indexOf('class="product-showcase"') < page.indexOf('>Price History</h2>'));
  assert.match(page, /<table\b/);
});

test('free directory leads with official download cards', () => {
  const page = html('free');
  assert.match(page, /class="free-card"/);
  const cards = [...page.matchAll(/<article class="free-card">([\s\S]*?)<\/article>/g)].map(match => match[1]);
  const hrefs = cards.map(card => card.match(/<a href="([^"]+)"/)?.[1]);
  assert.equal(new Set(hrefs).size, hrefs.length, 'unique official URLs');
  for (const card of cards) {
    const name = card.match(/<h3>([^<]+)<\/h3>/)?.[1];
    const image = card.match(/<img src="([^"]+)"/)?.[1];
    if (image) assert.ok(image.includes(name.toLowerCase().replace(/\s+/g, '-')) || (name === 'LABS' && image.includes('spitfire-labs')), `${name}: correct product image`);
  }
});

test('guides retain their original titles and priority links', () => {
  const posts = html('posts');
  for (const match of posts.matchAll(/<a href="\/posts\/([^"/]+)\/"[\s\S]*?<h3>([^<]+)<\/h3>/g)) {
    if (/^(best-|how-to-)/.test(match[1]) || /(?:^|-)vs(?:-|$)/.test(match[1])) assert.doesNotMatch(match[2], /% off/i, match[1]);
  }
  for (const route of ['best', 'categories']) {
    const section = html(route).match(/<section aria-label="Popular and recovered guides"[^>]*>([\s\S]*?)<\/section>/)?.[1];
    assert.ok(section, `${route}: priority section`);
    assert.equal(count(section, /<li[^>]*><a href="\/posts\//g), 16, `${route}: 16 guide links`);
  }
});

test('new directories avoid unsupported rarity claims', () => {
  for (const route of ['best', 'categories', 'brands', 'free', 'plugin-prices']) {
    assert.doesNotMatch(html(route), />\s*(?:all-time low|rare)\s*</i, route);
  }
});
