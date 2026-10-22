import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8');

test('price math omits a zero difference row', () => {
  const source = read('../src/components/DealMath.astro');
  assert.match(source, /filter\(\(row\) => row\.value !== null && row\.value\.difference !== 0\)/);
});

test('single product fact card follows article and precedes alternatives and price record', () => {
  const source = read('../src/layouts/BlogPost.astro');
  const slot = source.indexOf('<slot />');
  const fact = source.indexOf('{_showFactCard &&', slot);
  const alternatives = source.indexOf('<AlternativesRail', slot);
  const record = source.indexOf('<PriceRecord', slot);
  assert.ok(slot >= 0 && slot < fact && fact < alternatives && alternatives < record);
  assert.match(source, /sameCategoryPeers\(_trackerMatch\.entry, _trackerMatch\.name,/);
});

test('fact card purchase link uses a store neutral label', () => {
  assert.match(read('../src/components/FactCard.astro'), /Check current price →<\/a>/);
});

test('built single product review keeps content before facts and offers four alternatives', () => {
  const html = read('../dist/posts/empirical-labs-el8-distressor-compressor-ff4241/index.html');
  const tldr = html.indexOf('TL;DR');
  const facts = html.indexOf('data-fact-card');
  const alternatives = html.indexOf('alternatives-rail');
  const priceRecord = html.indexOf('data-price-record');
  assert.ok(tldr >= 0 && tldr < facts && facts < alternatives && alternatives < priceRecord);
  assert.match(html, /data-alternatives-count="4"/);
  assert.doesNotMatch(html, /\(\$0 difference\)/);
});
