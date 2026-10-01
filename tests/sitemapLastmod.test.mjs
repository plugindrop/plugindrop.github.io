import test from 'node:test';
import assert from 'node:assert/strict';
import { postLastmod, sitemapLastmod, validLastmod } from '../src/lib/sitemapLastmod.mjs';

const now = new Date('2026-10-01T12:00:00Z');
test('lastmod uses genuine dates and excludes invalid and future values', () => {
  assert.equal(postLastmod({ updatedDate: '2026-09-01', pubDate: '2026-05-01' }, now), '2026-09-01');
  assert.equal(postLastmod({ updatedDate: '2027-01-01', pubDate: '2026-05-01' }, now), '2026-05-01');
  assert.equal(validLastmod('2026-02-30', now), undefined);
  assert.equal(postLastmod({}, now), undefined);
});
test('listing dates use newest included article', () => {
  const posts = [{ id: 'a', data: { pubDate: '2026-05-01', tags: ['reverb'] } }, { id: 'b', data: { pubDate: '2026-06-01', tags: ['delay'] } }];
  assert.equal(sitemapLastmod('/posts/', posts, now), '2026-06-01');
  assert.equal(sitemapLastmod('/tags/reverb/', posts, now), '2026-05-01');
  assert.equal(sitemapLastmod('/best/', posts, now), undefined);
});
