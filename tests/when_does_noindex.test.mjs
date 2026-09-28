import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

test('price page guides and related posts exclude noindex articles', () => {
  const guides = fs.readFileSync(path.join(root, 'src/pages/plugin-prices/[slug].astro'), 'utf8');
  const blog = fs.readFileSync(path.join(root, 'src/layouts/BlogPost.astro'), 'utf8');
  assert.match(guides, /getCollection\('blog', \(p\) => !p\.data\.draft && !p\.data\.noindex\)/);
  assert.match(blog, /\.filter\(p => !p\.data\.draft && !p\.data\.noindex && p\.id !== currentSlug/);
});
