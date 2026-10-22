import test from 'node:test';
import assert from 'node:assert/strict';
import { formatsLine } from '../src/lib/pluginFacts.mjs';

test('formatsLine prefers VST3, places NKS and Standalone last, and limits to four', () => {
  assert.equal(formatsLine({ formats: ['VST', 'AU', 'NKS', 'VST3', 'AAX', 'Standalone'] }), 'VST3 · AU · AAX · NKS');
  assert.equal(formatsLine({ formats: ['vst3', 'au', 'au'] }), 'VST3 · AU');
  assert.equal(formatsLine({ formats: ['VST3', 'AU', 'VST'] }), 'VST3 · AU');
});

test('formatsLine returns null for missing formats', () => {
  assert.equal(formatsLine({}), null);
  assert.equal(formatsLine({ formats: [] }), null);
});
