import test from 'node:test';
import assert from 'node:assert/strict';
import { measuredPriceChecks, saleShare, episodeRows, saleGaps, maxRecordedDepth, categoryDepthRank, freshness, distanceFromLow } from '../src/lib/pricePageEvidence.mjs';

const row = (date, sale = null, regular = 100, extra = {}) => ({ date, sale, regular, reg_src: 'page', source: 'auto_check', ...extra });
const entry = (history) => ({ history });

test('measured checks reject other sources, stores, currencies and typical regular; prefer same-day sale', () => {
  const checks = measuredPriceChecks(entry([
    row('2026-11-01', null, 100), row('2026-11-01', 50),
    row('2026-11-02', null, 100, { source: 'wayback' }),
    row('2026-11-03', null, 100, { store: 'other' }),
    row('2026-11-04', null, 100, { cur: 'EUR' }),
    row('2026-11-05', null, 100, { reg_src: 'typical' }),
  ]));
  assert.deepEqual(checks.map((r) => [r.date, r.sale]), [['2026-11-01', 50]]);
});

test('sale share needs eight check days and reports levels', () => {
  assert.equal(saleShare(entry(Array.from({ length: 7 }, (_, i) => row(`2026-11-0${i + 1}`, 50)))), null);
  const share = saleShare(entry(Array.from({ length: 8 }, (_, i) => row(`2026-11-0${i + 1}`, i < 6 ? 50 : null))));
  assert.equal(share.saleDays, 6);
  assert.equal(share.totalDays, 8);
  assert.equal(share.everyCheck, false);
  assert.deepEqual(share.levels, [{ price: 50, days: 6 }, { price: 100, days: 2 }]);
});

test('episodes, gaps and depth preserve measured sale boundaries', () => {
  const e = entry([row('2026-11-01', 50), row('2026-11-02'), row('2026-11-05', 40), row('2026-11-06')]);
  const episodes = episodeRows(e);
  assert.equal(episodes.length, 2);
  assert.equal(episodes[0].depth, 60);
  assert.equal(episodes[0].daysSincePrevious, 4);
  assert.equal(maxRecordedDepth(e), 60);
  assert.deepEqual(saleGaps({ state: 'list', breaks: [4], sales: [{ end: '2026-11-05' }], latestPriced: { date: '2026-11-06' } }, '2026-11-10'), { gaps: [4], sinceLastSale: 1, lastSaleEnd: '2026-11-05' });
  assert.equal(saleGaps({ state: 'on_sale', breaks: [] }, '2026-11-10'), null);
});

test('category rank needs five peers and excludes equal depth', () => {
  const own = entry([row('2026-11-01', 50)]);
  const peers = Array.from({ length: 5 }, (_, i) => ({ name: `P${i}`, kind: 'plugin', entry: entry([row('2026-11-01', i === 0 ? 50 : 40)]) }));
  assert.equal(categoryDepthRank('P0', own, peers.slice(0, 4)), null);
  const rank = categoryDepthRank('P0', own, peers);
  assert.equal(rank.peers, 5);
  assert.equal(rank.deeper, 4);
});

test('freshness is inclusive at seven days and low distance requires fresh check', () => {
  const e = entry([row('2026-11-01', 50), row('2026-11-03', 60)]);
  assert.equal(freshness(e, '2026-11-10').fresh, true);
  assert.equal(freshness(e, '2026-11-11').fresh, false);
  assert.equal(distanceFromLow(e, '2026-11-11'), null);
  assert.equal(distanceFromLow(e, '2026-11-10').diff, 10);
});
