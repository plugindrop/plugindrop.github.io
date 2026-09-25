import assert from 'node:assert/strict';
import test from 'node:test';

import {
  productNameOf,
  findTrackerEntryForPost,
  trustedHistory,
  dealState,
  everydayPrice,
  buildFactBox,
  ctaHref,
  ctaLabel,
  ctaShortLabel,
} from '../src/lib/articleDeal.mjs';

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

function post(overrides = {}) {
  return {
    id: 'test-post',
    data: {
      title: 'Test Post',
      priceTrack: [],
      affiliate: 'https://www.pluginboutique.com/search?q=fallback',
      ...overrides,
    },
  };
}

// --- productNameOf ---

test('productNameOf: strips leading "N% Off" and trailing em-dash subtitle + price', () => {
  assert.equal(
    productNameOf(post({ title: '78% Off AMBER 2 — Chord-Based Guitar Tracks Fast ($29)' })),
    'AMBER 2',
  );
});

test('productNameOf: strips leading "N% Off" with no subtitle', () => {
  assert.equal(productNameOf(post({ title: '54% Off JD 800' })), 'JD 800');
});

test('productNameOf: strips trailing hyphen-dash subtitle when no discount prefix', () => {
  assert.equal(
    productNameOf(post({ title: 'Future Mainstage Bass — Bass Samples for Producers' })),
    'Future Mainstage Bass',
  );
});

test('productNameOf: leaves a title with no matching pattern unchanged', () => {
  assert.equal(
    productNameOf(post({ title: 'Cheapest Way to Get Serum 2 in 2026' })),
    'Cheapest Way to Get Serum 2 in 2026',
  );
});

test('productNameOf: empty title -> null', () => {
  assert.equal(productNameOf(post({ title: '' })), null);
});

// --- findTrackerEntryForPost ---

test('findTrackerEntryForPost: priceTrack[0] exact key match wins first', () => {
  const entries = {
    'Amber 2': entry(),
    'Some Other Name': entry(),
  };
  const p = post({ title: 'Unrelated Title', priceTrack: ['Amber 2'] });
  const match = findTrackerEntryForPost(p, entries, '');
  assert.equal(match.name, 'Amber 2');
});

test('findTrackerEntryForPost: exact title-slug match, never partial', () => {
  const entries = {
    'SOLID 2': entry(),
    'SOLID 2 Expansion': entry(),
  };
  const p = post({ title: 'SOLID 2' });
  const match = findTrackerEntryForPost(p, entries, '');
  assert.equal(match.name, 'SOLID 2');
});

test('findTrackerEntryForPost: no exact slug match -> falls through to body PB id', () => {
  const entries = {
    'Zenology Pro': entry({ pb_url: '/product/instruments/synth/42317-zenology-pro' }),
  };
  const p = post({ title: 'Cheapest Way to Get a Rompler in 2026' });
  const rawBody = 'Check it out: https://www.pluginboutique.com/product/instruments/synth/42317-zenology-pro';
  const match = findTrackerEntryForPost(p, entries, rawBody);
  assert.equal(match.name, 'Zenology Pro');
});

test('findTrackerEntryForPost: ambiguous body id across 2+ entries narrows by name, else null', () => {
  const entries = {
    'Widget A Turbo': entry({ pb_url: '/product/x/10000-widget-a-turbo' }),
    'Widget B Turbo': entry({ pb_url: '/product/x/10000-widget-b-turbo' }),
  };
  const rawBody = 'https://www.pluginboutique.com/product/x/10000-widget-a-turbo';

  const ambiguousTitlePost = post({ title: 'Totally Unrelated Headline' });
  const narrowed = findTrackerEntryForPost(ambiguousTitlePost, entries, rawBody);
  assert.equal(narrowed, null);

  // "Widget A - ..." -> productNameOf strips to "Widget A", which is a
  // substring of "Widget A Turbo"'s slug but not an exact match at step 2,
  // so this exercises the step-3 narrow-by-name path specifically.
  const namedPost = post({ title: 'Widget A - Some Long Review Title' });
  const match = findTrackerEntryForPost(namedPost, entries, rawBody);
  assert.equal(match.name, 'Widget A Turbo');
});

test('findTrackerEntryForPost: nothing matches -> null', () => {
  const entries = { 'Something Else': entry() };
  const p = post({ title: 'Totally Unrelated Headline' });
  assert.equal(findTrackerEntryForPost(p, entries, ''), null);
});

// --- trustedHistory ---

test('trustedHistory: keeps auto_check/live_check/pb_deals_poll, drops research/wayback/pb_crawl/deal_intake', () => {
  const e = entry({
    history: [
      auto('2026-09-01', 99, 49),
      { date: '2026-09-05', regular: 99, sale: 39, source: 'live_check' },
      { date: '2026-09-08', regular: 99, sale: 45, source: 'pb_deals_poll' },
      { date: '2026-09-10', regular: 99, sale: 20, source: 'research' },
      { date: '2026-09-11', regular: 99, sale: 20, source: 'wayback' },
      { date: '2026-09-12', regular: 99, sale: 20, source: 'pb_crawl' },
      { date: '2026-09-13', regular: 99, sale: 20, source: 'deal_intake' },
    ],
  });
  const trusted = trustedHistory(e);
  assert.equal(trusted.length, 3);
  assert.deepEqual(trusted.map((h) => h.source), ['auto_check', 'live_check', 'pb_deals_poll']);
});

