import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFacts, supported, articleProducts, verifiedCount, tableEligible, renderFacts } from '../scripts/build_free_facts.mjs';
import { freeFactsLine } from '../src/lib/freeFacts.mjs';

test('free facts line uses only present sourced values in license, formats, OS order', () => {
  assert.equal(freeFactsLine({ license: { value: 'Free' }, formats: { value: 'VST3/AU' }, os: { value: 'macOS/Windows' } }), 'License: Free · Formats: VST3/AU · OS: macOS/Windows');
  assert.equal(freeFactsLine({ license: null, formats: { value: 'VST3' }, os: null }), 'Formats: VST3');
  assert.equal(freeFactsLine({ license: null, formats: null, os: null }), '');
});

test('comparison requires three verified fields for at least 60 percent of entries', () => {
  const complete = { facts: { license: { value: 'Free' }, os: { value: 'Windows 10' }, formats: { value: 'VST3' } } };
  const sparse = { facts: { license: { value: 'Free' } } };
  assert.equal(verifiedCount(complete), 3);
  assert.equal(tableEligible([complete, complete, complete, sparse, sparse]), true);
  assert.equal(tableEligible([complete, complete, sparse, sparse, sparse]), false);
  assert.equal(tableEligible([]), false);
});

test('free filter uses license independently of registration and omits unsupported columns', () => {
  const item = { name: 'Example', facts: { license: { value: 'Free', source_url: 'https://example.org', quote: 'free' }, registration: null } };
  const html = renderFacts([item], '2026-10-14');
  assert.match(html, /data-free="true"/);
  assert.doesNotMatch(html, /Installer size|<script>|<th>Release date<\/th>/);
});

test('a fact needs an exact quote from the fetched vendor text', () => {
  const text = 'Free download. Windows 10 and macOS 12. VST3 and CLAP. Native Apple Silicon support.';
  const facts = extractFacts(text, 'https://example.org/plugin', '2026-10-14');
  assert.equal(facts.license.value, 'Free');
  assert.equal(facts.formats.value, 'VST3 and CLAP');
  assert.equal(facts.apple_silicon.value, 'Native Apple Silicon');
  for (const fact of Object.values(facts)) if (fact) assert.ok(supported(fact, text));
  assert.equal(facts.release_date, null);
  assert.equal(facts.size, null);
});

test('trial language does not establish a fully free license', () => {
  const facts = extractFacts('Try our free demo. VST3 available.', 'https://example.org', '2026-10-14');
  assert.equal(facts.license, null);
  assert.equal(facts.registration, null);
});

test('article headings exclude paid alternatives and retain numbered free entries', () => {
  const markdown = '### 1. Vital\n[Official](https://vital.audio/)\n### Serum — Paid benchmark\n[Official](https://xferrecords.com/)';
  assert.deepEqual(articleProducts(markdown).map(p => p.name), ['Vital']);
});
