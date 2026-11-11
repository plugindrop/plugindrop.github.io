import { isTagPageIndexable, slugifyTag } from './indexPolicy.mjs';
import { isArticleDealPastWindow } from './articleDeal.mjs';

export function publicTagCounts(posts, now = Date.now()) {
  const counts = new Map();
  for (const post of posts) {
    if (post.data.draft || post.data.noindex || isArticleDealPastWindow(post.data, now)) continue;
    for (const tag of post.data.tags ?? []) {
      if (!tag?.trim()) continue;
      const slug = slugifyTag(tag);
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }
  return counts;
}

export function isIndexableTagUrl(page, tagCounts) {
  const match = new URL(page).pathname.match(/^\/tags\/([^/]+)\/$/);
  return !match || isTagPageIndexable(tagCounts.get(decodeURIComponent(match[1])) ?? 0);
}
