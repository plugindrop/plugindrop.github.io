import priority from '../data/crawl_priority_slugs.json' with { type: 'json' };
import { staticRedirects } from '../data/plugin_price_redirects.mjs';

export const prioritySlugs = new Set(priority.slugs);

export function eligiblePriorityPosts(posts, redirects = new Set()) {
  return posts.filter((post) => prioritySlugs.has(post.id.replace(/\.mdx?$/, ''))
    && !post.data.draft && !post.data.noindex
    && !Object.hasOwn(staticRedirects, `/posts/${post.id.replace(/\.mdx?$/, '')}/`)
    && !redirects.has(post.id.replace(/\.mdx?$/, ''))
    && new Date(post.data.pubDate).valueOf() <= Date.now());
}

export function rotatePriorityPosts(posts, count, day = new Date()) {
  if (!posts.length) return [];
  const sorted = [...posts].sort((a, b) => a.id.localeCompare(b.id));
  const dayNumber = Math.floor(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) / 86400000);
  const start = (dayNumber * count) % sorted.length;
  return Array.from({ length: Math.min(count, sorted.length) }, (_, index) => sorted[(start + index) % sorted.length]);
}
