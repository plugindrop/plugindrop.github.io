/**
 * articleDeal — pure helpers that connect a blog post to its price-tracker
 * entry (src/data/price_history.json) so the article's CTA and fact-box can
 * show real observed prices instead of static frontmatter copy.
 *
 * Design source: docs/codex-requests/topdeals-content-ux-audit-2026-09-25.md
 * (PR-5). `now` is always an argument, never Date.now() internally, so tests
 * get a fully deterministic result (same convention as dealRanking.mjs).
 *
 * Matching is intentionally strict (exact slug / exact PB id, never a
 * substring match): a wrong match here silently shows another product's
 * price on this article, which is worse than showing no fact-box at all.
 */

import { pbProductId } from './dealRanking.mjs';
import { isSearchUrl, pbLink as basePbLink, slugify } from './priceUtils.ts';

const DAY_MS = 86400000;

// Only these sources are an actual confirmed observation. `research` /
// `wayback` / `pb_crawl` / `deal_intake` are historical or catalog-crawl
// values, not a confirmation that the price is right now what we say it is.
const TRUSTED_SOURCES = new Set(['auto_check', 'live_check', 'pb_deals_poll']);
// Only these two sources are actual store-price checks (not a deals-page
// poll, which we can't confirm records "no sale" reliably) — used only to
// decide whether a sale has ENDED, never to decide it's live.
const CHECK_SOURCES = new Set(['auto_check', 'live_check']);

/** Extracts the product name from an article title, e.g.
 * "78% Off AMBER 2 — Chord-Based Guitar Tracks Fast ($29)" -> "AMBER 2".
 * Returns null when nothing usable is left after stripping.
 */
export function productNameOf(post) {
  let name = (post?.data?.title ?? '').trim();
  if (!name) return null;
  name = name.replace(/^\d+%\s*Off\s+/i, '');
  name = name.replace(/\s+—\s.*$/, '');
  name = name.replace(/\s+-\s.*$/, '');
  name = name.replace(/\s+\(\$[\d.,]+\)\s*$/, '');
  name = name.replace(/:\s.*$/, '');
  name = name.trim();
  return name.length > 0 ? name : null;
}

function extractPbIdFromBody(rawBody) {
  if (!rawBody) return null;
  const m = rawBody.match(/pluginboutique\.com\/product\/[^\s)\]"'<>]*?(\d{4,})-/);
  return m ? m[1] : null;
}

/** Finds the tracker entry an article is about. Priority: author-declared
 * priceTrack[0], then an exact title-slug match, then a PB product id found
 * in the article body (only when it resolves to exactly one entry).
 */
export function findTrackerEntryForPost(post, entries, rawBody) {
  const trackedName = post?.data?.priceTrack?.[0];
  if (trackedName && entries[trackedName]) {
    return { name: trackedName, entry: entries[trackedName] };
  }

  const productName = productNameOf(post);
  if (productName) {
    const nameSlug = slugify(productName);
    for (const [name, entry] of Object.entries(entries)) {
      if (slugify(name) === nameSlug) {
        return { name, entry };
      }
    }
  }

  const bodyId = extractPbIdFromBody(rawBody);
  if (bodyId) {
    const idMatches = Object.entries(entries).filter(
      ([, entry]) => pbProductId(entry.pb_url) === bodyId,
    );
    if (idMatches.length === 1) {
      const [name, entry] = idMatches[0];
      return { name, entry };
    }
    if (idMatches.length > 1 && productName) {
      const nameSlug = slugify(productName);
      const narrowed = idMatches.filter(([name]) => slugify(name).includes(nameSlug));
      if (narrowed.length === 1) {
        const [name, entry] = narrowed[0];
        return { name, entry };
      }
    }
  }

  return null;
}

