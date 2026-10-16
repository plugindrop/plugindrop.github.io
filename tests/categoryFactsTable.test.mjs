import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('category page supplies the current FactsTable model prop', () => {
  const page = readFileSync(new URL('../src/pages/best/[category].astro', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /<FactsTable\s+products=/);
  assert.match(page, /<FactsTable\s+model=/);
});
