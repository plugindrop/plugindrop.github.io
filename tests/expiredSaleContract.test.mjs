import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lintContent } from '../scripts/quarantine_content.mjs';

test('expired sale fixture agrees with Python gate', () => {
  const cases = JSON.parse(fs.readFileSync(new URL('../../../tests/fixtures/expired_sale_cases.json', import.meta.url), 'utf8'));
  for (const item of cases) assert.equal(lintContent(item.text, '2026-10-15').includes('expired_sale_live'), item.expired, item.text);
});
