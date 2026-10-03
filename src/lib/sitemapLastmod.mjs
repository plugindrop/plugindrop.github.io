import { isArticleSaleExpired } from './articleDeal.mjs';

export function validLastmod(value, now = new Date()) {
  if (value == null || value === '') return undefined;
  const raw = value instanceof Date ? value.toISOString() : String(value);
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(raw)) return undefined;
  const time = Date.parse(raw);
  const day = raw.slice(0, 10);
  const parsedDay = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(time) || time > now.valueOf() || !Number.isFinite(parsedDay)
    || new Date(parsedDay).toISOString().slice(0, 10) !== day) return undefined;
  return raw;
}

export function postLastmod(data, now = new Date()) {
  return validLastmod(data?.updatedDate, now) ?? validLastmod(data?.pubDate, now);
}

export function latestLastmod(posts, now = new Date()) {
  return posts.map((post) => postLastmod(post.data ?? post, now)).filter(Boolean).sort().at(-1);
}

export function sitemapLastmod(pathname, posts, now = new Date(), { priceData, staticDates = {} } = {}) {
  const slug = pathname.match(/^\/posts\/([^/]+)\/$/)?.[1];
  if (slug) return postLastmod(posts.find((post) => post.id === slug)?.data, now);
  if (pathname === '/' || pathname === '/posts/') return latestLastmod(posts, now);
  const tag = pathname.match(/^\/tags\/([^/]+)\/$/)?.[1];
  if (tag) return latestLastmod(posts.filter((post) => !isArticleSaleExpired(post.data, now.valueOf()) && (post.data.tags ?? []).some((value) => value.trim().toLowerCase().replace(/\s+/g, '-') === tag)), now);
  const staticName = pathname.match(/^\/(about|contact|editorial-policy|privacy-policy|how-we-track-prices)\/$/)?.[1];
  if (staticName) return validLastmod(staticDates[staticName], now);
  const priceSlug = pathname.match(/^\/plugin-prices\/([^/]+)\/$/)?.[1];
  if (priceSlug) {
    const entries = { ...(priceData?.bundles ?? {}), ...(priceData?.plugins ?? {}) };
    const entry = Object.entries(entries).find(([name]) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') === priceSlug)?.[1];
    return entry?.history?.map((row) => validLastmod(row.date, now)).filter(Boolean).sort().at(-1);
  }
  if (/^\/(plugin-prices|best(?:\/[^/]+)?|brands(?:\/[^/]+)?|categories|compare(?:\/[^/]+)?|sale-stats(?:\/[^/]+)?|bundle-comparison|free)\/$/.test(pathname)) {
    return validLastmod(priceData?.last_updated, now);
  }
  return undefined;
}
