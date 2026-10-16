import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowProductCta } from '../src/lib/articleDeal.mjs';
import { formatOsRequirement } from '../src/lib/formatOsRequirement.mjs';
import catalog from '../src/data/post_catalog_map.json' with { type: 'json' };

test('news and list articles have no product CTA', () => {
  assert.equal(shouldShowProductCta({ slug: 'news-komplete-26', tags: [] }), false);
  assert.equal(shouldShowProductCta({ slug: 'komplete-26', tags: ['News'] }), false);
  assert.equal(shouldShowProductCta({ slug: 'best-free-synth-plugins', tags: [] }), false);
  assert.equal(shouldShowProductCta({ slug: 'best-free-daw-software-2026', tags: [] }), false);
  assert.equal(shouldShowProductCta({ slug: 'top-synths', kind: 'list' }), false);
  assert.equal(shouldShowProductCta({ slug: 'serum-vst-review', tags: ['review'] }), true);
});

test('OS cells contain only a version or dash', () => {
  assert.equal(formatOsRequirement('macOS 10.13 or later; CPU: Intel'), 'macOS 10.13');
  assert.equal(formatOsRequirement('OS X macOS 10.13 or higher; CPU: Intel'), '—');
  assert.equal(formatOsRequirement('macOS 12'), 'macOS 12');
  assert.equal(formatOsRequirement('Windows 11 or later; Plugins: VST3'), 'Windows 11');
  assert.equal(formatOsRequirement('Windows 11, 10, 8'), '—');
});

test('Serum overview has no Serum 2 comparison price', () => {
  assert.deepEqual(catalog['serum-vst-review'].products, []);
});
