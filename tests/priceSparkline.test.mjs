import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { sparklineGeom } from '../src/lib/priceSparkline.mjs';
test('requires five checks across fourteen days and two prices', () => {
  const rows = [0, 4, 8, 12, 16].map((d, i) => ({ date: `2026-11-${String(d + 1).padStart(2, '0')}`, sale: i === 2 ? 40 : 50, source: 'auto_check' }));
  assert.equal(sparklineGeom(rows.slice(0, 4)), null);
  assert.deepEqual(sparklineGeom(rows), sparklineGeom(rows));
  assert.match(sparklineGeom(rows).path, /^M/);
});
