import assert from 'node:assert/strict';
import test from 'node:test';
import { findTrackerEntryForPost } from '../src/lib/articleDeal.mjs';

import {
  pbProductId,
  recentDropOf,
  saleRunDays,
  diversityKey,
  rankScore,
  rankLiveDeals,
  rankBiggestDiscounts,
  buildRailSections,
  dedupeAndDiversify,
  articleRankScore,
} from '../src/lib/dealRanking.mjs';

const NOW = new Date('2026-09-25T00:00:00Z').getTime();

function entry(overrides = {}) {
  return {
    pb_url: '/product/effects-processors/eq/10000-test-plugin',
    typical_regular: 99,
    typical_sale: 49,
    all_time_low: 39,
    history: [],
    ...overrides,
  };
}

function auto(date, regular, sale) {
  return { date, regular, sale, source: 'auto_check' };
}

test('recentDropOf: prior higher observation, dropped 3 days ago -> non-null', () => {
  const e = entry({
    history: [auto('2026-09-01', 99, 99), auto('2026-09-22', 99, 49)],
  });
  const drop = recentDropOf(e, NOW);
  assert.ok(drop);
  assert.equal(drop.since, '2026-09-22');
  assert.equal(drop.prevPrice, 99);
  assert.equal(drop.current, 49);
});

test('recentDropOf: first-ever observation already on sale -> null', () => {
  const e = entry({ history: [auto('2026-09-22', 99, 49)] });
  assert.equal(recentDropOf(e, NOW), null);
});

test('recentDropOf: dropped 8 days ago -> null (outside 7-day window)', () => {
  const e = entry({
    history: [auto('2026-09-01', 99, 99), auto('2026-09-17', 99, 49)],
  });
  assert.equal(recentDropOf(e, NOW), null);
});

test('recentDropOf: ignores non-auto_check observations', () => {
  const e = entry({
    history: [auto('2026-09-01', 99, 99), { date: '2026-09-24', regular: 99, sale: 29, source: 'research' }],
  });
  assert.equal(recentDropOf(e, NOW), null);
});

test('saleRunDays: measures the current low-price run, including all-time runs', () => {
  const dropped3d = entry({ history: [auto('2026-09-01', 99, 99), auto('2026-09-22', 99, 49)] });
  assert.equal(saleRunDays(dropped3d, NOW), 3);

  const alwaysLow = entry({ history: [auto('2026-08-01', 99, 49), auto('2026-09-20', 99, 49)] });
  assert.ok(saleRunDays(alwaysLow, NOW) >= 55);

  assert.equal(saleRunDays(entry({ history: [] }), NOW), 0);
});

test('pbProductId: extracts the numeric id from a product path', () => {
  assert.equal(pbProductId('/product/bundles/mixing-mastering/12542-waves-platinum-bundle'), '12542');
  assert.equal(pbProductId('/product/bundles/mixing-mastering/12542-platinum'), '12542');
});

test('pbProductId: falls back to the normalized, query-stripped URL when no id segment exists', () => {
  assert.equal(pbProductId('/search?q=zombie'), '/search');
  assert.equal(pbProductId(''), '');
});

test('rankLiveDeals: same PB id under two display names collapses to one entry', () => {
  const now = NOW;
  const entries = {
    'Waves Platinum Bundle': entry({
      pb_url: '/product/bundles/mixing-mastering/12542-waves-platinum-bundle',
      history: [auto('2026-09-01', 599, 599), auto('2026-09-24', 599, 299)],
    }),
    Platinum: entry({
      pb_url: '/product/bundles/mixing-mastering/12542-platinum',
      history: [auto('2026-09-01', 599, 599), auto('2026-09-24', 599, 299)],
    }),
  };
  const ranked = rankLiveDeals(entries, now);
  assert.equal(ranked.length, 1);
  // "Waves Platinum Bundle" scores higher than the bare "Platinum" alias
  // because detectBrand recognizes the "Waves" prefix (brand tier bonus) --
  // the recognizable name wins the dedup, which is the intended behavior.
  assert.equal(ranked[0].name, 'Waves Platinum Bundle');
});

