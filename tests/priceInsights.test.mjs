import assert from 'node:assert/strict';
import test from 'node:test';
import priceData from '../src/data/price_history.json' with { type: 'json' };
import { dealScoreNumeric } from '../src/lib/priceUtils.ts';
import { buildAuditIndex, comparableHistory, lowestSeen, pbPathOf, sourceKindOf } from '../src/lib/priceBasis.mjs';
import { isPricePageIndexable, priceSubstance, saleEpisodeCount, ownTrackingDays } from '../src/lib/indexPolicy.mjs';
import { buildPageFacts, buildDecisionAnswers, buildResearchNote, buildCoverageLine, summarizeVerdict, trackedSales, observedSaleBreaks, archivedPrices, confirmedArchiveSales, validUntil } from '../src/lib/priceInsights.mjs';

const row = (date, regular, sale, source = 'auto_check', extras = {}) => ({ date, regular, sale, source, ...extras });
const entry = (history, extras = {}) => ({ pb_url: '/product/test', typical_regular: 100, typical_sale: 50, all_time_low: 40, history, ...extras });
const facts = (history, extras = {}) => buildPageFacts(entry(history, extras), { buildDate: '2026-09-26' });
const answers = (f) => buildDecisionAnswers('Test', f, 'Available.');

test('basis classifies only reviewed evidence and uses evidence date and price', () => {
  assert.equal(pbPathOf('https://www.pluginboutique.com/product/test/?x=1'), '/product/test');
  assert.equal(pbPathOf('/product/test/?x=1'), '/product/test');
  const item = { pb_path: '/product/test', research_date: '2023-11-20', research_source: 'research_bf2023', reviewed: true,
    status: 'confirmed', evidence: [{ snapshot_date: '2023-11-29', snapshot_url: 'https://web.archive.org/example', price: 20 }] };
  const research = row('2023-11-20', 100, 1, 'research_bf2023');
  const product = entry([research, row('2026-01-01', 100, 60), row('2026-03-01', 100, 40)]);
  const index = buildAuditIndex({ items: [item] });
  assert.equal(sourceKindOf(research, '/product/test', index), 'archive_confirmed');
  assert.deepEqual(comparableHistory(product, index)[0], { date: '2023-11-29', regular: 100, sale: 20, source: 'wayback_confirmed' });
  assert.deepEqual(lowestSeen(product, index), { price: 20, date: '2023-11-29', kind: 'archive_confirmed' });
  assert.equal(isPricePageIndexable(product), false);
  assert.deepEqual(confirmedArchiveSales(product, index), [{ date: '2023-11-29', price: 20, url: 'https://web.archive.org/example' }]);
  for (const change of [{ ...item, reviewed: false }, { ...item, status: 'no_sale_seen' }, { ...item, evidence: [] }]) {
    const ignored = buildAuditIndex({ items: [change] });
    assert.equal(comparableHistory(product, ignored).some((r) => r.source === 'wayback_confirmed'), false);
  }
  const oneEpisode = entry([research, row('2026-01-01', 100, 60), row('2026-02-01', 100, null)]);
  assert.equal(priceSubstance({ ...oneEpisode, history: comparableHistory(oneEpisode) }).saleObservations, 1);
  assert.equal(priceSubstance({ ...oneEpisode, history: comparableHistory(oneEpisode, index) }).saleObservations, 2);
  const saturn = entry([
    row('2023-11-20', 179, 134, 'research_bf2023'),
    row('2026-01-01', 179, 99),
    row('2026-01-20', 179, null),
    row('2026-03-01', 179, null),
  ], { pb_url: '/product/2-Effects/30-Distortion/6423-FabFilter-Saturn-2', typical_sale: 99, all_time_low: 59 });
  assert.equal(isPricePageIndexable({ ...saturn, history: saturn.history.slice(1) }), false);
  assert.equal(isPricePageIndexable(saturn), true);
});

