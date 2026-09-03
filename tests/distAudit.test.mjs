import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countSitemapSections,
  extractInternalHrefs,
  hasRobotsNoindex,
  isRedirectStub,
  routeForHtmlPath,
} from '../src/lib/distAudit.mjs';

test('hasRobotsNoindex handles attribute order, case, and robots token forms', () => {
  assert.equal(hasRobotsNoindex('<meta content="noindex, follow" name="robots">'), true);
  assert.equal(hasRobotsNoindex('<meta name="robots" content="noindex, follow">'), true);
  assert.equal(hasRobotsNoindex('<META NAME="ROBOTS" CONTENT="NOINDEX, FOLLOW">'), true);
  assert.equal(hasRobotsNoindex('<meta name="robots" content="index, follow">'), false);
  assert.equal(hasRobotsNoindex('<meta name="robots" content="noindex">'), true);
});

test('isRedirectStub detects meta refresh', () => {
  assert.equal(isRedirectStub('<meta http-equiv="refresh" content="0;url=/x/">'), true);
  assert.equal(isRedirectStub('<meta name="robots" content="noindex">'), false);
});

test('extractInternalHrefs normalizes same-site links and excludes non-page links', () => {
  const html = [
    '<a href="https://plugindrop.net/x/">absolute</a>',
    '<a href="/x">relative</a>',
    '<a href="/x/?a=1#b">query</a>',
    '<a href="https://www.pluginboutique.com/products/1">external</a>',
    '<a href="mailto:test@example.com">mail</a>',
    '<a href="#top">hash</a>',
    '<a href="/x.html">html</a>',
  ].join('');
  assert.deepEqual(extractInternalHrefs(html), ['/x/', '/x/', '/x/', '/x/']);
});

test('routeForHtmlPath applies the index.html route rules', () => {
  assert.equal(routeForHtmlPath('index.html'), '/');
  assert.equal(routeForHtmlPath('posts/example/index.html'), '/posts/example/');
  assert.equal(routeForHtmlPath('404.html'), '/404/');
});

test('countSitemapSections counts first path segments and root', () => {
  const xml = `<?xml version="1.0"?><urlset>
    <url><loc>https://plugindrop.net/</loc></url>
    <url><loc>https://plugindrop.net/posts/a/</loc></url>
    <url><loc>https://plugindrop.net/posts/b/</loc></url>
    <url><loc>https://plugindrop.net/plugin-prices/x/</loc></url>
  </urlset>`;
  assert.deepEqual([...countSitemapSections(xml)], [
    ['(root)', 1],
    ['posts', 2],
    ['plugin-prices', 1],
  ]);
});
