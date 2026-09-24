/**
 * dealRanking — pure ranking helpers for the sidebar "Today's Best Plugin
 * Deals" rail (TopDeals.astro) and, from PR-2 onward, the homepage topDeals
 * fallback pool. Everything here takes `now` as an argument instead of
 * calling Date.now() so tests can pin a fixed instant and get a fully
 * deterministic result.
 *
 * Design source: docs/codex-requests/topdeals-scoring-copy-redesign-2026-09-25.md
 * (PR-1). `recentDropOf` intentionally shares its trust boundary with
 * priceUtils.liveDropOf: only `source === 'auto_check'` observations count,
 * so a genuine-looking but unverified price never gets called a "drop".
 */

import { isSearchUrl, pctOff, currentPriceOf, regularPriceOf } from './priceUtils.ts';
import { detectBrand, tierOf } from './brands.mjs';

const DAY_MS = 86400000;

// Same trust boundary as priceUtils.liveDropOf (only a recent auto_check
// observation counts, sale < regular), but takes `now` instead of calling
// Date.now() internally. priceUtils.liveDropOf can't be reused as-is here:
// its hardcoded Date.now() would make rankLiveDeals' ordering depend on
// wall-clock time at test-run time instead of the injected `now`, breaking
// the "fixed now -> fully deterministic order" requirement (design doc
// §PR-1 受け入れ基準). TopDeals.astro still uses the real liveDropOf for
// anything outside the ranked pool.
function liveDropOfAt(entry, now, maxAgeDays = 7) {
  const obs = [...entry.history]
    .filter((h) => h.source === 'auto_check' && (h.sale ?? h.regular) !== null)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = obs.at(-1);
  if (!latest) return null;
  const ageMs = now - new Date(`${latest.date}T00:00:00Z`).getTime();
  if (!(ageMs >= 0) || ageMs > maxAgeDays * DAY_MS) return null;
  const current = latest.sale ?? latest.regular;
  const regular = latest.regular ?? entry.typical_regular;
  if (current === null || regular === null || current >= regular) return null;
  return { current, regular };
}

/** Extracts the numeric PB product id from a product-page path, e.g.
 * "/product/bundles/mixing-mastering/12542-waves-platinum-bundle" -> "12542".
 * Falls back to the query-stripped, lowercased URL when no id segment is
 * found (search URLs, or any path shape we don't recognize) so dedup still
 * degrades to "same URL = same product" instead of throwing.
 */
export function pbProductId(pb_url) {
  if (!pb_url) return '';
  const noQuery = pb_url.split('?')[0];
  const segments = noQuery.split('/').filter(Boolean);
  for (const seg of segments) {
    const m = seg.match(/^(\d{4,})-/);
    if (m) return m[1];
  }
  return noQuery.toLowerCase();
}

function pbCategorySubsegment(pb_url) {
  if (!pb_url) return '';
  const segments = pb_url.split('?')[0].split('/').filter(Boolean);
  const idx = segments.indexOf('product');
  if (idx !== -1 && segments.length > idx + 2) {
    return `${segments[idx + 1]}/${segments[idx + 2]}`;
  }
  return segments.slice(0, 2).join('/');
}

// Finds the contiguous run of auto_check observations, ending at the latest
// one, whose price stays at-or-below current*1.005 (float-safe "same
// price"). Returns the run's start date and the observation immediately
// before it (the higher price the run dropped from), or null for prevPrice
// when the run goes all the way back to the first observation we have.
function lowPriceRunStart(entry) {
  const obs = [...entry.history]
    .filter((h) => h.source === 'auto_check' && (h.sale ?? h.regular) !== null)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
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
  return { runStartDate: obs[k].date, prevPrice, current };
}

/** A genuine recent price drop: the run of low-price observations must have
 * a higher observation right before it (we actually saw it fall — a
 * product's very first observation is never a "drop"), and the run must
 * have started within `windowDays` of `now`.
 */