test('empty audit index keeps the expected 76 pages and exact 15 removals', () => {
  const all = [...Object.entries(priceData.plugins ?? {}), ...Object.entries(priceData.bundles ?? {})];
  const prior = (e) => {
    const s = priceSubstance(e);
    return !e.pb_url?.includes('/search?') && s.observations >= 3 && s.saleObservations >= 1
      && s.priceLevels >= 2 && saleEpisodeCount(e) >= 2 && ownTrackingDays(e) >= 45
      && (e.all_time_low == null || e.typical_sale == null || e.all_time_low <= e.typical_sale);
  };
  const empty = (e) => {
    const comparable = { ...e, history: comparableHistory(e, new Map()) };
    const s = priceSubstance(comparable);
    return !e.pb_url?.includes('/search?') && s.observations >= 3 && s.saleObservations >= 1
      && s.priceLevels >= 2 && saleEpisodeCount(comparable) >= 2 && ownTrackingDays(e) >= 45
      && (e.all_time_low == null || e.typical_sale == null || e.all_time_low <= e.typical_sale);
  };
  assert.equal(all.filter(([, e]) => prior(e)).length, 91);
  assert.equal(all.filter(([, e]) => empty(e)).length, 76);
  assert.deepEqual(all.filter(([, e]) => prior(e) && !empty(e)).map(([n]) => n).sort(), [
    'Arturia Augmented STRINGS', 'FabFilter Pro-G', 'FabFilter Pro-L 2', 'FabFilter Pro-MB',
    'FabFilter Pro-Q 4', 'FabFilter Saturn 2', 'FabFilter Timeless 3', 'FabFilter Twin 3',
    'FabFilter Total Bundle', 'Kilohearts Phase Plant', 'Soundtoys Decapitator',
    'u-he Bazille', 'u-he Hive 2', 'u-he Repro', 'u-he Satin',
  ].sort());
  assert.equal(all.filter(([, e]) => isPricePageIndexable(e)).length, 80);
});

test('priced checks, sale breaks, archive levels, and until date', () => {
  const f = facts([row('2026-01-01', 100, 50), row('2026-01-03', 100, 40), row('2026-01-04', 100, null),
    row('2026-02-01', 100, 30), row('2026-02-02', 100, null),
    row('2020-01-01', 99.99, null, 'wayback'), row('2020-02-01', 98.61, null, 'wayback')]);
  assert.deepEqual(f.sales.map(({ low, days, leftCensored }) => [low, days, leftCensored]), [[40, 3, true], [30, 1, false]]);
  assert.deepEqual(f.breaks, [29]);
  assert.equal(f.archive.count, 1);
  assert.deepEqual(f.archive.excluded, [{ date: '2020-02-01', value: 98.61 }]);
  assert.equal(validUntil({ until: '2026-09-25' }, '2026-09-26'), null);
  assert.equal(validUntil({ until: '2026-09-26' }, '2026-09-26'), '2026-09-26');
});

