import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const source = (relativePath) => readFile(path.join(root, relativePath), 'utf8');

test('about describes the affiliate disclosure used by article and store links', async () => {
  const [about, article, dealCard, pricePage] = await Promise.all([
    source('src/pages/about.astro'),
    source('src/layouts/BlogPost.astro'),
    source('src/components/DealCard.astro'),
    source('src/pages/plugin-prices/[slug].astro'),
  ]);

  assert.match(about, /Pages with affiliate links say so: posts carry a disclosure note, and every store link is tagged rel="sponsored"\. See the <a href="\/editorial-policy\/#affiliate">affiliate disclosure<\/a>\./);
  assert.doesNotMatch(about, /\[Ad\]|marked with \[Ad\]/);
  assert.match(article, /This post contains affiliate links\. We may earn a small commission/);
  for (const markup of [article, dealCard, pricePage]) {
    assert.match(markup, /rel="noopener sponsored"/);
  }
});

test('about makes no unsupported 24-hour correction promise', async () => {
  const about = await source('src/pages/about.astro');
  assert.match(about, /Errors reported via the contact page are corrected and noted on the page\./);
  assert.doesNotMatch(about, /CORRECTION_POLICY_TEXT|within 24 hours/);
});
