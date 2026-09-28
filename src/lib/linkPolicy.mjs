import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { detectBrand } from './brands.mjs';
import { countIndexableBrandProducts } from './brandIndexability.mjs';
import {
  indexablePricePagePaths, isBrandPageIndexable, isTagPageIndexable,
  slugifyProduct, slugifyTag,
} from './indexPolicy.mjs';

let moduleDir = path.dirname(fileURLToPath(import.meta.url));
while (!fs.existsSync(path.join(moduleDir, 'src', 'content', 'blog'))) {
  const parent = path.dirname(moduleDir);
  if (parent === moduleDir) throw new Error('Cannot locate site source from linkPolicy.mjs');
  moduleDir = parent;
}
const sourceDir = path.join(moduleDir, 'src');
const dataDir = path.join(sourceDir, 'data');
const blogDir = path.join(sourceDir, 'content', 'blog');
const priceData = JSON.parse(fs.readFileSync(path.join(dataDir, 'price_history.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'programmatic_pages.json'), 'utf8'));
const indexablePrices = new Set(indexablePricePagePaths(priceData));
const unlistedCompare = new Set(manifest.pairs.filter(p => p.status === 'unlisted').map(p => `/compare/${p.slug}/`));

const posts = new Map();
const tagCounts = new Map();
export function parsePostFrontmatter(source) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  return yaml.load(frontmatter) ?? {};
}
for (const name of fs.readdirSync(blogDir)) {
  if (!/\.mdx?$/.test(name)) continue;
  const source = fs.readFileSync(path.join(blogDir, name), 'utf8');
  const metadata = parsePostFrontmatter(source);
  const hidden = metadata.noindex === true || metadata.draft === true;
  posts.set(name.replace(/\.mdx?$/, ''), !hidden);
  if (hidden) continue;
  const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
  for (const tag of tags) {
    if (typeof tag !== 'string' || !tag) continue;
    const slug = slugifyTag(tag);
    tagCounts.set(slug, (tagCounts.get(slug) ?? 0) + 1);
  }
}

const brandProducts = new Map();
for (const entries of [priceData.plugins ?? {}, priceData.bundles ?? {}]) {
  for (const [name, entry] of Object.entries(entries)) {
    const brand = detectBrand(name, entry.notes);
    if (!brand) continue;
    const slug = slugifyProduct(brand);
    const products = brandProducts.get(slug) ?? [];
    products.push({ entry });
    brandProducts.set(slug, products);
  }
}
const brandCounts = new Map([...brandProducts].map(([slug, products]) => [slug, countIndexableBrandProducts(products)]));

/** Build policy decisions from explicit data for deterministic tests. */
export function createLinkPolicy({ posts, tagCounts, brandCounts, indexablePrices, unlistedCompare }) {
  function isInternalPathIndexable(href) {
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

  function isNoindexMarkdownFile(file) {
  if (!file) return false;
  const name = String(file).replaceAll('\\', '/').split('/').at(-1)?.replace(/\.mdx?$/, '');
  return posts.get(name) === false;
  }
  return { isInternalPathIndexable, isNoindexMarkdownFile };
}

const defaultPolicy = createLinkPolicy({ posts, tagCounts, brandCounts, indexablePrices, unlistedCompare });
export const { isInternalPathIndexable, isNoindexMarkdownFile } = defaultPolicy;
