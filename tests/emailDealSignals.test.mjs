import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEmailDealSignals } from '../src/lib/emailDealSignals.mjs';

test('exports only the card copy and signals supplied by the home model', () => {
  const pool = [{ name: 'Waves API 2500', entry: { pb_url: 'https://www.pluginboutique.com/product/1' } }];
  const card = { brand: 'Waves', product: 'API 2500', category: 'Compressor', copyLine: { text: 'Sourced line', kind: 'tagline' }, current: 29.99, regular: 149, off: 80, until: null, urgency: null, rarity: null, chips: [], aboveUsual: true, image: { src: '/images/a.jpg' } };
  const data = { last_updated: '2026-10-23', bundles: {}, plugins: { 'Waves API 2500': {} } };
  const result = buildEmailDealSignals(pool, [card], data, '2026-10-28T00:00:00Z');
  assert.equal(result.deals['Waves API 2500'].copyLine.text, 'Sourced line');
  assert.equal(result.deals['Waves API 2500'].off, 80);
  assert.equal(result.deals['Waves API 2500'].aboveUsual, true);
  assert.equal(result.deals['Waves API 2500'].pbUrl, pool[0].entry.pb_url);
});

test('rejected copy remains absent', () => {
  const result = buildEmailDealSignals([{ name: 'Rejected', entry: {} }], [{ copyLine: null }], { bundles: {}, plugins: {} }, '2026-10-28T00:00:00Z');
  assert.equal(result.deals.Rejected.copyLine, null);
});
