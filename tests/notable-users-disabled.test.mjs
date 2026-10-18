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

test('disabled notable users leave no text in built HTML', async () => {
  for (const file of await htmlFiles(fileURLToPath(new URL('../dist', import.meta.url)))) {
    const html = await readFile(file, 'utf8');
    assert.doesNotMatch(html, /On the record|is quoted as saying/);
  }
});
