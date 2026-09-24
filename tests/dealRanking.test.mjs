import assert from 'node:assert/strict';
import test from 'node:test';

import {
  pbProductId,
  recentDropOf,
  saleRunDays,
  diversityKey,
  rankScore,
  rankLiveDeals,
  dedupeAndDiversify,
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
  // Dedup keeps whichever the score/off/name ordering sorts first; both
  // candidates are identical except name, so the alphabetical tiebreak
  // decides. Either survivor is a real product name, not a dangling id.
  assert.equal(ranked[0].name, 'Platinum');
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