export function recentDropOf(entry, now, windowDays = 7) {
  const run = lowPriceRunStart(entry);
  if (!run || run.prevPrice === null) return null;
  const sinceMs = new Date(`${run.runStartDate}T00:00:00Z`).getTime();
  const ageDays = (now - sinceMs) / DAY_MS;
  if (!(ageDays >= 0) || ageDays > windowDays) return null;
  return { since: run.runStartDate, prevPrice: run.prevPrice, current: run.current };
}

/** How many days the current price run has been sitting at/near its present
 * level — including runs that go all the way back to the first observation
 * (an "always on sale" product). Used to penalize deals that never actually
 * change, not to claim a drop happened.
 */
export function saleRunDays(entry, now) {
  const run = lowPriceRunStart(entry);
  if (!run) return 0;
  const sinceMs = new Date(`${run.runStartDate}T00:00:00Z`).getTime();
  const days = (now - sinceMs) / DAY_MS;
  return days >= 0 ? Math.floor(days) : 0;
}

/** Groups deals so the diversity cap can spread across vendors even when we
 * don't know the vendor: known brands group by canonical brand name; the
 * unbranded remainder groups by PB category + price pair, which is what
 * bundles unbranded same-tier series like SOLID/PHAT/HEAVY.
 */
export function diversityKey(name, entry) {
  const brand = detectBrand(name, entry.notes);
  if (brand) return `brand:${brand}`;
  const sub = pbCategorySubsegment(entry.pb_url);
  return `cat:${sub}|${currentPriceOf(entry)}|${regularPriceOf(entry)}`;
}

export function rankScore(deal) {
  let score = 0;
  if (deal.recentDrop) {
    if (deal.dropAgeDays <= 2) score += 40;
    else if (deal.dropAgeDays <= 7) score += 30;
  }
  const tier = deal.brand ? tierOf(deal.brand) : null;
  if (tier === 'S') score += 20;
  else if (tier === 'A') score += 12;
  score += (25 * Math.min(deal.off, 70)) / 70;
  if (deal.saleRunDays > 30) score -= 10;
  return score;
}

/** Removes duplicate PB products (same id, different display name) and caps
 * how many entries share a diversityKey. Shared by rankLiveDeals and by
 * TopDeals.astro's watchMode (typical-price) fallback list, which sorts by
 * plain %off and doesn't have freshness data to score on.
 */
export function dedupeAndDiversify(deals, { limit = 10, perKeyCap = 2 } = {}) {
  const seenIds = new Set();
  const deduped = [];
  for (const deal of deals) {
    const id = pbProductId(deal.entry.pb_url);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    deduped.push(deal);
  }

  const keyCounts = new Map();
  const result = [];
  for (const deal of deduped) {
    const key = diversityKey(deal.name, deal.entry);
    const count = keyCounts.get(key) ?? 0;
    if (count >= perKeyCap) continue;
    keyCounts.set(key, count + 1);
    result.push(deal);
    if (result.length >= limit) break;
  }
  return result;
}

/** Full PR-1 ranking for the sidebar's live-deals pool: score by freshness +
 * brand recognition + discount depth − stale-sale penalty, break ties
 * deterministically, then dedupe/diversify. `entries` is the merged
 * bundles+plugins map keyed by display name (price_history.json shape).
 */
export function rankLiveDeals(entries, now, { limit = 10, perKeyCap = 2 } = {}) {
  const candidates = [];
  for (const [name, entry] of Object.entries(entries)) {
    if (isSearchUrl(entry.pb_url)) continue;
    const live = liveDropOf(entry);
    if (!live) continue;
    const off = pctOff(live.current, live.regular);
    if (!(off > 0)) continue;

    const recentDrop = recentDropOf(entry, now);
    const dropAgeDays = recentDrop
      ? (now - new Date(`${recentDrop.since}T00:00:00Z`).getTime()) / DAY_MS
      : null;

    const deal = {
      name,
      entry,
      current: live.current,
      regular: live.regular,
      off,
      recentDrop,
      dropAgeDays,
      brand: detectBrand(name, entry.notes),
      saleRunDays: saleRunDays(entry, now),
    };
    deal.score = rankScore(deal);
    candidates.push(deal);
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.off !== a.off) return b.off - a.off;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });

  return dedupeAndDiversify(candidates, { limit, perKeyCap });
}