test('exact decision text for each state', () => {
  const current = facts([row('2026-09-26', 100, 40, 'auto_check', { reg_src: 'page', until: '2026-10-01' })]);
  assert.deepEqual(answers(current), [
    { key: 'compare', q: "How does today's $40 compare with past prices for Test?", a: 'Plugin Boutique listed Test at $40 (60% off $100) on 2026-09-26. This is the first sale our checks have caught.' },
    { key: 'end', q: 'When does the current Test sale end?', a: 'The store page said the offer runs until 2026-10-01 when we checked on 2026-09-26. This sale first appeared in that check.' },
    { key: 'availability', q: 'Is Test available on Plugin Boutique?', a: 'Available.' },
  ]);
  assert.equal(summarizeVerdict('Test', current), '$40 on 2026-09-26; the first sale our checks have caught.');
  assert.equal(buildCoverageLine(current), 'This record: 1 price check, on 2026-09-26. Sales before 2026-09-26 would not appear here.');
  const noSale = facts([row('2026-09-26', 100, null, 'auto_check', { reg_src: 'typical' })]);
  assert.deepEqual(answers(noSale), [
    { key: 'sale', q: 'Does Test go on sale at Plugin Boutique?', a: 'Not in our checks so far: our one price check, on 2026-09-26, did not show a sale price. Our check on 2026-09-26 found no sale price; our reference list price is $100.' },
    { key: 'availability', q: 'Is Test available on Plugin Boutique?', a: 'Available.' },
  ]);
  assert.equal(summarizeVerdict('Test', noSale), 'No sale price in 1 price check since 2026-09-26.');
  const noChecks = facts([row('2026-09-26', null, null)]);
  assert.deepEqual(answers(noChecks), [{ key: 'availability', q: 'Is Test available on Plugin Boutique?', a: 'Available.' }]);
  assert.equal(buildCoverageLine(noChecks), null);
  assert.equal(summarizeVerdict('Test', noChecks), 'We have not read a price for Test from the store page yet.');
  const list = facts([row('2026-01-01', 100, 50), row('2026-09-26', 100, null, 'auto_check', { reg_src: 'page' })]);
  assert.deepEqual(answers(list), [
    { key: 'discount', q: 'How much cheaper does Test get on sale?', a: 'Plugin Boutique showed Test at its $100 list price in our check on 2026-09-26. The one sale we tracked at Plugin Boutique went to $50, $50 less (50% off).' },
    { key: 'last', q: 'When was Test last on sale?', a: 'Our checks last found it on sale on 2026-01-01. The one price check since then, on 2026-09-26, did not show a sale price.' },
    { key: 'availability', q: 'Is Test available on Plugin Boutique?', a: 'Available.' },
  ]);
  assert.equal(summarizeVerdict('Test', list), 'The one sale we tracked went to $50; last seen on sale 2026-01-01.');
});

test('research note has months and kinds, never research amounts', () => {
  const f = facts([row('2023-11-20', 100, 1, 'research_bf2023'), row('2024-11-20', 100, 2, 'plugindeals.net_thomann'),
    row('2025-11-20', 100, 3, 'research_musicradar_bf2025'), row('2026-09-26', 100, null)]);
  assert.equal(buildResearchNote('Test', f), "Our research notes also mention sales of Test in Nov 2023, Nov 2024 and Nov 2025. Some are estimates from a brand-wide discount, not observed prices. Some come from third-party sale reports. Some are prices at other stores. They are not prices we saw on Plugin Boutique's pages, so none of the comparisons on this page use them.");
});

test('all products ignore unconfirmed research price mutations', () => {
  const all = [...Object.values(priceData.plugins ?? {}), ...Object.values(priceData.bundles ?? {})];
  assert.equal(all.length, 615);
  for (const product of all) {
    const before = buildPageFacts(product, { buildDate: priceData.last_updated });
    const changed = structuredClone(product);
    changed.all_time_low = 0.01;
    changed.history = changed.history.map((r) => {
      const kind = sourceKindOf(r, pbPathOf(changed.pb_url));
      return ['research_estimate', 'research_report', 'research_other_store', 'research_contradicted'].includes(kind)
        ? { ...r, sale: 0.01, regular: 0.01 } : r;
    });
    changed.history.push(row('2019-11-29', 999, 1, 'research_bf2019'), row('2020-11-27', 999, 1, 'plugindeals.net_thomann'));
    const after = buildPageFacts(changed, { buildDate: priceData.last_updated });
    assert.deepEqual(dealScoreNumeric(changed), dealScoreNumeric(product));
    assert.deepEqual(lowestSeen(changed), lowestSeen(product));
    assert.equal(isPricePageIndexable({ ...changed, all_time_low: product.all_time_low }), isPricePageIndexable(product));
    assert.deepEqual(answers(after), answers(before));
    assert.equal(summarizeVerdict('Test', after), summarizeVerdict('Test', before));
    assert.equal(buildCoverageLine(after), buildCoverageLine(before));
    assert.doesNotMatch(buildResearchNote('Test', after) ?? '', /\$0\.01|\$1\b/);
  }
});

