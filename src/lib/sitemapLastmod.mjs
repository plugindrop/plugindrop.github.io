export function validLastmod(value, now = new Date()) {
  if (value == null || value === '') return undefined;
  const raw = value instanceof Date ? value.toISOString() : String(value);
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(raw)) return undefined;
  const time = Date.parse(raw);
  if (!Number.isFinite(time) || time > now.valueOf() || new Date(time).toISOString().slice(0, 10) !== raw.slice(0, 10)) return undefined;
  return raw;
}

export function postLastmod(data, now = new Date()) {
  return validLastmod(data?.updatedDate, now) ?? validLastmod(data?.pubDate, now);
}

export function latestLastmod(posts, now = new Date()) {
  return posts.map((post) => postLastmod(post.data ?? post, now)).filter(Boolean).sort().at(-1);
}

export function sitemapLastmod(pathname, posts, now = new Date()) {
  const slug = pathname.match(/^\/posts\/([^/]+)\/$/)?.[1];
  if (slug) return postLastmod(posts.find((post) => post.id === slug)?.data, now);
  if (pathname === '/' || pathname === '/posts/') return latestLastmod(posts, now);
  const tag = pathname.match(/^\/tags\/([^/]+)\/$/)?.[1];
  if (tag) return latestLastmod(posts.filter((post) => (post.data.tags ?? []).some((value) => value.trim().toLowerCase().replace(/\s+/g, '-') === tag)), now);
  return undefined;
}
