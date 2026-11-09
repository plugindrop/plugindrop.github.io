import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import map from '../src/data/free_to_paid_map.json' with { type: 'json' };

const links = (source) => [...source.matchAll(/\]\((https?:\/\/[^\s)]+)(?:\s+[^)]*)?\)|href=["'](https?:\/\/[^"']+)["']/g)]
  .map(match => match[1] ?? match[2]).sort();

test('free article source links match the pre-change revision', () => {
  for (const slug of Object.keys(map)) {
    const file = ['md', 'mdx'].map(ext => `src/content/blog/${slug}.${ext}`).find(existsSync);
    assert.ok(file, slug);
    const before = execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8' });
    assert.deepEqual(links(readFileSync(file, 'utf8')), links(before), slug);
  }
});
