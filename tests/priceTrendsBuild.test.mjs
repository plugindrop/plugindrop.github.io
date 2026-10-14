import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.env.PRICE_TRENDS_BUILD_DIR;
test('existing data hubs are canonical and retired routes are absent', { skip: !out }, () => {
  const sitemap = readFileSync(join(out, 'sitemap-0.xml'), 'utf8');
  for (const route of ['brands/', 'sale-stats/', 'how-we-track-prices/']) {
    const html = readFileSync(join(out, route, 'index.html'), 'utf8');
    const url = `https://plugindrop.net/${route}`;
    assert.ok(sitemap.includes(url), `${route} missing from sitemap`);
    assert.match(html, new RegExp(`<link rel="canonical" href="${url}"`));
    assert.match(html, /<meta name="robots" content="index, follow/);
  }
  assert.doesNotMatch(sitemap, /brand-sale-trends|sale-calendar/);
  const home = readFileSync(join(out, 'index.html'), 'utf8');
  assert.ok((home.match(/<tr\b/g) ?? []).length <= 45);
  assert.ok((home.match(/class="pb-link"[^>]*href="https?:/g) ?? []).length <= 80);
});
