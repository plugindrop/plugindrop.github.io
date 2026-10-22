import assert from 'node:assert/strict';
import test from 'node:test';
import { priceStatTiles } from '../src/lib/priceStats.mjs';

const row = (date, sale, regular = 100, reg_src = 'page') => ({ date, sale, regular, reg_src, source: 'auto_check' });
test('price tiles use observed checks and hide usual sale until two earlier episodes', () => {
  const one = { history: [row('2026-07-01', 40), row('2026-07-03', null), row('2026-10-01', 30)] };
  const tiles = priceStatTiles(one, Date.parse('2026-10-01'));
  assert.equal(tiles.length, 3);
  assert.match(tiles[1].note, /since Jul 2026 · 3 checks/);
  const two = { history: [row('2026-07-01', 40), row('2026-07-03', null), row('2026-08-01', 60), row('2026-08-03', null), row('2026-10-01', 30)] };
  assert.equal(priceStatTiles(two, Date.parse('2026-10-01')).at(-1).value, '$50');
});
test('regular tile prefers product page list price', () => {
  const entry = { history: [row('2026-09-01', null, 120, 'reference'), row('2026-10-01', 40, 100, 'page')] };
  assert.equal(priceStatTiles(entry, Date.parse('2026-10-01')).find(tile => tile.label === 'Regular (list)').value, '$100');
});
