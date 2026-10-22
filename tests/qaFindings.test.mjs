import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
test('rendered facts separate labels from values', () => {
  const html = source('../dist/plugin-prices/arturia-fx-collection-6-pro/index.html');
  for (const label of ['Formats', 'macOS', 'Windows']) assert.ok(html.includes(label + ':</strong> '));
});
test('alternatives affiliate channels follow page context', () => {
  for (const [folder, chan] of [['plugin-prices', 'trk'], ['posts', 'art']]) {
    let checked = 0;
    for (const name of readdirSync(new URL('../dist/' + folder + '/', import.meta.url))) {
      const file = new URL('../dist/' + folder + '/' + name + '/index.html', import.meta.url);
      if (!existsSync(file)) continue;
      const html = readFileSync(file, 'utf8');
      const rail = html.match(/<section[^>]*class="[^"]*alternatives-rail[^" ]*"[\s\S]*?<\/section>/)?.[0];
      if (!rail) continue;
      for (const anchor of rail.matchAll(/<a[^>]*class="card-cta"[^>]*href="([^"]+)/g)) {
        const url = new URL(anchor[1].replaceAll('&amp;', '&'));
        assert.equal(url.searchParams.get('chan'), chan);
        checked++;
      }
    }
    assert.ok(checked > 0, folder + ' has alternative links');
  }
});
test('home chips have counts and spotlight formats include source', () => {
  const html = source('../dist/index.html');
  assert.match(html, /category-tiles--chips[\s\S]*?<strong[^>]*>Synths \d+<\/strong>/);
  assert.match(html, /class="formats-line" title="https:\/\/[^"]+retrieved \d{4}-\d\d-\d\d/);
});