test('every product decision stays dated, countable, and free of predictions', () => {
  const all = [...Object.entries(priceData.plugins ?? {}), ...Object.entries(priceData.bundles ?? {})];
  const prediction = /\b(expect|likely|due|next sale|usually|typically|every (?:January|February|March|April|May|June|July|August|September|October|November|December))\b/i;
  for (const [name, product] of all) {
    const f = buildPageFacts(product, { buildDate: priceData.last_updated });
    const stateAnswers = buildDecisionAnswers(name, f, 'Available.').filter((a) => a.key !== 'availability');
    for (const { a } of stateAnswers) {
      assert.match(a, /\d{4}-\d{2}-\d{2}|\b\d+\s+(?:price checks?|sales?|pages?|days?|snapshots?)\b/, name);
      assert.doesNotMatch(a, prediction, name);
      assert.doesNotMatch(a, /\b(good|great|worth|cheap|best)\b/i, name);
      assert.doesNotMatch(a, /\b(1 days|1 checks|1 pages)\b|between (\$[\d.]+) and \1\b/, name);
      assert.doesNotMatch(a, /\b(?:\w+ \d{4}) to \1\b/, name);
    }
    if (f.state === 'list' && f.latestPriced.reg_src === 'typical')
      assert.match(stateAnswers[0].a, /our reference list price is/, name);
  }
});

test('comparison branches cover earlier lows, gaps, archive counts and unreadable checks', () => {
  const r = (date, sale, extras = {}) => row(date, 100, sale, 'auto_check', extras);
  const saleDates = [
    ['2026-01-01', 50], ['2026-01-02', null],
    ['2026-02-01', 50], ['2026-02-02', null],
    ['2026-03-01', 50], ['2026-03-02', null],
  ];
  for (const [price, phrase] of [[40, 'That is $10 below the lowest of the 3 earlier sales we tracked ($50).'],
    [50, 'All 3 earlier sales we tracked also went to $50.'],
    [60, 'That is $10 above the lowest of the 3 earlier sales we tracked ($50, first seen 2026-03-01).']]) {
    const f = facts([...saleDates.map(([d, p]) => r(d, p)), r('2026-09-26', price)]);
    assert.ok(answers(f)[0].a.includes(phrase));
    assert.equal(f.breaks.length, 3);
  }
  const ties = facts([r('2026-01-01', 50), r('2026-01-02', null), r('2026-02-01', 60), r('2026-02-02', null), r('2026-09-26', 50)]);
  assert.match(answers(ties)[0].a, /That matches the lowest of the 2 earlier sales we tracked\./);
  const archive = [
    row('2020-01-01', 129, null, 'wayback'), row('2020-02-01', 119, null, 'wayback'),
    row('2020-03-01', 109, null, 'wayback'), row('2020-04-01', 99, null, 'wayback'),
    row('2020-05-01', 89, null, 'wayback'), row('2020-06-01', 88.61, null, 'wayback'),
  ];
  const f = facts([...archive, r('2026-09-26', 100), row('2026-09-27', null, null)]);
  assert.match(answers(f)[0].a, /and 1 higher price/);
  assert.equal(f.unreadableAfter, true);
  assert.match(answers(f)[0].a, /Our checks after 2026-09-26 \(up to 2026-09-27\)/);
  assert.equal(f.archive.levels.length, 5);
  assert.equal(f.archive.excluded.length, 1);
  assert.match(buildCoverageLine(f), /plus 5 archived Plugin Boutique pages from Jan 2020 to May 2020/);
});

test('on-sale earlier-sale wording matches every comparison branch', () => {
  const base = facts([row('2026-09-26', 100, 40)]);
  const ep = (start, low) => ({ start, end: start, days: 1, low, regular: 100, depthPct: 50, leftCensored: false });
  const prefix = 'Plugin Boutique listed Test at $40 (60% below our reference list price of $100) on 2026-09-26. ';
  const cases = [
    { lows: [50], result: 'That is $10 below the one earlier sale we tracked ($50).' },
    { lows: [50, 60], result: 'That is $10 below the lowest of the 2 earlier sales we tracked ($50).' },
    { lows: [40], result: 'The one earlier sale we tracked also went to $40.' },
    { lows: [40, 40], result: 'Both earlier sales we tracked also went to $40.' },
    { lows: [40, 40, 40], result: 'All 3 earlier sales we tracked also went to $40.' },
    { lows: [40, 50], result: 'That matches the lowest of the 2 earlier sales we tracked.' },
    { lows: [30], result: 'That is $10 above the one earlier sale we tracked ($30, first seen 2026-01-01).' },
    { lows: [30, 35], result: 'That is $10 above the lowest of the 2 earlier sales we tracked ($30, first seen 2026-01-01).' },
  ];
  for (const { lows, result } of cases) {
    const prior = lows.map((low, i) => ep(`2026-0${i + 1}-01`, low));
    const f = { ...base, sales: [...prior, ep('2026-09-26', 40)] };
    assert.equal(answers(f)[0].a, prefix + result);
  }
});

