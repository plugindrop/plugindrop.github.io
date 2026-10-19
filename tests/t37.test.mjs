import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { uniquePricePaths } from '../src/lib/uniquePricePaths.mjs';
import { validatedTagline } from '../src/lib/dealCopy.mjs';

test('price paths emit one page for a slug collision', () => {
  const rows = [{ name: 'Cherry Audio DCO 106' }, { name: 'Cherry Audio DCO-106' }];
  assert.equal(uniquePricePaths(rows).length, 1);
  assert.equal(uniquePricePaths(rows)[0].name, 'Cherry Audio DCO-106');
});

test('ended BEAM post VideoObject has a claim-free demo name and description', () => {
  const html = readFileSync(new URL('../dist/posts/beam-2-0-d14542/index.html', import.meta.url), 'utf8');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
  const video = blocks.find((block) => block['@type'] === 'VideoObject');
  assert.ok(video);
  assert.match(video.name, / demo$/);
  assert.doesNotMatch(JSON.stringify(video), /Off\)|Until Oct/);
});

test('awkward legacy tagline is not rendered', () => {
  const record = { status: 'ok', tagline: 'Guitar compression with Medium Fast Attack and Medium Fast Release', source_url: 'https://example.com/product', tagline_source_quote: 'Medium Fast Attack and Medium Fast Release', retrieved: '2026-10-19', machine_checks: { quote_in_source: true, grounded_noun: true, lint_pass: true } };
  assert.equal(validatedTagline(record), null);
});

test('built price pages never emit Product without a verified Offer', () => {
  const root = new URL('../dist/plugin-prices/', import.meta.url);
  for (const slug of readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const html = readFileSync(new URL(`${slug.name}/index.html`, root), 'utf8');
    for (const match of html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)) {
      const schema = JSON.parse(match[1]);
      if (schema['@type'] === 'Product') assert.ok(schema.offers, slug.name);
    }
  }
});
