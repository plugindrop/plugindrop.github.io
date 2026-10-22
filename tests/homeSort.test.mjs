import test from 'node:test';
import assert from 'node:assert/strict';
import { sortGridCards, gridOrderAttrs } from '../src/lib/homeSort.mjs';

const cards = [
  { key: 'a', off: 40, until: null, current: 30, rarity: null, score: 10 },
  { key: 'b', off: 60, until: '2026-11-02', current: 20, rarity: { type: 'new-low' }, score: 20 },
  { key: 'c', off: 60, until: '2026-10-28', current: 20, rarity: null, score: 30 },
  { key: 'd', off: 10, until: '2026-10-28', current: 5, rarity: { type: 'new-low' }, score: 5 },
];

test('all grid sort keys have deterministic order and missing dates end last', () => {
  assert.deepEqual(sortGridCards(cards, 'off').map(c => c.key), ['c', 'b', 'a', 'd']);
  assert.deepEqual(sortGridCards(cards, 'until').map(c => c.key), ['c', 'd', 'b', 'a']);
  assert.deepEqual(sortGridCards(cards, 'price').map(c => c.key), ['d', 'c', 'b', 'a']);
  assert.deepEqual(sortGridCards(cards, 'low').map(c => c.key), ['b', 'd', 'c', 'a']);
  assert.deepEqual(cards.map(c => c.key), ['a', 'b', 'c', 'd']);
});

test('rank attributes include every card and each rank is unique', () => {
  const attrs = gridOrderAttrs(cards);
  for (const key of ['off', 'until', 'price', 'low']) {
    assert.deepEqual(Object.values(attrs).map(v => v[key]).sort((a, b) => a - b), [0, 1, 2, 3]);
  }
});
