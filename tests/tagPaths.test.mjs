import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isTagPageIndexable, slugifyTag } from '../src/lib/indexPolicy.mjs';
import { isArticleDealPastWindow } from '../src/lib/articleDeal.mjs';

const source = readFileSync(new URL('../src/pages/tags/[tag].astro', import.meta.url), 'utf8');
const functionSource = source.match(/export async function getStaticPaths\(\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(functionSource, 'tag route must define getStaticPaths');
const getStaticPaths = new Function('getCollection', 'isTagPageIndexable', 'slugifyTag', 'isArticleDealPastWindow',
  `return (${functionSource.replace('export async function', 'async function').replace('new Map<string, number>()', 'new Map()')});`
);

function post(tag, options = {}) {
  return { data: { tags: [tag], draft: false, noindex: false, ...options } };
}

test('tag route counts only indexable public posts', async () => {
  const posts = [
    ...Array.from({ length: 9 }, () => post('Boundary')),
    post('Boundary', { draft: true }),
    post('Boundary', { noindex: true }),
    post('free', { noindex: true }),
  ];
  const paths = async () => getStaticPaths(async (_collection, predicate) => posts.filter(predicate), isTagPageIndexable, slugifyTag, isArticleDealPastWindow)();
  assert.equal((await paths()).some(({ params }) => params.tag === 'boundary'), false);
  assert.equal((await paths()).some(({ params }) => params.tag === 'free'), false);
  posts.push(post('Boundary'));
  assert.deepEqual((await paths()).filter(({ params }) => params.tag === 'boundary'), [
    { params: { tag: 'boundary' }, props: { tag: 'boundary', noindex: false } },
  ]);
  posts.pop();
  posts.push(post('Boundary', { saleExpiry: '2026-01-01', pubDate: '2025-12-01', dealPrice: '$49' }));
  assert.equal((await paths()).some(({ params }) => params.tag === 'boundary'), false);
});
