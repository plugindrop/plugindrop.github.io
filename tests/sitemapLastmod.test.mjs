import test from 'node:test';
import assert from 'node:assert/strict';
import { postLastmod, sitemapLastmod, validLastmod } from '../src/lib/sitemapLastmod.mjs';

const now = new Date('2026-10-01T12:00:00Z');
test('lastmod uses genuine dates and excludes invalid and future values', () => {
  assert.equal(postLastmod({ updatedDate: '2026-09-01', pubDate: '2026-05-01' }, now), '2026-09-01');
  assert.equal(postLastmod({ updatedDate: '2027-01-01', pubDate: '2026-05-01' }, now), '2026-05-01');
  assert.equal(validLastmod('2026-02-30', now), undefined);
  assert.equal(validLastmod('2026-09-28T00:32:29+09:00', now), '2026-09-28T00:32:29+09:00');
  assert.equal(postLastmod({}, now), undefined);
});
test('price and static URLs use dated source evidence only', () => {
  const priceData = { last_updated: '2026-09-29', plugins: { 'Example Plugin': { history: [{ date: '2026-09-01' }, { date: '2026-09-20' }, { date: '2027-01-01' }] } } };
  const options = { priceData, staticDates: { about: '2026-08-01T12:00:00Z' } };
  assert.equal(sitemapLastmod('/plugin-prices/example-plugin/', [], now, options), '2026-09-20');
  assert.equal(sitemapLastmod('/plugin-prices/unknown/', [], now, options), undefined);
  assert.equal(sitemapLastmod('/best/effects/', [], now, options), '2026-09-29');
  assert.equal(sitemapLastmod('/compare/a-vs-b/', [], now, options), '2026-09-29');
  assert.equal(sitemapLastmod('/about/', [], now, options), '2026-08-01T12:00:00Z');
  assert.equal(sitemapLastmod('/contact/', [], now, options), undefined);
});

test('listing dates use newest included article', () => {
  const posts = [{ id: 'a', data: { pubDate: '2026-05-01', tags: ['reverb'] } }, { id: 'b', data: { pubDate: '2026-06-01', tags: ['delay'] } }];
  assert.equal(sitemapLastmod('/posts/', posts, now), '2026-06-01');
  assert.equal(sitemapLastmod('/tags/reverb/', posts, now), '2026-05-01');
  assert.equal(sitemapLastmod('/best/', posts, now), undefined);
  const expired = { id: 'expired', data: { pubDate: '2026-09-01', tags: ['reverb'], saleExpiry: '2026-09-15', dealPrice: '$49' } };
  assert.equal(sitemapLastmod('/tags/reverb/', [...posts, expired], now), '2026-05-01');
});
