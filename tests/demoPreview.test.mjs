import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

test('demo preview defers YouTube iframe creation until click', () => {
  const script = readFileSync(new URL('../public/js/pip-preview.js', import.meta.url), 'utf8');
  assert.ok(statSync(new URL('../public/js/pip-preview.js', import.meta.url)).size <= 2048);
  assert.match(script, /addEventListener\('click'/);
  assert.match(script, /youtube-nocookie\.com\/embed/);
  assert.match(script, /addEventListener\('close'/);
  assert.doesNotMatch(script, /document\.write|fetch\(/);
});

test('built demo badges carry a video ID', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const cards = html.match(/<article\b[^>]*data-deal-card[^>]*>[\s\S]*?<\/article>/g) || [];
  for (const card of cards.filter((item) => item.includes('demo-tag'))) {
    assert.match(card.split('>')[0], /data-video-id="[\w-]{11}"/);
  }
});
