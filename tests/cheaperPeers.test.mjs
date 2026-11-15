import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { cheaperPeers } from '../src/lib/priceInsights.mjs';
test('keeps only cheaper indexable category peers in price order', () => {
  const entry = (price) => ({ history: [
    { date: '2026-08-01', sale: price + 5, regular: 100, source: 'auto_check' },
    { date: '2026-09-01', sale: null, regular: 100, source: 'auto_check' },
    { date: '2026-11-15', sale: price, regular: 100, source: 'auto_check' },
  ], pb_url: 'https://www.pluginboutique.com/product/1-Effects/2-Test/123-test' });
  const peers = cheaperPeers(entry(80), 'Self', [{ name: 'Self', entry: entry(80) }, { name: 'B', entry: entry(30) }, { name: 'A', entry: entry(20) }], () => 'effect');
  assert.deepEqual(peers?.map(p => p.name), ['A', 'B']);
  assert.equal(cheaperPeers(entry(80), 'Self', [{ name: 'A', entry: entry(20) }], () => 'effect'), null);
});