test('detectBrand: recognizes SSL Native as Solid State Logic (via brands.mjs import)', async () => {
  const { detectBrand } = await import('../src/lib/brands.mjs');
  assert.equal(detectBrand('SSL Native X-Comp'), 'Solid State Logic');
  assert.equal(detectBrand('Platinum'), null);
});

test('rankLiveDeals: caps same-brand deals at perKeyCap (default 2)', () => {
  const now = NOW;
  const entries = {};
  ['FabFilter Pro-Q 4', 'FabFilter Pro-C 2', 'FabFilter Pro-L 2'].forEach((name, i) => {
    entries[name] = entry({
      pb_url: `/product/effects-processors/eq/${20000 + i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      history: [auto('2026-09-01', 179, 179), auto('2026-09-23', 179, 89)],
    });
  });
  const ranked = rankLiveDeals(entries, now);
  assert.equal(ranked.length, 2);
  assert.ok(ranked.every((d) => d.brand === 'FabFilter'));
});

test('rankLiveDeals: unbranded same-category/same-price series (SOLID/PHAT/HEAVY style) caps at 2', () => {
  const now = NOW;
  const entries = {};
  ['SOLID 2', 'PHAT 2', 'HEAVY 2'].forEach((name, i) => {
    entries[name] = entry({
      pb_url: `/product/instruments/synths/${30000 + i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      category: 'Synths',
      history: [auto('2026-09-01', 149, 149), auto('2026-09-23', 149, 39)],
    });
  });
  const ranked = rankLiveDeals(entries, now);
  assert.equal(ranked.length, 2);
});

test('rankLiveDeals: ordering is fully deterministic for a fixed now', () => {
  const now = NOW;
  const entries = {
    'Moog Mariana': entry({
      pb_url: '/product/instruments/synths/40001-moog-mariana',
      history: [auto('2026-09-01', 99, 99), auto('2026-09-23', 99, 39)],
    }),
    'TR-909': entry({
      pb_url: '/product/instruments/drums/40002-tr-909',
      history: [auto('2026-09-01', 99, 99), auto('2026-09-24', 99, 49)],
    }),
  };
  const first = rankLiveDeals(entries, now).map((d) => d.name);
  const second = rankLiveDeals(entries, now).map((d) => d.name);
  assert.deepEqual(first, second);
});

function liveEntry(id, regular, current, category = 'Effects') {
  return entry({
    pb_url: `/product/${category.toLowerCase()}/misc/${id}-test`,
    typical_regular: regular,
    typical_sale: current,
    category,
    history: [auto('2026-09-24', regular, current)],
  });
}

test('rankBiggestDiscounts: orders by discount, savings, then name', () => {
  const entries = {
    '50 Percent': liveEntry(60001, 100, 50),
    '70 Percent': liveEntry(60002, 100, 30),
    '90 Percent': liveEntry(60003, 100, 10),
    '70 Larger Saving': liveEntry(60004, 200, 60),
    '70 Same Saving B': liveEntry(60005, 200, 60),
  };
  assert.deepEqual(rankBiggestDiscounts(entries, NOW, { limit: 5, perKeyCap: 5 }).map(d => d.name), [
    '90 Percent', '70 Larger Saving', '70 Same Saving B', '70 Percent', '50 Percent',
  ]);
});

test('rankBiggestDiscounts: excludes PB IDs, small savings, and search URLs', () => {
  const entries = {
    Excluded: liveEntry(61001, 100, 1),
    Cheap: liveEntry(61002, 5, 1),
    Included: liveEntry(61003, 100, 30),
    Search: entry({ pb_url: '/search?q=test', history: [auto('2026-09-24', 100, 1)] }),
  };
  assert.deepEqual(rankBiggestDiscounts(entries, NOW, { excludeIds: new Set(['61001']) }).map(d => d.name), ['Included']);
});

test('rankBiggestDiscounts: excludes an article-matched tracker product by PB ID', () => {
  const entries = {
    'AMBER 2': liveEntry(61101, 100, 10),
    'Other Plugin': liveEntry(61102, 100, 30),
  };
  const post = { data: { title: 'AMBER 2 sale', priceTrack: ['AMBER 2'] } };
  const match = findTrackerEntryForPost(post, entries, 'AMBER 2 is on sale');
  assert.ok(match);
  const excludeIds = new Set([pbProductId(match.entry.pb_url)]);
  assert.ok(rankBiggestDiscounts(entries, NOW, { limit: 2 }).some(d => d.name === 'AMBER 2'));
  assert.ok(rankBiggestDiscounts(entries, NOW, { limit: 2, excludeIds }).every(d => d.name !== 'AMBER 2'));
});

test('rankBiggestDiscounts: caps same-category and price SOLID/PHAT/HEAVY series at one', () => {
  const entries = Object.fromEntries(['SOLID 2', 'PHAT 2', 'HEAVY 2'].map((name, i) => [
    name, liveEntry(62001 + i, 149, 39, 'Instruments'),
  ]));
  assert.equal(rankBiggestDiscounts(entries, NOW).length, 1);
});

test('rankBiggestDiscounts: fixed now gives a deterministic order', () => {
  const entries = {
    Alpha: liveEntry(63001, 100, 10),
    Beta: liveEntry(63002, 100, 20),
    Gamma: liveEntry(63003, 100, 30),
  };
  assert.deepEqual(rankBiggestDiscounts(entries, NOW), rankBiggestDiscounts(entries, NOW));
});

test('buildRailSections: biggest shares no PB ID with all ten recommended entries', () => {
  const entries = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [
    `Product ${i}`, liveEntry(64000 + i, 100 + i, 10 + i),
  ]));
  const { recommended, biggest } = buildRailSections(entries, NOW);
  assert.equal(recommended.length, 10);
  assert.equal(biggest.length, 3);
  const ids = new Set(recommended.map(d => pbProductId(d.entry.pb_url)));
  assert.ok(biggest.every(d => !ids.has(pbProductId(d.entry.pb_url))));
});