test('sale end and break wording covers end dates, censoring, equal and varied durations', () => {
  const r = row('2026-09-26', 100, 40);
  const base = facts([r]);
  const current = { start: '2026-09-01', end: '2026-09-26', days: 26, low: 40, leftCensored: false };
  const e = (start, days, leftCensored = false) => ({ start, end: start, days, low: 50, leftCensored });
  const question = 'When does the current Test sale end?';
  const withSales = (prior, cur = current, until = null, breaks = []) => ({ ...base, sales: [...prior, cur], until, breaks });
  assert.equal(answers(withSales([], { ...current, start: '2026-09-26' }, null))[1].a,
    'We have no end date from the store page for this sale. This sale first appeared in our check on 2026-09-26.');
  assert.equal(answers(withSales([], { ...current, start: '2026-09-26' }, '2026-10-01'))[1].a,
    'The store page said the offer runs until 2026-10-01 when we checked on 2026-09-26. This sale first appeared in that check.');
  assert.equal(answers(withSales([e('2026-01-01', 1)], { ...current, leftCensored: true }))[1].a,
    'We have no end date from the store page for this sale. Every price check since our tracking began on 2026-09-01 has shown it on sale. The one earlier sale we could follow from start to finish was visible for 1 day (2026-01-01).');
  assert.equal(answers(withSales([e('2026-01-01', 2), e('2026-02-01', 2)]))[1].a,
    'We have no end date from the store page for this sale. Every price check since 2026-09-01 has shown it on sale. The 2 earlier sales we could follow from start to finish were each visible for 2 days.');
  assert.equal(answers(withSales([e('2026-01-01', 2), e('2026-02-01', 3)]))[1].a,
    'We have no end date from the store page for this sale. Every price check since 2026-09-01 has shown it on sale. The 2 earlier sales we could follow from start to finish were visible for 2 and 3 days.');
  assert.equal(answers(withSales([e('2026-01-01', 2, true)]))[1].a,
    'We have no end date from the store page for this sale. Every price check since 2026-09-01 has shown it on sale.');
  const oneBreak = answers(withSales([e('2026-01-01', 2)], current, null, [19]))[2];
  assert.deepEqual(oneBreak, { key: 'breaks', q: 'How soon did Test go back on sale in the past?',
    a: 'Counting from the last check that showed an earlier sale, our checks next found it on sale 19 days later.' });
  assert.equal(answers(withSales([e('2026-01-01', 2)], current, null, [10, 20]))[2].a,
    'Counting from the last check that showed an earlier sale, our checks next found it on sale 10 and 20 days later.');
  assert.equal(answers(withSales([e('2026-01-01', 2)], current, null, [10, 20, 30, 40, 50]))[2].a,
    'Counting from the last check that showed an earlier sale, our checks next found it on sale 10 to 50 days later.');
  assert.equal(answers(withSales([], current))[1].q, question);
});

