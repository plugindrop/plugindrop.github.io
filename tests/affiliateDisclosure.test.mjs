import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const postsDir = new URL('../dist/posts/', import.meta.url);

test('built article pages disclose Plugin Boutique links and mark every link sponsored', async () => {
  const failures = [];
  for (const slug of await readdir(postsDir, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    const articleDir = new URL(`${slug.name}/`, postsDir);
    if (!(await readdir(articleDir)).includes('index.html')) continue;
    const html = await readFile(new URL('index.html', articleDir), 'utf8');
    const pbLinks = [...html.matchAll(/<a\b[^>]*\bhref="https?:\/\/(?:www\.)?pluginboutique\.com[^\"]*"[^>]*>/gi)];
    if (pbLinks.length === 0) continue;
    if (!/class="affiliate-disclosure"/.test(html)) failures.push(`${slug.name}: disclosure missing`);
    for (const link of pbLinks) {
      if (!/\brel="[^"]*\bsponsored\b/.test(link[0])) failures.push(`${slug.name}: sponsored missing`);
    }
  }
  assert.deepEqual(failures, []);
});
