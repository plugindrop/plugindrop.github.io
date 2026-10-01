import test from 'node:test';
import assert from 'node:assert/strict';
import { eligiblePriorityPosts, rotatePriorityPosts } from '../src/lib/crawlPriority.mjs';

test('priority filters hidden and future posts, then rotates deterministically', () => {
  const make = (id, data = {}) => ({ id, data: { pubDate: new Date('2026-05-01'), ...data } });
  const posts = [make('best-limiter-plugins-mastering'), make('best-free-limiter-vst', { noindex: true }), make('unknown')];
  const eligible = eligiblePriorityPosts(posts);
  assert.deepEqual(eligible.map((post) => post.id), ['best-limiter-plugins-mastering']);
  assert.deepEqual(rotatePriorityPosts(eligible, 1, new Date('2026-10-01')), rotatePriorityPosts(eligible, 1, new Date('2026-10-01')));
});