test('archive and confirmed sale sentence branches are exact', () => {
  const base = facts([row('2026-09-26', 100, 40)]);
  const a = (prices) => ({ first: '2020-01-01', last: prices.length === 1 ? '2020-01-01' : '2020-02-01', count: prices.length,
    excluded: [], levels: prices.map((price) => ({ price, count: 1, first: '2020-01-01', last: '2020-02-01' })) });
  const lead = 'Plugin Boutique listed Test at $40 (60% below our reference list price of $100) on 2026-09-26. This is the first sale our checks have caught. ';
  assert.equal(answers({ ...base, archive: a([30]) })[0].a,
    lead + "An archived Plugin Boutique page from Jan 2020 showed $30. That is $10 below today's price.");
  assert.equal(answers({ ...base, archive: a([50]) })[0].a,
    lead + "An archived Plugin Boutique page from Jan 2020 showed $50. That was not below today's $40.");
  assert.equal(answers({ ...base, archive: a([50, 30]) })[0].a,
    lead + "Archived Plugin Boutique pages from Jan 2020 to Feb 2020 showed $50 (1 page) and $30 (1 page). The lowest of those, $30, is $10 below today's price.");
  assert.equal(answers({ ...base, archive: a([60, 50]) })[0].a,
    lead + "Archived Plugin Boutique pages from Jan 2020 to Feb 2020 showed $60 (1 page) and $50 (1 page). None was below today's $40.");
  const confirmed = [{ date: '2020-02-01', price: 20, url: 'https://example.test/1' }, { date: '2020-01-01', price: 25, url: 'https://example.test/2' }];
  assert.equal(answers({ ...base, confirmed: confirmed.slice(0, 1) })[0].a,
    lead + 'An archived Plugin Boutique page also showed a sale price of $20 (2020-02-01).');
  assert.equal(answers({ ...base, confirmed })[0].a,
    lead + 'Archived Plugin Boutique pages also showed sale prices of $20 (2020-02-01) and $25 (2020-01-01).');
});

test('list price and last-sale wording covers sale counts, ranges, checks and breaks', () => {
  const base = facts([row('2026-01-01', 100, 50), row('2026-09-26', 100, null, 'auto_check', { reg_src: 'page' })]);
  const s = (low, start, end = start) => ({ start, end, days: 1, low, regular: 100, depthPct: 50, leftCensored: false });
  const set = (sales, breaks = [], checks = base.checks) => ({ ...base, sales, breaks, checks });
  assert.equal(answers(set([s(50, '2026-01-01'), s(50, '2026-02-01')]))[0].a,
    'Plugin Boutique showed Test at its $100 list price in our check on 2026-09-26. Both sales we tracked at Plugin Boutique went to $50, $50 less (50% off).');
  assert.equal(answers(set([s(50, '2026-01-01'), s(50, '2026-02-01'), s(50, '2026-03-01')]))[0].a,
    'Plugin Boutique showed Test at its $100 list price in our check on 2026-09-26. All 3 sales we tracked at Plugin Boutique went to $50, $50 less (50% off).');
  assert.equal(answers(set([s(40, '2026-01-01'), s(60, '2026-02-01')]))[0].a,
    'Plugin Boutique showed Test at its $100 list price in our check on 2026-09-26. The 2 sales we tracked at Plugin Boutique went to between $40 and $60, $40 to $60 less (40–60% off).');
  assert.equal(answers({ ...set([s(40, '2026-01-01'), s(60, '2026-02-01')]), basis: { value: 50, kind: 'page' } })[0].a,
    'Plugin Boutique showed Test at its $50 list price in our check on 2026-09-26. The 2 sales we tracked at Plugin Boutique went to between $40 and $60.');
  assert.equal(answers(set([s(50, '2026-01-01')], [10]))[1].a,
    'Our checks last found it on sale on 2026-01-01. The one price check since then, on 2026-09-26, did not show a sale price. That 268-day stretch is longer than the one break between sales we have observed (10 days).');
  assert.equal(answers(set([s(50, '2026-09-20')], [10]))[1].a,
    'Our checks last found it on sale on 2026-09-20. The one price check since then, on 2026-09-26, did not show a sale price. The one break between sales we have observed lasted 10 days.');
  const moreChecks = [row('2026-01-01', 100, 50), row('2026-05-01', 100, null), row('2026-09-26', 100, null)];
  assert.equal(answers(set([s(50, '2026-01-01')], [10, 20], moreChecks))[1].a,
    'Our checks last found it on sale on 2026-01-01. None of the 2 price checks since then, up to 2026-09-26, showed a sale price. That 268-day stretch is longer than any break between sales we have observed (10 and 20 days).');
  assert.equal(summarizeVerdict('Test', set([s(40, '2026-01-01'), s(60, '2026-02-01')])),
    '2 sales we tracked went to $40–$60; last seen on sale 2026-02-01.');
});

