import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brandTrends, saleCalendar, sourceKind, weeklyPriceFacts, productsOf } from '../src/lib/priceTrends.mjs';

const data = { plugins: {
  'FabFilter A': { history: [
    { date: '2026-07-01', regular: 100, sale: 50, source: 'auto_check', store: 'plugin_boutique' },
    { date: '2026-07-02', regular: 100, sale: 70, source: 'auto_check', store: 'plugin_boutique' },
    { date: '2026-07-03', regular: 100, sale: null, source: 'auto_check', store: 'plugin_boutique' },
    { date: '2024-11-01', regular: 100, sale: 10, source: 'wayback', store: 'vendor' },
    { date: '2025-11-01', regular: 100, sale: 20, source: 'research_bf2025', store: 'vendor' },
  ] },
  'Arturia B': { history: [{ date: '2026-07-01', regular: 100, sale: null, source: 'auto_check', store: 'plugin_boutique' }] },
} };

test('source classification keeps research and archives out of measured figures', () => {
  assert.equal(sourceKind('research_bf2025'), 'estimated');
  assert.equal(sourceKind('wayback'), 'archived');
  assert.equal(sourceKind('auto_check'), 'measured');
  const fab = brandTrends(data).find(x => x.brand === 'FabFilter');
  assert.equal(fab.measured.checks, 3);
  assert.equal(fab.measured.sales, 1);
  assert.equal(fab.measured.maxDiscount, 50);
  assert.equal(fab.measured.medianDiscount, 40);
  assert.equal(fab.measured.lastSale, '2026-07-02');
  assert.equal(fab.estimated.sales, 1);
  assert.equal(fab.archived.sales, 1);
  assert.deepEqual(fab.measured.stores, ['Plugin Boutique']);
});

test('too few measured checks means insufficient data', () => {
  assert.equal(brandTrends(data).find(x => x.brand === 'Arturia').insufficient, true);
});

test('calendar counts measured sales by month, not research', () => {
  const months = saleCalendar(data);
  assert.equal(months.find(x => x.month === '2026-07').sales, 2);
  assert.equal(months.some(x => x.month === '2025-11'), false);
});

test('consecutive sale checks count as one episode and research never contributes', () => {
  const fab = brandTrends(data).find(x => x.brand === 'FabFilter');
  assert.equal(fab.measured.sales, 1);
  assert.equal(fab.estimated.checks, 1);
});

test('weekly changes use the history date and count transitions per product', () => {
  const facts = weeklyPriceFacts(data, new Date('2026-07-03T00:00:00Z'));
  assert.equal(facts.newSales, 1);
  assert.equal(facts.endedSales, 1);
});

test('a sale above an earlier regular price is not a new observed low', () => {
  const history = [
    { date: '2026-07-01', regular: 50, sale: null, source: 'auto_check' },
    { date: '2026-07-02', regular: 100, sale: 80, source: 'auto_check' },
    { date: '2026-07-03', regular: 100, sale: 60, source: 'auto_check' },
  ];
  assert.deepEqual(weeklyPriceFacts({ plugins: { 'FabFilter C': { history } } }, new Date('2026-07-03T00:00:00Z')).newLows, []);
});

test('missing categories are inferred and do not accumulate as Other', () => {
  const categories = productsOf(data).map(product => product.category);
  assert.equal(categories.includes('Other'), false);
});
