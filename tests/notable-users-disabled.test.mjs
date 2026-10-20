import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function htmlFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(full));
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

// Owner-approved Soundtoys artist-page quotes only (2026-10-20). Anything else
// carrying the heading is a leak, and the quote must always be source-linked.
test('notable-user blocks appear only with a vendor source link', async () => {
  for (const file of await htmlFiles(fileURLToPath(new URL('../dist', import.meta.url)))) {
    const html = await readFile(file, 'utf8');
    if (!/is quoted as saying/.test(html)) continue;
    assert.match(html, /<blockquote class="notable-user"[^>]*cite="https:\/\/www\.soundtoys\.com\/artist\//);
    assert.match(html, /retrieved 2026-10-20/);
  }
});
