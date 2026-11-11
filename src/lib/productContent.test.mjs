import test from 'node:test';
import assert from 'node:assert/strict';
import { selectBlocks, compatSummary, categoryShareLine, priceRankLine, atAGlanceRows, hasContentDepth } from './productContent.mjs';

const content = { features: [{ text: 'Six oscillators' }], uses: [{ label: 'Vocals', evidence: 'Use on vocals.' }, { label: 'Drums', evidence: 'Use on drums.' }], sound: [{ term: 'warm', evidence: 'A warm tone.' }], before_you_buy: [{ key: 'host', text: 'Requires Kontakt', evidence: 'Requires Kontakt.' }], compat: { mac_max: '13', apple_silicon: true }, peers: ['B', 'C'] };
test('blocks require displayable evidence and rollout', () => {
  assert.equal(selectBlocks(content).length >= 3, true);
  assert.equal(hasContentDepth('A', { A: content }, { allow: ['*'] }), true);
  assert.equal(hasContentDepth('A', { A: content }, { allow: ['B'] }), false);
  assert.equal(hasContentDepth('A', {}, { allow: ['*'] }), false);
});
test('glance uses verbatim sound and saved peers', () => {
  const rows = atAGlanceRows({ ...content, tagline: 'A synthesizer.' }, 'Price is $20.', content.peers);
  assert.equal(rows.find(row => row.label === 'Sound').text, '“A warm tone.” — Vendor');
  assert.equal(rows.find(row => row.label === 'Next to').text, 'B · C');
  assert.equal(rows.length, 5);
});
test('rank needs five observations', () => {
  assert.equal(priceRankLine({ rank: 2, count: 4, category: 'synth', price: '$20', date: '2026-11-11' }), null);
  assert.match(priceRankLine({ rank: 2, count: 5, category: 'synth', price: '$20', date: '2026-11-11' }), /2nd/);
  assert.match(compatSummary(content.compat), /macOS 13/);
  assert.match(categoryShareLine({ count: 5, aax: 2, appleSilicon: 3, category: 'synth' }), /2 list AAX/);
});