test('trustedHistory: sorted ascending by date regardless of input order', () => {
  const e = entry({ history: [auto('2026-09-10', 99, 49), auto('2026-09-01', 99, 59)] });
  const trusted = trustedHistory(e);
  assert.deepEqual(trusted.map((h) => h.date), ['2026-09-01', '2026-09-10']);
});

// --- dealState ---

test('dealState: ended when latest auto_check/live_check shows no sale within 7 days', () => {
  const e = entry({ history: [auto('2026-09-01', 99, 49), auto('2026-09-24', 99, null)] });
  assert.equal(dealState(e, NOW), 'ended');
});

test('dealState: ended when latest check has sale >= regular within 7 days', () => {
  const e = entry({ history: [auto('2026-09-24', 99, 99)] });
  assert.equal(dealState(e, NOW), 'ended');
});

test('dealState: live when latest trusted observation is a real discount within 7 days', () => {
  const e = entry({ history: [auto('2026-09-22', 99, 49)] });
  assert.equal(dealState(e, NOW), 'live');
});

test('dealState: pb_deals_poll miss does not mark ended (only auto_check/live_check can)', () => {
  const e = entry({
    history: [{ date: '2026-09-24', regular: 99, sale: null, source: 'pb_deals_poll' }],
  });
  assert.equal(dealState(e, NOW), 'unknown');
});

test('dealState: stale observation (>7 days) -> unknown', () => {
  const e = entry({ history: [auto('2026-09-01', 99, 49)] });
  assert.equal(dealState(e, NOW), 'unknown');
});

test('dealState: no history at all -> unknown', () => {
  assert.equal(dealState(entry({ history: [] }), NOW), 'unknown');
});

// --- everydayPrice ---

test('everydayPrice: 5+ observations, ~same price, spanning 30+ days -> non-null', () => {
  const e = entry({
    history: [
      auto('2026-07-01', 49, null),
      auto('2026-07-20', 49, null),
      auto('2026-08-10', 49, null),
      auto('2026-09-01', 49, null),
      auto('2026-09-20', 49, null),
    ],
  });
  const result = everydayPrice(e, NOW);
  assert.ok(result);
  assert.equal(result.since, '2026-07-01');
  assert.equal(result.count, 5);
});

test('everydayPrice: fewer than 5 observations -> null', () => {
  const e = entry({
    history: [auto('2026-07-01', 49, null), auto('2026-09-20', 49, null)],
  });
  assert.equal(everydayPrice(e, NOW), null);
});

test('everydayPrice: span under 30 days -> null even with enough observations', () => {
  const e = entry({
    history: [
      auto('2026-09-01', 49, null),
      auto('2026-09-05', 49, null),
      auto('2026-09-10', 49, null),
      auto('2026-09-15', 49, null),
      auto('2026-09-20', 49, null),
    ],
  });
  assert.equal(everydayPrice(e, NOW), null);
});

test('everydayPrice: price actually varies -> null', () => {
  const e = entry({
    history: [
      auto('2026-07-01', 99, 49),
      auto('2026-07-20', 99, 79),
      auto('2026-08-10', 99, 29),
      auto('2026-09-01', 99, 99),
      auto('2026-09-20', 99, 49),
    ],
  });
  assert.equal(everydayPrice(e, NOW), null);
});

// --- buildFactBox ---

test('buildFactBox: no trusted history at all -> null', () => {
  const e = entry({ history: [{ date: '2026-09-01', regular: 99, sale: 20, source: 'research' }] });
  assert.equal(buildFactBox(e, NOW), null);
});

test('buildFactBox: computes lowest/typicalSale from trusted observations only', () => {
  const e = entry({
    history: [
      auto('2026-08-01', 99, 59),
      auto('2026-08-15', 99, 49),
      auto('2026-09-01', 99, 39),
      { date: '2026-09-10', regular: 99, sale: 5, source: 'research' },
      auto('2026-09-22', 99, 49),
    ],
  });
  const fact = buildFactBox(e, NOW);
  assert.ok(fact);
  assert.equal(fact.lowest, 39);
  assert.equal(fact.typicalSale, 49);
  assert.equal(fact.observations, 4);
  assert.equal(fact.current, 49);
  assert.equal(fact.state, 'live');
});

test('buildFactBox: fewer than 3 trusted sale observations -> typicalSale is null', () => {
  const e = entry({ history: [auto('2026-09-01', 99, 59), auto('2026-09-22', 99, 49)] });
  const fact = buildFactBox(e, NOW);
  assert.equal(fact.typicalSale, null);
  assert.equal(fact.lowest, 49);
});

