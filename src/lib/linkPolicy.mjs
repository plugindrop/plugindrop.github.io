import fs from 'node:fs';
import path from 'node:path';
import { detectBrand } from './brands.mjs';
import {
  indexablePricePagePaths, isBrandPageIndexable, isTagPageIndexable,
  slugifyProduct, slugifyTag,
} from './indexPolicy.mjs';

const sourceDir = path.resolve(process.cwd(), 'src');
const dataDir = path.join(sourceDir, 'data');
const blogDir = path.join(sourceDir, 'content', 'blog');
const priceData = JSON.parse(fs.readFileSync(path.join(dataDir, 'price_history.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'programmatic_pages.json'), 'utf8'));
const indexablePrices = new Set(indexablePricePagePaths(priceData));
const unlistedCompare = new Set(manifest.pairs.filter(p => p.status === 'unlisted').map(p => `/compare/${p.slug}/`));

const posts = new Map();
const tagCounts = new Map();
for (const name of fs.readdirSync(blogDir)) {
  if (!/\.mdx?$/.test(name)) continue;
  const source = fs.readFileSync(path.join(blogDir, name), 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const hidden = /^(?:noindex|draft):\s*true\s*$/m.test(frontmatter);
  posts.set(name.replace(/\.mdx?$/, ''), !hidden);
  if (hidden) continue;
  const tags = frontmatter.match(/^tags:\s*\[([^\]]*)\]/m)?.[1];
  if (tags) for (const tag of tags.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''))) {
    if (!tag) continue;
    const slug = slugifyTag(tag);
    tagCounts.set(slug, (tagCounts.get(slug) ?? 0) + 1);
  }
}

const brandCounts = new Map();
for (const entries of [priceData.plugins ?? {}, priceData.bundles ?? {}]) {
  for (const [name, entry] of Object.entries(entries)) {
    const brand = detectBrand(name, entry.notes);
    if (!brand) continue;
    const slug = slugifyProduct(brand);
    brandCounts.set(slug, (brandCounts.get(slug) ?? 0) + 1);
  }
}

/** Return false only for known noindex destinations; leave other URLs untouched. */
export function isInternalPathIndexable(href) {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return true;
  const path = href.split(/[?#]/, 1)[0].replace(/\/$/, '') + '/';
  if (path.startsWith('/go/')) return true;
  if (path.startsWith('/plugin-prices/') && path !== '/plugin-prices/') return indexablePrices.has(path);
  if (path.startsWith('/posts/') && path !== '/posts/') return posts.get(path.slice(7, -1)) !== false;
  if (path.startsWith('/tags/') && path !== '/tags/') return isTagPageIndexable(tagCounts.get(path.slice(6, -1)) ?? 0);
  if (path.startsWith('/brands/') && path !== '/brands/') return isBrandPageIndexable(brandCounts.get(path.slice(8, -1)) ?? 0);
  if (path.startsWith('/compare/') && path !== '/compare/') return !unlistedCompare.has(path);
  return true;
}

/** A markdown file with noindex/draft frontmatter keeps all its outgoing links. */
export function isNoindexMarkdownFile(file) {
  if (!file) return false;
  const name = String(file).replaceAll('\\', '/').split('/').at(-1)?.replace(/\.mdx?$/, '');
  return posts.get(name) === false;
}
