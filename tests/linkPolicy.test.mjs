import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLinkPolicy, parsePostFrontmatter } from '../src/lib/linkPolicy.mjs';
import { countIndexableBrandProducts } from '../src/lib/brandIndexability.mjs';
import rehypeLinkPolicy from '../src/lib/rehypeLinkPolicy.mjs';

const anchor = (href, text = 'Keep this text') => ({ type: 'element', tagName: 'a', properties: { href }, children: [{ type: 'text', value: text }] });
const fixture = createLinkPolicy({
  posts: new Map([['hidden', false], ['public', true]]),
  tagCounts: new Map([['large', 10], ['small', 9]]),
  brandCounts: new Map([['large', 3], ['small', 2]]),
  indexablePrices: new Set(['/plugin-prices/public/']),
  unlistedCompare: new Set(['/compare/hidden/']),
});
const transform = (file, ...links) => {
  const tree = { type: 'root', children: links };
  rehypeLinkPolicy()(tree, { path: file });
  return tree.children;
};

test('fixture policy rejects hidden destinations', () => {
  for (const href of ['/posts/hidden/', '/tags/small/', '/brands/small/', '/plugin-prices/hidden/', '/compare/hidden/']) {
    assert.equal(fixture.isInternalPathIndexable(href), false);
  }
});

test('leaves public, external, and affiliate links alone', () => {
  const links = [anchor('/'), anchor('https://example.com/'), anchor('/go/example/')];
  assert.deepEqual(transform('best-free-synth-plugins.md', ...links), links);
});

test('leaves outgoing links on a noindex post alone', () => {
  assert.equal(fixture.isNoindexMarkdownFile('hidden.md'), true);
  assert.equal(fixture.isNoindexMarkdownFile('public.md'), false);
});

test('brand count includes only indexable products', () => {
  const eligible = { pb_url: 'https://example.com/p', all_time_low: 10, typical_sale: 10, history: [
    { date: '2026-01-01', regular: 20, sale: 10, source: 'pb_crawl' },
    { date: '2026-02-01', regular: 20, sale: 10, source: 'pb_crawl' },
    { date: '2026-03-01', regular: 20, sale: null, source: 'pb_crawl' },
  ] };
  assert.equal(countIndexableBrandProducts([{ entry: eligible }, { entry: { ...eligible, history: [] } }]), 1);
});

test('block and inline tag lists are both parsed', () => {
  const block = parsePostFrontmatter('---\ntags:\n  - "synths"\n  - "deals"\n---\nBody');
  const inline = parsePostFrontmatter('---\ntags: [synths, deals]\n---\nBody');
  assert.deepEqual(block.tags, inline.tags);
  const counts = new Map();
  for (const metadata of [block, inline]) {
    for (const tag of metadata.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  assert.equal(counts.get('synths'), 2);
});