function sortByDateAsc(a, b) {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

/** Only observations from a source that's an actual confirmed check. */
export function trustedHistory(entry) {
  return [...(entry?.history ?? [])]
    .filter((h) => TRUSTED_SOURCES.has(h.source))
    .sort(sortByDateAsc);
}

function latestFrom(history) {
  return history.length > 0 ? history[history.length - 1] : null;
}

function ageDaysOf(dateStr, now) {
  return (now - new Date(`${dateStr}T00:00:00Z`).getTime()) / DAY_MS;
}

/** 'live' | 'ended' | 'unknown'. `ended` only ever comes from an actual
 * store check (auto_check/live_check) — a pb_deals_poll miss doesn't prove
 * the sale ended, it might just not be listed on that particular page.
 */
export function dealState(entry, now) {
  const checkObs = [...(entry?.history ?? [])]
    .filter((h) => CHECK_SOURCES.has(h.source))
    .sort(sortByDateAsc);
  const latestCheck = latestFrom(checkObs);
  if (latestCheck) {
    const age = ageDaysOf(latestCheck.date, now);
    if (age >= 0 && age <= 7) {
      const { sale, regular } = latestCheck;
      if (sale === null || (regular !== null && sale >= regular)) {
        return 'ended';
      }
    }
  }

  const trusted = trustedHistory(entry);
  const latestTrusted = latestFrom(trusted);
  if (latestTrusted) {
    const age = ageDaysOf(latestTrusted.date, now);
    if (age >= 0 && age <= 7) {
      const { sale, regular } = latestTrusted;
      if (sale !== null && regular !== null && sale < regular) {
        return 'live';
      }
    }
  }

  return 'unknown';
}

/** True "everyday price" claim: the current price isn't a discount at all —
 * it's been sitting there, confirmed repeatedly, for a while. Requires
 * enough observations over enough time so a lucky short streak doesn't
 * qualify.
 */
export function everydayPrice(entry, now) {
  const trusted = trustedHistory(entry);
  if (trusted.length < 5) return null;

  const valueOf = (h) => h.sale ?? h.regular;
  const current = valueOf(latestFrom(trusted));
  if (current === null || current === undefined) return null;

  const tolerance = Math.abs(current) * 0.01;
  const withinCount = trusted.filter((h) => {
    const v = valueOf(h);
    return v !== null && v !== undefined && Math.abs(v - current) <= tolerance;
  }).length;
  if (withinCount / trusted.length < 0.9) return null;

  const firstDate = trusted[0].date;
  const lastDate = latestFrom(trusted).date;
  const spanDays = (new Date(`${lastDate}T00:00:00Z`).getTime() - new Date(`${firstDate}T00:00:00Z`).getTime()) / DAY_MS;
  if (spanDays < 30) return null;

  return { since: firstDate, count: trusted.length };
}

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Reuses dealRanking.recentDropOf's trust boundary (auto_check only) — see
 * that function's docstring for why a wider source set isn't safe there.
 */
function recentDropOfLocal(entry, now, windowDays = 7) {
  const obs = [...(entry?.history ?? [])]
    .filter((h) => h.source === 'auto_check' && (h.sale ?? h.regular) !== null)
    .sort(sortByDateAsc);
  if (obs.length === 0) return null;
  const latest = obs[obs.length - 1];
  const current = latest.sale ?? latest.regular;

  let k = obs.length - 1;
  while (k > 0) {
    const prevVal = obs[k - 1].sale ?? obs[k - 1].regular;
    if (prevVal !== null && prevVal <= current * 1.005) {
      k--;
    } else {
      break;
    }
  }
  const prevPrice = k > 0 ? (obs[k - 1].sale ?? obs[k - 1].regular) : null;
  if (prevPrice === null) return null;
  const sinceMs = new Date(`${obs[k].date}T00:00:00Z`).getTime();
  const ageDays = (now - sinceMs) / DAY_MS;
  if (!(ageDays >= 0) || ageDays > windowDays) return null;
  return { since: obs[k].date, prevPrice, current };
}

/** All the facts the fact-box needs, computed only from trusted
 * observations. Returns null when we have no trusted observation at all
 * (e.g. a research-only entry) — the caller should render nothing rather
 * than guess.
 */
export function buildFactBox(entry, now) {
  const trusted = trustedHistory(entry);
  if (trusted.length === 0) return null;

  const latest = latestFrom(trusted);
  const current = latest.sale ?? latest.regular ?? null;
  const regular = latest.regular ?? entry.typical_regular ?? null;

  const saleValues = trusted
    .filter((h) => h.sale !== null && h.sale !== undefined)
    .map((h) => h.sale);
  const lowest = saleValues.length > 0 ? Math.min(...saleValues) : null;
  const typicalSale = saleValues.length >= 3 ? median(saleValues) : null;

  return {
    current,
    regular,
    lowest,
    typicalSale,
    trackedSince: trusted[0].date,
    observations: trusted.length,
    lastChecked: latest.date,
    state: dealState(entry, now),
    everyday: everydayPrice(entry, now),
    recentDrop: recentDropOfLocal(entry, now),
  };
}

/** A home-card verdict backed by tracked observations. */
export function homeVerdictChip(fact, dealScore, onSale) {
  if (!fact) return null;
  if (fact.everyday) return { label: 'EVERYDAY PRICE', cls: 'vchip-avg' };
  if (fact.recentDrop) return { label: 'PRICE DROP', cls: 'vchip-buy' };
  if (!dealScore || dealScore.verdict === 'none') return null;

  const { verdict } = dealScore;
  if (verdict === 'good') return { label: 'BUY NOW', cls: 'vchip-buy' };
  if (verdict === 'ok') return { label: 'FAIR SALE', cls: 'vchip-fair' };
  if (verdict === 'bad') return { label: onSale ? 'AVERAGE' : 'WAIT', cls: 'vchip-avg' };
  return null;
}

/** Builds the CTA href. Priority: the matched tracker entry's PB product
 * page (never a search URL), then the first PB product link found in the
 * article body, then the frontmatter affiliate link as-is. Never builds a
 * new search URL.
 */
export function ctaHref(post, match, rawBody, slug) {
  if (match?.entry?.pb_url && !isSearchUrl(match.entry.pb_url)) {
    // data1 goes right after chan so it survives GA4's 100-char link_url
    // truncation even when the utm_ params that follow get cut off.
    return basePbLink(
      match.entry.pb_url,
      `chan=art&data1=${slug}&utm_source=plugindrop&utm_medium=article-cta&utm_campaign=${slug}`,
    );
  }

  if (rawBody) {
    const m = rawBody.match(/https:\/\/(?:www\.)?pluginboutique\.com\/product\/[^\s)\]"'<>]+/);
    if (m) return m[0];
  }

  return post?.data?.affiliate ?? '#';
}

function truncateAtWordBoundary(str, maxLen) {
  if (str.length <= maxLen) return str;
  const cut = str.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}

// No store name in any branch, by design (2026-09-25 user correction —
// readers only care whether it's cheap, not which store sells it).
export function ctaLabel({ productName, priceText, isFree, state }) {
  const subject = productName ? truncateAtWordBoundary(productName, 40) : 'it';

  if (isFree) return `Get ${subject} free →`;
  if (state === 'ended') return `Check ${subject}'s current price →`;
  if (priceText) return `Get ${subject} for ${priceText} →`;
  return `See ${subject} →`;
}

/** Short version for the sticky bar, which has no room for the product name. */
export function ctaShortLabel({ priceText, isFree, state }) {
  if (isFree) return 'Get free';
  if (state === 'ended') return 'Check price';
  if (priceText) return `Get for ${priceText}`;
  return 'See deal';
}

/**
 * True only when `data.saleExpiry` is an actual known expiry date, not the
 * generator's fallback guess (PR-8, 2026-09-25). A `saleExpiry` older than
 * `pubDate` is never trusted either way — that shape is the "tracked_since
 * value copied into saleExpiry" bug from the AMBER 2 incident (pub 9/23,
 * expiry 8/16), not a real countdown target.
 */
export function hasTrustedExpiry(data) {
  if (!data?.saleExpiry) return false;
  if (data.saleExpirySource === 'fallback') return false;
  const expiry = new Date(data.saleExpiry);
  const pubDate = data.pubDate ? new Date(data.pubDate) : null;
  if (Number.isNaN(expiry.getTime())) return false;
  if (pubDate && !Number.isNaN(pubDate.getTime()) && expiry <= pubDate) return false;
  return true;
}
