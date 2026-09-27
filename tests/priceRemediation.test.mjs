import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPrice } from '../src/lib/priceUtils.ts';
import { buildPageFacts, buildDecisionAnswers } from '../src/lib/priceInsights.mjs';

test('formatPrice rounds cents and strips zero cents', () => {
  assert.equal(formatPrice(null), '—');
  assert.equal(formatPrice(12), '$12');
  assert.equal(formatPrice(12.345), '$12.35');
  assert.equal(formatPrice(12.5), '$12.50');
  assert.equal(formatPrice(12.999), '$13');
});
test('decision block uses dated checks and preserves the availability answer', () => {
  const entry = { pb_url: '/product/test', history: [
    { date: '2026-01-01', regular: 100, sale: 50, source: 'auto_check' },
    { date: '2026-01-20', regular: 100, sale: null, source: 'auto_check' },
  ] };
  const facts = buildPageFacts(entry, { buildDate: '2026-01-20' });
  assert.deepEqual(buildDecisionAnswers('Test', facts, 'Available.').map(({ key, q }) => [key, q]), [
    ['discount', 'How much cheaper does Test get on sale?'],
    ['last', 'When was Test last on sale?'],
    ['availability', 'Is Test available on Plugin Boutique?'],
  ]);
  assert.equal(buildDecisionAnswers('Test', facts, 'Available.').at(-1).a, 'Available.');
});
