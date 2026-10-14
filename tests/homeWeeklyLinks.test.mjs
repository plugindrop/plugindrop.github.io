import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { weeklyPriceFacts } from '../src/lib/priceTrends.mjs';
import { isProductNameIndexable } from '../src/lib/indexPolicy.mjs';

test('built home links only indexable weekly low products from current data', { skip: !process.env.T9_BUILD_DIR }, () => {
  const data = JSON.parse(fs.readFileSync('src/data/price_history.json', 'utf8'));
  const html = fs.readFileSync(path.join(process.env.T9_BUILD_DIR, 'index.html'), 'utf8');
  for (const item of weeklyPriceFacts(data).newLows) {
    const href = `/plugin-prices/${item.slug}/`;
    assert.equal(html.includes(`href="${href}"`), isProductNameIndexable(data, item.name), item.name);
  }
});