test('rankBiggestDiscounts: everyday price is attached for a long stable sale', () => {
  const e = liveEntry(65001, 149, 39);
  e.history = ['2026-08-01', '2026-08-10', '2026-08-20', '2026-09-05', '2026-09-24']
    .map(date => auto(date, 149, 39));
  const [deal] = rankBiggestDiscounts({ 'SOLID 2': e }, NOW);
  assert.deepEqual(deal.everyday, { since: '2026-08-01', count: 5 });
});

test('rankScore: fresh drop, brand tier, discount depth, and stale penalty combine as specified', () => {
  const base = { recentDrop: null, dropAgeDays: null, brand: null, off: 0, saleRunDays: 0 };
  assert.equal(rankScore(base), 0);
  assert.equal(
    rankScore({ ...base, recentDrop: { since: 'x', prevPrice: 1, current: 1 }, dropAgeDays: 1 }),
    40,
  );
  assert.equal(
    rankScore({ ...base, recentDrop: { since: 'x', prevPrice: 1, current: 1 }, dropAgeDays: 5 }),
    30,
  );
  assert.equal(rankScore({ ...base, brand: 'FabFilter' }), 20);
  assert.equal(rankScore({ ...base, brand: 'Softube' }), 12);
  assert.equal(rankScore({ ...base, off: 70 }), 25);
  assert.equal(rankScore({ ...base, off: 95 }), 25); // capped at 70% off
  assert.equal(rankScore({ ...base, saleRunDays: 31 }), -10);
  assert.equal(rankScore({ ...base, saleRunDays: 30 }), 0);
});

test('diversityKey: brand wins when detectable, else category+price pair', () => {
  const branded = entry({ pb_url: '/product/eq/1/10000-fabfilter-pro-q-4' });
  assert.equal(diversityKey('FabFilter Pro-Q 4', branded), 'brand:FabFilter');

  const unbranded = entry({
    pb_url: '/product/instruments/synths/30000-solid-2',
    typical_regular: 149,
    typical_sale: 39,
    history: [],
  });
  assert.equal(diversityKey('SOLID 2', unbranded), 'cat:instruments/synths|39|149');
});

