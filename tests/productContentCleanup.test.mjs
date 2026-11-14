import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanEvidence, dedupeChecks, ownFactsFromContent, sanitizeReq } from '../src/lib/productContent.mjs';

test('checks collapse repeated wording and compatibility summary', () => {
  const checks = [{ text: ' Mac: macOS 11. ' }, { text: 'mac: macos 11' }, { text: 'Windows 10+' }];
  assert.deepEqual(dedupeChecks(checks, 'Mac: macOS 11'), [{ text: 'Windows 10+' }]);
});

test('fragments and broken requirements are hidden', () => {
  assert.equal(cleanEvidence('mode, dial in the DRIVE'), null);
  assert.equal(cleanEvidence('great sound for all'), null);
  assert.equal(cleanEvidence('BLITZ! mode adds more compression to the signal.'), 'BLITZ! mode adds more compression to the signal.');
  assert.equal(sanitizeReq('OS'), null);
  assert.equal(sanitizeReq('(64-bits)'), null);
  assert.equal(sanitizeReq('macOS 11 or later'), 'macOS 11 or later');
});

test('own product requirements come from source content', () => {
  const facts = ownFactsFromContent({ before_you_buy: [
    { text: 'VST3, AU and AAX formats', evidence: 'source' },
    { text: 'Mac: macOS 11 Big Sur or later', evidence: 'source' },
    { text: 'Windows: Windows 10 or later', evidence: 'source' },
  ] });
  assert.match(facts.formats.join(', '), /VST3/);
  assert.match(facts.mac_req, /macOS 11/);
  assert.match(facts.win_req, /Windows 10/);
});
