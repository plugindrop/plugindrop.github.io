import test from 'node:test';
import assert from 'node:assert/strict';
import { displayPresetCount, formatsLine } from '../src/lib/pluginFacts.mjs';

test('formatsLine prefers VST3, places NKS and Standalone last, and limits to four', () => {
  assert.equal(formatsLine({ formats: ['VST', 'AU', 'NKS', 'VST3', 'AAX', 'Standalone'] }), 'VST3 · AU · AAX · NKS');
  assert.equal(formatsLine({ formats: ['vst3', 'au', 'au'] }), 'VST3 · AU');
  assert.equal(formatsLine({ formats: ['VST3', 'AU', 'VST'] }), 'VST3 · AU');
});

test('formatsLine returns null for missing formats', () => {
  assert.equal(formatsLine({}), null);
  assert.equal(formatsLine({ formats: [] }), null);
});

test('displayPresetCount requires one matching preset figure in the quote', () => {
  const fact = (preset_count, preset_quote) => ({ preset_count, preset_quote });
  assert.equal(displayPresetCount(fact(909, 'Classic 909 sounds')), null);
  assert.equal(displayPresetCount(fact(4, '4 Sound Sources (A, B, C, D)')), null);
  assert.equal(displayPresetCount(fact(5, '5 Preset Expansions')), null);
  assert.equal(displayPresetCount(fact(330, 'Over 330 presets.')), '330+');
  assert.equal(displayPresetCount(fact(128, '128 presets')), '128');
  assert.equal(displayPresetCount(fact(350, '350 Presets + 250 Module Presets')), null);
  assert.equal(displayPresetCount(fact(127, '128 presets')), null);
});
