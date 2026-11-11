import assert from 'node:assert/strict';
import test from 'node:test';
import { publicTagCounts, isIndexableTagUrl } from '../src/lib/tagIndexPolicy.mjs';

const post = (tags, extra = {}) => ({ data: { tags, ...extra } });
test('tag counts include only public displayed posts', () => {
  const counts = publicTagCounts([post(['Thin']), post(['Thin']), post(['Thin'], { draft: true }), post(['Full']), post(['Full']), post(['Full'])]);
  assert.equal(counts.get('thin'), 2);
  assert.equal(isIndexableTagUrl('https://plugindrop.net/tags/thin/', counts), false);
  assert.equal(isIndexableTagUrl('https://plugindrop.net/tags/full/', counts), true);
  assert.equal(isIndexableTagUrl('https://plugindrop.net/compare/', counts), true);
});
