import assert from 'node:assert/strict';
import test from 'node:test';
import { formatOsRequirement } from '../src/lib/formatOsRequirement.mjs';

test('Waves Gold Bundle scrape residue is removed', () => {
  assert.equal(formatOsRequirement('macOS 12 or later; Important Notes: Waves Gold Bundle; Awards; Testimonials'), 'macOS 12 or later');
  assert.equal(formatOsRequirement('Windows 10 or later; PC; Formats: VST3'), 'Windows 10 or later');
  assert.equal(formatOsRequirement('   ; Awards'), 'not published');
  assert.equal(formatOsRequirement(`macOS 12 or later; ${'x'.repeat(160)}`), 'macOS 12 or later');
});
