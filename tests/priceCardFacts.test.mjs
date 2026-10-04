import assert from 'node:assert/strict';
import test from 'node:test';
import { lowestPriceAttribution } from '../src/lib/priceCardFacts.mjs';
import { isPostDealEnded } from '../src/lib/articleDeal.mjs';

test('retailer research low names the store and month', () => {
  assert.equal(lowestPriceAttribution({ all_time_low: 105, history: [
    { date: '2025-11-22', sale: 105, source: 'research_bf2025_gear4music' },
  ] }), 'Gear4Music, Nov 2025; research price');
  assert.equal(lowestPriceAttribution({ all_time_low: 134, history: [
    { date: '2024-11-22', sale: 134, source: 'research_bf2024' },
  ] }), null);
});

test('list surfaces hide a sale ended by the latest trusted tracker check', () => {
  const post = { data: { title: 'Analog Monosynth Collection', priceTrack: ['Analog Monosynth Collection'],
    dealPrice: '$149', saleExpiry: '2026-10-20', pubDate: '2026-09-01' } };
  const entries = { 'Analog Monosynth Collection': { history: [
    { date: '2026-10-03', regular: 299, sale: null, source: 'auto_check' },
  ] } };
  assert.equal(isPostDealEnded(post, entries, Date.parse('2026-10-04T12:00:00Z')), true);
});
