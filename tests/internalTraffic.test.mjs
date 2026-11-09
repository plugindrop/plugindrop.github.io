import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { resolveInternalFlag, tagPbHrefForInternal } from '../src/lib/internalTraffic.mjs';

for (const [search, stored, expected] of [
  ['?internal=1', null, { flag: true, write: '1' }],
  ['?internal=1', '1', { flag: true, write: '1' }],
  ['?internal=0', null, { flag: false, write: 'clear' }],
  ['?internal=0', '1', { flag: false, write: 'clear' }],
  ['', null, { flag: false, write: null }],
  ['', '1', { flag: true, write: null }],
]) {
  test(`resolveInternalFlag(${search || 'no param'}, ${stored})`, () => {
    assert.deepEqual(resolveInternalFlag(search, stored), expected);
  });
}

test('tagPbHrefForInternal adds data2 to a PB link', () => {
  assert.equal(
    tagPbHrefForInternal('https://www.pluginboutique.com/product/1?chan=art'),
    'https://www.pluginboutique.com/product/1?chan=art&data2=internal',
  );
});

test('tagPbHrefForInternal preserves existing data2', () => {
  const href = 'https://pluginboutique.com/product/1?data2=pp-hero';
  assert.equal(tagPbHrefForInternal(href), href);
});

test('tagPbHrefForInternal leaves other hosts unchanged', () => {
  const href = 'https://notpluginboutique.com/product/1';
  assert.equal(tagPbHrefForInternal(href), href);
});

test('tagPbHrefForInternal leaves malformed URLs unchanged', () => {
  assert.equal(tagPbHrefForInternal('not a URL'), 'not a URL');
});

test('built inline script initializes gtag and tags an internal PB click', () => {
  const html = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>(function resolveInternalFlag[\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'GA4 initializer is a classic inline script in built HTML');

  let location = new URL('https://plugindrop.net/?internal=1&ref=home');
  const values = new Map();
  const handlers = new Map();
  const badges = [];
  const window = { dataLayer: [] };
  const document = {
    readyState: 'complete',
    body: { appendChild: (element) => badges.push(element) },
    createElement: () => ({ style: {} }),
    addEventListener: (name, handler) => handlers.set(name, handler),
  };
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const history = { state: null, replaceState: (_state, _title, path) => { location = new URL(path, location); } };
  const context = { window, document, localStorage, history, URL, URLSearchParams, Date };
  Object.defineProperty(context, 'location', { get: () => location });
  vm.runInNewContext(script, context);

  assert.equal(values.get('pd_internal'), '1');
  assert.equal(location.href, 'https://plugindrop.net/?ref=home');
  assert.equal(badges[0].textContent, 'internal');
  assert.equal(window.dataLayer[1][0], 'set');
  assert.equal(window.dataLayer[1][1].traffic_type, 'internal');
  assert.equal(window.dataLayer[2][0], 'config');

  const anchor = {
    href: 'https://www.pluginboutique.com/product/1?chan=art',
    closest: () => null,
    getAttribute: () => 'article-slug',
  };
  handlers.get('click')({ target: { closest: () => anchor } });
  assert.equal(new URL(anchor.href).searchParams.get('data2'), 'internal');
  assert.equal(window.dataLayer[3][1], 'pb_click');
  assert.equal(window.dataLayer[3][2].traffic_type, 'internal');

  anchor.href = 'https://pluginboutique.com/product/2?data2=pp-hero';
  handlers.get('click')({ target: { closest: () => anchor } });
  assert.equal(new URL(anchor.href).searchParams.get('data2'), 'pp-hero');
  assert.equal(window.dataLayer[4][2].placement, 'pp-hero');

  location = new URL('https://plugindrop.net/?internal=0');
  window.dataLayer = [];
  vm.runInNewContext(script, context);
  assert.equal(values.has('pd_internal'), false);
  assert.equal(location.href, 'https://plugindrop.net/');
  anchor.href = 'https://www.pluginboutique.com/product/3?chan=art';
  handlers.get('click')({ target: { closest: () => anchor } });
  assert.equal(new URL(anchor.href).searchParams.has('data2'), false);
  assert.equal(window.dataLayer[2][2].traffic_type, undefined);
});
