import test from 'node:test';
import assert from 'node:assert/strict';
import { bfPhase, pickBfCards } from './bfWindow.mjs';

test('bfPhase follows the JST window', () => {
  assert.equal(bfPhase(Date.parse('2026-11-26T14:59:00Z')), null);
  assert.equal(bfPhase(Date.parse('2026-11-26T15:00:00Z')), 'bf');
  assert.equal(bfPhase(Date.parse('2026-11-29T14:59:00Z')), 'bf');
  assert.equal(bfPhase(Date.parse('2026-11-29T15:00:00Z')), 'cm');
  assert.equal(bfPhase(Date.parse('2026-12-02T14:59:00Z')), 'cm');
  assert.equal(bfPhase(Date.parse('2026-12-02T15:00:00Z')), null);
});

test('pickBfCards keeps real discounts on price pages, soonest first', () => {
  const c = (key, off, until, href = '/plugin-prices/x/', aboveUsual = false) => ({ key, off, until, href, aboveUsual });
  const out = pickBfCards([c('a', 30, '2026-12-05'), c('b', 50, '2026-12-01'), c('c', 60, '2026-12-01'), c('d', 70, '2026-11-30', '/posts/x/'), c('e', 80, '2026-11-30', '/plugin-prices/e/', true), c('f', 20, null)]);
  assert.deepEqual(out.map(x => x.key), ['c', 'b', 'a']);
});
