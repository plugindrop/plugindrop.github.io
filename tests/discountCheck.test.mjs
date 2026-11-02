import test from 'node:test';
import assert from 'node:assert/strict';
import { BF_CHECK_ENABLED, bfCheck, discountCheck } from '../src/lib/discountCheck.mjs';
import { summarizeDiscountChecks } from '../scripts/discount_check_dryrun.mjs';

const buildDate = '2026-11-01';
const row = (date, sale = null, regular = 100, extra = {}) => ({ date, sale, regular, source: 'auto_check', store: 'plugin_boutique', cur: 'USD', reg_src: 'page', ...extra });
const entry = (history) => ({ history });
const base = (sale = 50, date = buildDate) => entry([
  ...['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06', '2026-10-13', '2026-10-20'].map((d) => row(d)),
  row(date, sale),
]);
const lines = (history) => discountCheck(entry(history), { buildDate })?.lines ?? [];

test('needs eight distinct dates over 28 days, a live sale and a current check', () => {
  const good = base().history;
  assert.ok(discountCheck(entry(good), { buildDate }));
  assert.equal(discountCheck(entry(good.slice(2)), { buildDate }), null);
  assert.equal(discountCheck(entry(good.map((r, i) => i < 2 ? { ...r, date: good[2].date } : r)), { buildDate }), null);
  assert.equal(discountCheck(base(50, '2026-10-25'), { buildDate })?.lines.length > 0, true);
  assert.equal(discountCheck(base(50, '2026-10-24'), { buildDate }), null);
  assert.equal(discountCheck(base(null), { buildDate }), null);
  assert.equal(discountCheck(base(), {}), null);
});

test('only own priced USD Plugin Boutique checks count; typical-only regular is excluded', () => {
  const history = base().history;
  for (const extra of [{ source: 'research' }, { store: 'other' }, { cur: 'EUR' }, { reg_src: 'typical' }, { date: '2026-99-99' }]) {
    const changed = [...history.slice(1), { ...history[0], ...extra }];
    assert.equal(discountCheck(entry(changed), { buildDate }), null, JSON.stringify(extra));
  }
  assert.ok(discountCheck(entry(history.map(({ store, cur, ...r }) => r)), { buildDate }));
});

test('L1 lower, tolerance and higher boundaries use completed episodes', () => {
  const prefix = base().history.slice(0, -1);
  const history = [...prefix, row('2026-10-21', 100), row('2026-10-22'), row(buildDate, 98)];
  assert.equal(lines(history).find((l) => l.key === 'L1')?.text, 'Same price as its last sale ($100, Oct 2026). Not a new low.');
  assert.match(lines([...history.slice(0, -1), row(buildDate, 97.99)]).find((l) => l.key === 'L1').text, /^Lowest price we've recorded:/);
  assert.match(lines([...history.slice(0, -1), row(buildDate, 102.01)]).find((l) => l.key === 'L1').text, /^\$2.01 above/);
  assert.equal(lines([...history.slice(0, -1), row(buildDate, 102)]).find((l) => l.key === 'L1')?.key, 'L1');
});

test('L2 checks window count, sale share, displayed discount gap and median', () => {
  const frequent = [...['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06', '2026-10-13', '2026-10-20'].map((d, i) => row(d, i < 4 ? 80 : null)), row(buildDate, 90)];
  assert.match(lines(frequent).find((l) => l.key === 'L2')?.text ?? '', /On sale in 4 of 8 checks/);
  assert.equal(lines(frequent.slice(1)).find((l) => l.key === 'L2'), undefined);
  const rare = frequent.map((r, i) => i < 1 ? { ...r, sale: 80 } : { ...r, sale: i === 8 ? 70 : null });
  assert.match(lines(rare).find((l) => l.key === 'L2')?.text ?? '', /Listed at \$100 in 7 of 8 checks/);
  const neither = rare.map((r, i) => i === 2 ? { ...r, sale: 80 } : r);
  assert.equal(lines(neither).find((l) => l.key === 'L2'), undefined);
  assert.equal(lines(frequent.map((r, i) => i === 8 ? { ...r, reg_src: 'typical' } : r)).find((l) => l.key === 'L2'), undefined);
  const gap9 = frequent.map((r, i) => i === 8 ? { ...r, sale: 81 } : r);
  assert.equal(lines(gap9).find((l) => l.key === 'L2'), undefined);
  assert.match(lines(frequent).find((l) => l.key === 'L2')?.text ?? '', /On sale in/);
});

test('L2 suspicious regular suppresses the line and reports a flag', () => {
  const history = [...base(50).history.slice(0, -1), row('2026-10-21', 60), row('2026-10-22'), row(buildDate, 50, 600)];
  const result = discountCheck(entry(history), { buildDate });
  assert.equal(result?.lines.some((l) => l.key === 'L2'), false);
  assert.ok(result?.flags.includes('list_price_needs_review'));
});

test('L3 reports a confirmed rise before the current sale', () => {
  const history = [...['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'].map((d) => row(d)),
    ...['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((d) => row(d, null, 120)), row(buildDate, 60, 120)];
  assert.equal(lines(history).find((l) => l.key === 'L3')?.text,
    'The list price rose from $100 to $120 on 2026-10-01, 31 days before this sale began.');
});

test('no supported lines returns null', () => {
  const history = [...base(50).history.slice(0, -1), row(buildDate, 50, 100, { reg_src: 'typical' })];
  assert.equal(discountCheck(entry(history), { buildDate }), null);
});

test('BF check stays disabled and gates baseline count, share and month', () => {
  const baseline = { n_baseline: 8, dominant_store_share: 0.9, baseline_median: 80, baseline_low: { price: 60, date: '2026-09-01' } };
  assert.equal(BF_CHECK_ENABLED, false);
  assert.equal(bfCheck(base(50), baseline, { buildDate }), null);
  assert.equal(bfCheck(base(50), { ...baseline, n_baseline: 7 }, { buildDate, enabled: true }), null);
  assert.equal(bfCheck(base(50), { ...baseline, dominant_store_share: 0.89 }, { buildDate, enabled: true }), null);
  assert.equal(bfCheck(base(50), baseline, { buildDate: '2026-12-01', enabled: true }), null);
  assert.equal(bfCheck(base(50), baseline, { buildDate, enabled: true }),
    'Black Friday check: $50 against a Jul–Oct median of $80 and low of $60 (2026-09-01), from 8 checks frozen on 2026-11-02.');
});

test('dry run detects identical complete blocks across products', () => {
  const data = { last_updated: '2026-11-01', plugins: { Alpha: base(50), Beta: base(50), Gamma: base(40) } };
  const report = summarizeDiscountChecks(data, buildDate);
  assert.equal(report.productsChecked, 3);
  assert.equal(report.blocksShown, 3);
  assert.deepEqual(report.duplicateBlocks, [['Alpha', 'Beta']]);
  assert.equal(report.uniqueBlocks, false);
  assert.equal(report.lineCounts.L2, 3);
});
