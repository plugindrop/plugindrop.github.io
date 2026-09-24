import assert from 'node:assert/strict';
import test from 'node:test';

import { BRAND_ALIASES, tierOf, detectBrand, flattenBrandPrefixes } from '../src/lib/brands.mjs';

test('detectBrand matches on the leading brand token, longest prefix first', () => {
  assert.equal(detectBrand('FabFilter Pro-Q 4'), 'FabFilter');
  assert.equal(detectBrand('Spitfire Audio Originals'), 'Spitfire Audio');
  assert.equal(detectBrand('Spitfire LABS'), 'Spitfire Audio');
  assert.equal(detectBrand('NI Komplete 15'), 'Native Instruments');
});

test('detectBrand: SSL Native resolves to Solid State Logic', () => {
  assert.equal(detectBrand('SSL Native X-Comp'), 'Solid State Logic');
});

test('detectBrand: no false-positive match for an unrelated product name', () => {
  assert.equal(detectBrand('Platinum'), null);
});

test('detectBrand: bx_ prefix glues directly onto the product name (no space)', () => {
  assert.equal(detectBrand('bx_console SSL 4000 E'), 'Plugin Alliance');
});

test('detectBrand: falls back to a whole-word match in notes', () => {
  assert.equal(detectBrand('Console Channel Strip', 'Made by Waves for mix bus duty'), 'Waves');
  assert.equal(detectBrand('Console Channel Strip', 'a generic console-style strip'), null);
});

test('tierOf returns the declared tier, defaulting unknown/omitted brands to B', () => {
  assert.equal(tierOf('FabFilter'), 'S');
  assert.equal(tierOf('Softube'), 'A');
  assert.equal(tierOf('Klanghelm'), 'B');
  assert.equal(tierOf('Not A Real Brand'), 'B');
  assert.equal(tierOf(null), null);
});

test('flattenBrandPrefixes sorts longest prefix first so subsets never shadow', () => {
  const flat = flattenBrandPrefixes(BRAND_ALIASES);
  const spitfireAudioIdx = flat.findIndex((p) => p.prefix === 'Spitfire Audio');
  const spitfireIdx = flat.findIndex((p) => p.prefix === 'Spitfire');
  assert.ok(spitfireAudioIdx < spitfireIdx);
});

test('BRAND_ALIASES has no duplicate canonical names', () => {
  const names = BRAND_ALIASES.map((b) => b.canonical);
  assert.equal(new Set(names).size, names.length);
});