test('no-tracked-sale wording includes confirmed archive evidence without research prices', () => {
  const base = facts([row('2026-09-26', 100, null, 'auto_check', { reg_src: 'page' })]);
  const confirmed = [{ date: '2020-01-01', price: 30, url: 'https://example.test' }];
  assert.equal(answers({ ...base, confirmed })[0].a,
    'Not in our checks so far: our one price check, on 2026-09-26, did not show a sale price. An archived Plugin Boutique page did show a sale price of $30 (2020-01-01). Plugin Boutique showed Test at its $100 list price in our check on 2026-09-26.');
  const more = { ...base, checks: [row('2026-01-01', 100, null), row('2026-09-26', 100, null)], confirmed: [...confirmed, { date: '2019-01-01', price: 40, url: 'https://example.test/2' }] };
  assert.equal(answers(more)[0].a,
    'Not in our checks so far: none of our 2 price checks since 2026-01-01 showed a sale price. Archived Plugin Boutique pages did show sale prices of $30 (2020-01-01) and $40 (2019-01-01). Plugin Boutique showed Test at its $100 list price in our check on 2026-09-26.');
});

test('verdict and coverage branches use exact wording', () => {
  const current = facts([row('2026-09-26', 100, 40)]);
  const ep = (low, start) => ({ low, start, end: start, days: 1, leftCensored: false });
  for (const [lows, expected] of [
    [[50], '$40 on 2026-09-26; $10 below the one earlier sale we tracked ($50).'],
    [[40], '$40 on 2026-09-26; the same as the one earlier sale we tracked.'],
    [[30], '$40 on 2026-09-26; $10 above the one earlier sale we tracked ($30).'],
    [[50, 60], '$40 on 2026-09-26; $10 below the lowest of the 2 earlier sales we tracked ($50).'],
    [[40, 50], '$40 on 2026-09-26; the same as the lowest of the 2 earlier sales we tracked.'],
    [[30, 50], '$40 on 2026-09-26; $10 above the lowest of the 2 earlier sales we tracked ($30).'],
  ]) {
    const sales = [...lows.map((low, i) => ep(low, `2026-0${i + 1}-01`)), ep(40, '2026-09-26')];
    assert.equal(summarizeVerdict('Test', { ...current, sales }), expected);
  }
  const archive = { first: '2020-01-01', last: '2020-01-01', count: 1, excluded: [], levels: [{ price: 50, count: 1, first: '2020-01-01', last: '2020-01-01' }] };
  assert.equal(buildCoverageLine({ ...current, archive }),
    'This record: 1 price check, on 2026-09-26, plus 1 archived Plugin Boutique page from Jan 2020. Sales between archived pages would not appear here.');
  assert.equal(buildResearchNote('Test', current), null);
});

test('five-level archive and five-value ranges have exact text', () => {
  const f = facts([row('2026-09-26', 100, 40)]);
  const levels = [129, 119, 109, 99, 89].map((price) => ({ price, count: 1, first: '2020-01-01', last: '2020-02-01' }));
  const archive = { first: '2020-01-01', last: '2020-02-01', count: 5, excluded: [{ date: '2020-03-01', value: 88.61 }], levels };
  assert.equal(answers({ ...f, archive })[0].a,
    "Plugin Boutique listed Test at $40 (60% below our reference list price of $100) on 2026-09-26. This is the first sale our checks have caught. Archived Plugin Boutique pages from Jan 2020 to Feb 2020 showed $119 (1 page), $109 (1 page), $99 (1 page), $89 (1 page) and 1 higher price. None was below today's $40.");
  const onSale = { ...f, breaks: [10, 20, 30, 40, 50] };
  assert.equal(answers(onSale)[2].a,
    'Counting from the last check that showed an earlier sale, our checks next found it on sale 10 to 50 days later.');
});
