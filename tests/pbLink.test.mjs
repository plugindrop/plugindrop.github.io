import assert from 'node:assert/strict';
import test from 'node:test';
import { pbLink } from '../src/lib/priceUtils.ts';
import rehypeLinkPolicy from '../src/lib/rehypeLinkPolicy.mjs';

test('pbLink adds all required tags with context and is idempotent', () => {
  const url = pbLink('/product/1', 'chan=art', { data1: 'post-facts' });
  const parsed = new URL(url);
  assert.deepEqual(Object.fromEntries(parsed.searchParams), {
    chan: 'art', a_aid: '69cb95abe1763', utm_source: 'plugindrop',
    utm_medium: 'article', utm_campaign: 'post-facts', data1: 'post-facts', data2: 'body',
  });
  assert.equal(pbLink(url, 'chan=home', { campaign: 'other' }), url);
});

test('article render fills PB link tags without changing internal links', () => {
  const tree = { type: 'root', children: [
    { type: 'element', tagName: 'a', properties: { href: 'https://www.pluginboutique.com/product/1?a_aid=69cb95abe1763&chan=art&data1=post' }, children: [] },
    { type: 'element', tagName: 'a', properties: { href: '/posts/example/' }, children: [] },
  ] };
  rehypeLinkPolicy()(tree, { path: '/src/content/blog/post.md' });
  assert.equal(new URL(tree.children[0].properties.href).searchParams.get('utm_campaign'), 'post');
  assert.equal(tree.children[1].properties.href, '/posts/example/');
});

test('pbLink preserves existing tags and leaves third-party URLs alone', () => {
  const own = pbLink('https://www.pluginboutique.com/product/1?a_aid=69cb95abe1763&utm_medium=custom&chan=home');
  assert.equal(new URL(own).searchParams.get('utm_medium'), 'custom');
  assert.equal(new URL(own).searchParams.get('data1'), 'site');
  const campaign = pbLink('/product/1?utm_campaign=existing', 'chan=art');
  assert.equal(new URL(campaign).searchParams.get('data1'), 'existing');
  const other = 'https://www.pluginboutique.com/product/1?a_aid=615ec2abe7821';
  assert.equal(pbLink(other, 'chan=art'), other);
  const archive = 'https://web.archive.org/web/https://www.pluginboutique.com/product/1';
  assert.equal(pbLink(archive), archive);
});

test('placement fills data2 without replacing existing data2', () => {
  assert.equal(new URL(pbLink('/product/1', 'chan=trk', { placement: 'pp-hero' })).searchParams.get('data2'), 'pp-hero');
  assert.equal(new URL(pbLink('/product/1?data2=original', 'chan=trk', { placement: 'pp-hero' })).searchParams.get('data2'), 'original');
});

test('missing chan throws in development and falls back to art in production', () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'development';
    assert.throws(() => pbLink('/product/1', '', { placement: 'body' }), /chan/);
    process.env.NODE_ENV = 'production';
    const originalWarn = console.warn;
    const warnings = [];
    console.warn = (message) => warnings.push(message);
    try { assert.equal(new URL(pbLink('/product/1', '', { placement: 'body' })).searchParams.get('chan'), 'art'); }
    finally { console.warn = originalWarn; }
    assert.equal(warnings.length, 1);
  } finally { process.env.NODE_ENV = previous; }
});
