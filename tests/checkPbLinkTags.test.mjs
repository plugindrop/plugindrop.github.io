import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkPbLinkTags } from '../scripts/check_pb_link_tags.mjs';

test('PB tag checker decodes entities, ignores third-party hosts and reports missing keys', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'pb-tags-'));
  try {
    await writeFile(path.join(dir, 'index.html'), `
      <a href="https://www.pluginboutique.com/product/1?a_aid=69cb95abe1763&amp;chan=trk&#38;data1=x&#x26;utm_source=plugindrop&amp;utm_medium=tracker&amp;utm_campaign=x">ok</a>
      <a href="https://www.pluginboutique.com/product/2?a_aid=69cb95abe1763&amp;chan=trk">bad</a>
      <a href="https://web.archive.org/https://pluginboutique.com/product/3?a_aid=69cb95abe1763">archive</a>
      <a href="https://www.pluginboutique.com/product/4">internal</a>`);
    const result = await checkPbLinkTags(dir);
    assert.equal(result.checked, 2);
    assert.equal(result.counts.chan, 0);
    assert.equal(result.counts.data1, 1);
    assert.equal(result.counts.data2, 2);
    assert.equal(result.failures, 6);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('PB tag checker rejects affiliate URLs inside JSON-LD', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'pb-jsonld-'));
  try {
    await writeFile(path.join(dir, 'index.html'), '<script type="application/ld+json">{"offers":{"url":"https://www.pluginboutique.com/product/1?a_aid=69cb95abe1763"}}</script>');
    const result = await checkPbLinkTags(dir);
    assert.equal(result.failures, 1);
    assert.equal(result.jsonLdExamples.length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