test('buildFactBox: AMBER 2-style contradiction — latest check shows sale ended', () => {
  const e = entry({
    history: [auto('2026-09-01', 29, 19), auto('2026-09-23', 29, 29)],
  });
  const fact = buildFactBox(e, NOW);
  assert.equal(fact.state, 'ended');
  assert.equal(fact.current, 29);
});

// --- ctaHref ---

test('ctaHref: uses matched entry pb_url with chan/data1/utm params, data1 placed early', () => {
  const p = post();
  const match = { name: 'Amber 2', entry: entry({ pb_url: '/product/instruments/x/10000-amber-2' }) };
  const href = ctaHref(p, match, '', 'amber-2-slug');
  assert.ok(href.startsWith('https://www.pluginboutique.com/product/instruments/x/10000-amber-2'));
  assert.match(href, /chan=art&data1=amber-2-slug&/);
  assert.match(href, /utm_source=plugindrop/);
  assert.match(href, /utm_medium=article-cta/);
  assert.match(href, /utm_campaign=amber-2-slug/);
});

test('ctaHref: never uses a search URL from the matched entry', () => {
  const p = post({ affiliate: 'https://www.pluginboutique.com/search?q=fallback-aff' });
  const match = { name: 'X', entry: entry({ pb_url: '/search?q=x' }) };
  const href = ctaHref(p, match, '', 'slug');
  assert.equal(href, p.data.affiliate);
});

test('ctaHref: falls back to a PB product link found in the raw body', () => {
  const p = post({ affiliate: 'https://example.com/fallback' });
  const rawBody = 'Buy it here: https://www.pluginboutique.com/product/x/99999-thing and more text';
  const href = ctaHref(p, null, rawBody, 'slug');
  assert.equal(href, 'https://www.pluginboutique.com/product/x/99999-thing');
});

test('ctaHref: falls back to frontmatter affiliate (may be a search URL) when nothing else matches', () => {
  const p = post({ affiliate: 'https://www.pluginboutique.com/search?q=zombie' });
  const href = ctaHref(p, null, '', 'slug');
  assert.equal(href, p.data.affiliate);
});

test('ctaHref: non-PB stores (ADSR/PluginFox) keep their existing affiliate link unchanged', () => {
  const p = post({ affiliate: 'https://www.adsrsounds.com/product/sample-pack/foo?aff=123' });
  const href = ctaHref(p, null, '', 'slug');
  assert.equal(href, p.data.affiliate);
});

// --- ctaLabel / ctaShortLabel: never a store name ---

const STORE_NAMES = ['Plugin Boutique', 'PluginBoutique', 'ADSR', 'PluginFox'];

function assertNoStoreName(text) {
  for (const store of STORE_NAMES) {
    assert.ok(!text.includes(store), `label "${text}" must not mention store name "${store}"`);
  }
}

test('ctaLabel: free branch', () => {
  const label = ctaLabel({ productName: 'AMBER 2', priceText: '$0', isFree: true, state: 'live' });
  assert.equal(label, 'Get AMBER 2 free →');
  assertNoStoreName(label);
});

test('ctaLabel: ended state branch', () => {
  const label = ctaLabel({ productName: 'AMBER 2', priceText: '$29', isFree: false, state: 'ended' });
  assert.equal(label, "Check AMBER 2's current price →");
  assertNoStoreName(label);
});

test('ctaLabel: priceText present branch', () => {
  const label = ctaLabel({ productName: 'AMBER 2', priceText: '$29', isFree: false, state: 'live' });
  assert.equal(label, 'Get AMBER 2 for $29 →');
  assertNoStoreName(label);
});

test('ctaLabel: no price text -> generic "See X"', () => {
  const label = ctaLabel({ productName: 'AMBER 2', priceText: null, isFree: false, state: 'unknown' });
  assert.equal(label, 'See AMBER 2 →');
  assertNoStoreName(label);
});

test('ctaLabel: null productName substitutes "it"', () => {
  const label = ctaLabel({ productName: null, priceText: '$29', isFree: false, state: 'live' });
  assert.equal(label, 'Get it for $29 →');
});

test('ctaLabel: truncates a long product name at a word boundary', () => {
  const longName = 'This Is A Very Long Product Name That Exceeds Forty Characters Definitely';
  const label = ctaLabel({ productName: longName, priceText: '$29', isFree: false, state: 'live' });
  const subject = label.replace('Get ', '').replace(' for $29 →', '');
  assert.ok(subject.length <= 40);
  assert.ok(!subject.endsWith(' '));
});

test('ctaShortLabel: short variants, never a store name', () => {
  assert.equal(ctaShortLabel({ priceText: '$29', isFree: true, state: 'live' }), 'Get free');
  assert.equal(ctaShortLabel({ priceText: '$29', isFree: false, state: 'ended' }), 'Check price');
  assert.equal(ctaShortLabel({ priceText: '$29', isFree: false, state: 'live' }), 'Get for $29');
  assert.equal(ctaShortLabel({ priceText: null, isFree: false, state: 'unknown' }), 'See deal');
});