test('dedupeAndDiversify: respects limit after capping', () => {
  const deals = [1, 2, 3, 4].map((i) => ({
    name: `Item ${i}`,
    entry: entry({ pb_url: `/product/misc/misc/${50000 + i}-item-${i}` }),
  }));
  const result = dedupeAndDiversify(deals, { limit: 2, perKeyCap: 10 });
  assert.equal(result.length, 2);
});

function post(overrides = {}) {
  return {
    id: 'test-post',
    data: {
      title: 'Test Plugin',
      score: 5,
      pubDate: new Date('2026-09-24T00:00:00Z'),
      priceTrack: [],
      ...overrides,
    },
  };
}

test('articleRankScore: falls back to score when rawScore is absent', () => {
  const p = post({ title: 'No Raw Score Product', score: 6, pubDate: new Date('2026-09-24T00:00:00Z') });
  assert.equal(articleRankScore(p, {}, NOW), 6);
});

test('articleRankScore: no matching tracker entry leaves the score unadjusted', () => {
  const p = post({ title: 'Totally Unknown Product', rawScore: 10, pubDate: new Date('2026-09-24T00:00:00Z') });
  assert.equal(articleRankScore(p, {}, NOW), 10);
});

test('articleRankScore: equal rawScore + same age bracket produce equal rank (caller must tiebreak by pubDate)', () => {
  const a = post({ title: 'A', rawScore: 8, pubDate: new Date('2026-09-23T00:00:00Z') });
  const b = post({ title: 'B', rawScore: 8, pubDate: new Date('2026-09-24T00:00:00Z') });
  assert.equal(articleRankScore(a, {}, NOW), articleRankScore(b, {}, NOW));
});

test('articleRankScore: excluded (null) when the tracker observed the sale ended within the last week', () => {
  const p = post({ title: 'Ended Sale Plugin', priceTrack: ['Ended Sale Plugin'], rawScore: 10 });
  const trackerEntries = {
    'Ended Sale Plugin': entry({ history: [auto('2026-09-01', 99, 49), auto('2026-09-23', 99, 99)] }),
  };
  assert.equal(articleRankScore(p, trackerEntries, NOW), null);
});

test('articleRankScore: excludes AMBER 2 by product-name slug when priceTrack is empty and sale ended', () => {
  const p = post({ title: '78% Off AMBER 2 — Chord-Based Guitar Tracks Fast ($29)', priceTrack: [], rawScore: 10 });
  const trackerEntries = {
    'AMBER 2': entry({ history: [auto('2026-09-20', 99, null)] }),
  };
  assert.equal(articleRankScore(p, trackerEntries, NOW), null);
});

test('articleRankScore: not excluded when the sale-ended observation is older than 7 days', () => {
  const p = post({ title: 'Old Ended Sale Plugin', priceTrack: ['Old Ended Sale Plugin'], rawScore: 10 });
  const trackerEntries = {
    'Old Ended Sale Plugin': entry({ history: [auto('2026-09-01', 99, 49), auto('2026-09-10', 99, 99)] }),
  };
  assert.equal(articleRankScore(p, trackerEntries, NOW), 10);
});

test('articleRankScore: applies live-drop and recent-drop boosts when the tracker confirms a fresh drop', () => {
  const p = post({ title: 'Boosted Plugin', priceTrack: ['Boosted Plugin'], rawScore: 10, pubDate: new Date('2026-09-24T00:00:00Z') });
  const trackerEntries = {
    'Boosted Plugin': entry({ history: [auto('2026-09-01', 99, 99), auto('2026-09-23', 99, 49)] }),
  };
  const score = articleRankScore(p, trackerEntries, NOW);
  assert.ok(Math.abs(score - 10 * 1.1 * 1.1) < 1e-9);
});

test('articleRankScore: matches via exact title-slug fallback when priceTrack is empty', () => {
  const p = post({ title: 'Slug Match Plugin', priceTrack: [], rawScore: 10, pubDate: new Date('2026-09-24T00:00:00Z') });
  const trackerEntries = {
    'Slug Match Plugin': entry({ history: [auto('2026-09-01', 99, 99), auto('2026-09-23', 99, 49)] }),
  };
  const score = articleRankScore(p, trackerEntries, NOW);
  assert.ok(Math.abs(score - 10 * 1.1 * 1.1) < 1e-9);
});
