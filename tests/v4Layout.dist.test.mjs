import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const slugs = ['devastor-2-020cac', 'evolve-elastic-lite-327ffb', 'rc-20-retro-color-v2-cbb4c6', 'ssl-4k-b-e4a7af', 'ssl-blitzer-4287ec', 'ssl-native-bus-compressor-2-50a0ef'];
test('built v4 articles use live blocks without legacy rails', { skip: process.env.V4_DIST_VERIFY !== '1' && 'Run after Mac build with V4_DIST_VERIFY=1' }, () => {
  for (const slug of slugs) {
    const html = readFileSync(path.join('dist', 'posts', slug, 'index.html'), 'utf8');
    assert.equal((html.match(/class="toc-rail-wrap"/g) ?? []).length, 0, slug);
    assert.equal((html.match(/id="price-check"/g) ?? []).length, 1, slug);
    assert.equal((html.match(/class="price-record"/g) ?? []).length, 0, slug);
    assert.doesNotMatch(html, /deal-context-sale-windows:start/, slug);
    assert.match(html, /"FAQPage"/, slug);
    assert.match(html, /data-cheaper-table|Similar products we track/, slug);
  }
});
