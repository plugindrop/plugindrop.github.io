import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import map from '../src/data/free_to_paid_map.json' with { type: 'json' };

const links = (source) => [...source.matchAll(/\]\((https?:\/\/[^\s)]+)(?:\s+[^)]*)?\)|href=["'](https?:\/\/[^"']+)["']/g)]
  .map(match => match[1] ?? match[2])
  .filter(url => !['pluginboutique.com', 'www.pluginboutique.com'].includes(new URL(url).hostname));

test('free article source links remain present', () => {
  for (const slug of Object.keys(map)) {
    const file = ['md', 'mdx'].map(ext => `src/content/blog/${slug}.${ext}`).find(existsSync);
    assert.ok(file, slug);
    const before = execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8' });
    const current = new Set(links(readFileSync(file, 'utf8')));
    for (const url of new Set(links(before))) assert.ok(current.has(url), `${slug}: missing ${url}`);
  }
});
