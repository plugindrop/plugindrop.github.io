import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isInternalPathIndexable, isNoindexMarkdownFile } from '../src/lib/linkPolicy.mjs';
import rehypeLinkPolicy from '../src/lib/rehypeLinkPolicy.mjs';

const anchor = (href, text = 'Keep this text') => ({ type: 'element', tagName: 'a', properties: { href }, children: [{ type: 'text', value: text }] });
const transform = (file, ...links) => {
  const tree = { type: 'root', children: links };
  rehypeLinkPolicy()(tree, { path: file });
  return tree.children;
};

test('removes the anchor but preserves its children on an indexable post', () => {
  const hidden = '/posts/fabfilter-pro-q-3-review/';
  assert.equal(isInternalPathIndexable(hidden), false);
  const children = transform('best-free-synth-plugins.md', anchor(hidden));
  assert.deepEqual(children, [{ type: 'text', value: 'Keep this text' }]);
});

test('leaves public, external, and affiliate links alone', () => {
  const links = [anchor('/'), anchor('https://example.com/'), anchor('/go/example/')];
  assert.deepEqual(transform('best-free-synth-plugins.md', ...links), links);
});

test('leaves outgoing links on a noindex post alone', () => {
  const file = 'fabfilter-pro-q-3-review.md';
  assert.equal(isNoindexMarkdownFile(file), true);
  const link = anchor('/posts/fabfilter-pro-q-3-review/');
  assert.deepEqual(transform(file, link), [link]);
});
