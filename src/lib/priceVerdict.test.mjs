import test from 'node:test';
import assert from 'node:assert/strict';
import { priceVerdict } from './priceVerdict.mjs';
import { buildPageFacts } from './priceInsights.mjs';
import { lowestSeen } from './priceBasis.mjs';

const BUILD = '2026-11-17';
const row = (date, regular, sale = null, extra = {}) => ({ date, regular, sale, source: 'auto_check',
  store: 'plugin_boutique', reg_src: 'page', cur: 'USD', ...extra });
const verdict = (history, opts = {}) => {
  const entry = { typical_regular: 100, history };
  return priceVerdict({ name: 'Plug', facts: buildPageFacts(entry, { buildDate: BUILD }), low: lowestSeen(entry),
    buildDate: BUILD, ...opts });
};
const BANNED = /\b(always|never fails|guarantee|definitely|certainly|invest)/i;

test('no reading and short record are said plainly', () => {
  assert.equal(verdict([]).key, 'no_reading');
  const short = verdict([row('2026-11-10', 100), row('2026-11-15', 100, 50)]);
  assert.equal(short.key, 'short_record');
  assert.match(short.text, /2 price checks \(2026-11-10 and 2026-11-15\)/);
  assert.match(short.text, /\$50 against a \$100 list price/);
  assert.doesNotMatch(short.text, /not enough data|insufficient data|too little data/i);
});

test('on sale at the recorded low, with and without an end date', () => {
  const base = [row('2026-10-01', 100), row('2026-10-02', 100, 50), row('2026-10-03', 100), row('2026-10-20', 100)];
  const withEnd = verdict([...base, row('2026-11-15', 100, 50, { until: '2026-11-30' })],
    { rank: { category: 'Synth', peers: 20, deeper: 0, depth: 50 } });
  assert.equal(withEnd.key, 'low_with_end');
  assert.match(withEnd.text, /^\$50 matches the lowest price we have recorded for Plug, and the store listed this offer until 2026-11-30\./);
  assert.match(withEnd.text, /No product among the 20 Synth products we track has a deeper recorded cut than its 50%\./);
  const noEnd = verdict([...base, row('2026-11-15', 100, 50)], { rank: { category: 'Synth', peers: 20, deeper: 1, depth: 50 } });
  assert.equal(noEnd.key, 'low_no_end');
  assert.match(noEnd.text, /since 2026-11-15/);
  assert.match(noEnd.text, /1 of the 20 Synth products we track has had/);
});

test('first sale ever is called out', () => {
  const v = verdict([row('2026-10-01', 100), row('2026-10-10', 100), row('2026-11-15', 100, 60, { until: '2026-11-20' })]);
  assert.equal(v.key, 'first_sale');
  assert.match(v.text, /before 2026-11-15, so today's \$60 is also the lowest we have recorded; the store listed the offer until 2026-11-20\./);
});

test('on sale above the recorded low: near vs above depends on banner label', () => {
  const h = [row('2026-10-01', 100), row('2026-10-02', 100, 40), row('2026-10-05', 100), row('2026-11-15', 100, 50, { until: '2026-11-30' })];
  const near = verdict(h, { label: 'BUY NOW' });
  assert.equal(near.key, 'near_low');
  assert.match(near.text, /At \$50, Plug is \$10 above the lowest price we recorded \(\$40 on 2026-10-02\), a gap of 10% of its \$100 list price\./);
  const above = verdict(h, { label: 'FAIR SALE' });
  assert.equal(above.key, 'above_low');
  assert.match(above.text, /\$40 on 2026-10-02, \$10 less\. This offer was listed until 2026-11-30/);
});

test('stale readings ask for confirmation instead of a call', () => {
  const sale = verdict([row('2026-09-01', 100), row('2026-09-02', 100, 50), row('2026-09-20', 100, 50)]);
  assert.equal(sale.key, 'stale_sale');
  assert.match(sale.text, /on 2026-09-20, had Plug on sale at \$50, the lowest price we have recorded/);
  const list = verdict([row('2026-09-01', 100), row('2026-09-02', 100, 50), row('2026-09-20', 100)]);
  assert.equal(list.key, 'stale_list');
  assert.match(list.text, /18 days after its last tracked sale ended \(2026-09-02\)/);
});

test('list price branches use gaps between sales', () => {
  const single = verdict([row('2026-10-01', 100), row('2026-10-02', 100, 50), row('2026-11-10', 100), row('2026-11-15', 100)]);
  assert.equal(single.key, 'list_single');
  assert.match(single.text, /The lowest price we recorded is \$50, \$50 under today's \$100\./);
  const two = [row('2026-10-01', 100, 70), row('2026-10-05', 100), row('2026-10-11', 100, 60), row('2026-10-12', 100)];
  const within = verdict([...two, row('2026-10-14', 100)], { buildDate: '2026-10-15' });
  assert.equal(within.key, 'list_within_gap');
  assert.match(within.text, /3 days after its last sale ended on 2026-10-11; past gaps between sales we observed ran 10 days/);
  const beyond = verdict([...two, row('2026-11-15', 100)]);
  assert.equal(beyond.key, 'list_beyond_gap');
  assert.match(beyond.text, /has gone 35 days without a sale since 2026-10-11, longer than any gap between sales we have observed \(10 days\)/);
});

test('never on sale, with and without an archived lower price', () => {
  const h = [row('2026-11-01', 100), row('2026-11-08', 100), row('2026-11-15', 100)];
  const plain = verdict(h);
  assert.equal(plain.key, 'never_on_sale');
  assert.match(plain.text, /None of our 3 price checks since 2026-11-01 caught Plug below \$100/);
  const archived = priceVerdict({ name: 'Plug', facts: buildPageFacts({ history: h }, { buildDate: BUILD }),
    low: { price: 70, date: '2025-03-03' }, buildDate: BUILD });
  assert.equal(archived.key, 'never_on_sale_archive');
  assert.match(archived.text, /\$70 from an archived store page dated 2025-03-03/);
});

test('disagreeing shown price yields no numeric call', () => {
  const v = verdict([row('2026-11-01', 100), row('2026-11-08', 100), row('2026-11-15', 100)], { shownPrice: 120 });
  assert.equal(v.key, 'unsettled');
  assert.doesNotMatch(v.text, /\$/);
});

test('no verdict uses absolute or investment language', () => {
  const samples = [verdict([]), verdict([row('2026-11-15', 100)]),
    verdict([row('2026-10-01', 100), row('2026-10-10', 100), row('2026-11-15', 100, 60)])];
  for (const v of samples) assert.doesNotMatch(v.text, BANNED);
});
