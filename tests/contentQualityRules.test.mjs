import assert from 'node:assert/strict';
import test from 'node:test';
import { lintContent } from '../scripts/quarantine_content.mjs';
import fs from 'node:fs';

test('shared content examples', () => {
  const cases = [
    ['saleExpiry: 2026-01-01\n---\nGrab it for $14.95', 'expired_sale_live'],
    ['saleExpiry: 2026-01-01\n---\ncurrently 50% off', 'expired_sale_live'],
    ['saleExpiry: 2026-01-01\n---\n| Regular Price | Deal Price | You Save |\n|---|---|---|\n| $75 | $25 | $50 |', 'expired_sale_live'],
    ['saleExpiry: 2026-01-01\n---\na reasonable time to buy', 'expired_sale_live'],
    ['both sound genuinely excellent', 'unsupported_experience'],
    ['questions I get from readers', 'unsupported_experience'],
    ['[Plugin Boutique](https://vital.audio)', 'link_host_mismatch'],
    ['| Phase Plant Lite | [Download](https://www.pluginboutique.com/product/1/Phase-Plant) | Free |', 'free_paid_cta'],
  ];
  for (const [raw, expected] of cases) assert.ok(lintContent(raw, '2026-10-15').includes(expected), raw);
  assert.ok(!lintContent('"Both sound genuinely excellent" — Vendor', '2026-10-15').includes('unsupported_experience'));
});

test('shared regressions', () => {
  assert.ok(lintContent('We found no published descriptions, but we loved its sound.', '2026-10-15').includes('unsupported_experience'));
  const cases = JSON.parse(fs.readFileSync(new URL('../../../tests/fixtures/content_lint_cases.json', import.meta.url), 'utf8'));
  for (const item of cases) assert.ok(lintContent(item.text, '2026-10-15', { trackerEnded: item.trackerEnded }).includes(item.kind), item.text);
});
