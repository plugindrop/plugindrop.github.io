import { OBSERVED_SOURCES, comparableHistory } from './priceBasis.mjs';
export { OBSERVED_SOURCES } from './priceBasis.mjs';

export const MIN_TAG_POSTS = 3;
export const MIN_PRICE_OBS = 3;
export const MIN_PRICE_SALE_OBS = 1;
export const MIN_PRICE_LEVELS = 2;
export const MIN_BRAND_PRODUCTS = 3;
export const MIN_SALE_EPISODES = 2;
export const MIN_OWN_TRACKING_DAYS = 45;
export const SALE_EPISODE_MAX_GAP_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;
const observedSources = new Set(OBSERVED_SOURCES);

/**
 * Keep product URLs byte-for-byte compatible with the former page-local
 * slugify implementations.
 *
 * @param {string} name
 * @returns {string}
 */
export function slugifyProduct(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** @param {unknown} notes */
export function isMachineStampNote(notes) {
  return typeof notes === 'string'
    && /^(auto-crawl \d{4}-\d{2}-\d{2}|Auto-discovered\b.*)$/i.test(notes);
}

/**
 * @param {string} tag
 * @returns {string}
 */
export function slugifyTag(tag) {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * @param {{ pb_url?: unknown, history?: Array<{ regular?: unknown, sale?: unknown }> } | null | undefined} entry
 * @returns {{ observations: number, saleObservations: number, priceLevels: number }}
 */
export function priceSubstance(entry) {
  const history = Array.isArray(entry?.history) ? entry.history : [];
  return {
    observations: history.length,
    saleObservations: history.filter((observation) => observation?.sale != null).length,
    priceLevels: new Set(
      history
        .map((observation) => observation?.sale ?? observation?.regular)
        .filter((value) => value != null),
    ).size,
  };
}

/**
 * Group all history rows by date and return episodes newest first. A day is a
 * sale day when any row has a sale. Archive rows remain in the sale history;
 * ownTrackingDays restricts sources. `days` is the inclusive calendar span.
 *
 * @param {{ history?: Array<{ date?: string, sale?: unknown }> } | null | undefined} entry
 * @returns {Array<{ start: string, end: string, days: number }>}
 */
export function listSaleEpisodes(entry) {
  const saleByDate = new Map();
  for (const row of Array.isArray(entry?.history) ? entry.history : []) {
    if (typeof row?.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) continue;
    saleByDate.set(row.date, (saleByDate.get(row.date) ?? false) || row.sale != null);
  }

  const episodes = [];
  let previousSaleDate = null;
  let previousDayWasSale = false;
  for (const [date, isSale] of [...saleByDate].sort(([a], [b]) => a.localeCompare(b))) {
    if (!isSale) {
      previousDayWasSale = false;
      continue;
    }
    const gapDays = previousSaleDate === null
      ? Infinity
      : (Date.parse(date) - Date.parse(previousSaleDate)) / DAY_MS;
    if (!previousDayWasSale || gapDays > SALE_EPISODE_MAX_GAP_DAYS) {
      episodes.push({ start: date, end: date, days: 1 });
    } else {
      const episode = episodes.at(-1);
      episode.end = date;
      episode.days = (Date.parse(date) - Date.parse(episode.start)) / DAY_MS + 1;
    }
    previousSaleDate = date;
    previousDayWasSale = true;
  }
  return episodes.reverse();
}

/** @param {{ history?: Array<{ date?: string, sale?: unknown }> } | null | undefined} entry */
export function saleEpisodeCount(entry) {
  return listSaleEpisodes(entry).length;
}

/**
 * Elapsed days between the first and last observations from our own sources.
 *
 * @param {{ history?: Array<{ date?: string, source?: string }> } | null | undefined} entry
 * @returns {number}
 */
export function ownTrackingDays(entry) {
  const dates = (Array.isArray(entry?.history) ? entry.history : [])
    .filter((row) => observedSources.has(row?.source) && typeof row.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date))
    .map((row) => row.date)
    .sort();
  if (dates.length < 2) return 0;
  return (Date.parse(dates.at(-1)) - Date.parse(dates[0])) / DAY_MS;
}

/**
 * @param {{ pb_url?: unknown, all_time_low?: number | null, typical_sale?: number | null, history?: Array<{ date?: string, regular?: unknown, sale?: unknown, source?: string }> } | null | undefined} entry
 * @returns {boolean}
 */
export function isPricePageIndexable(entry) {
  if (typeof entry?.pb_url === 'string' && entry.pb_url.includes('/search?')) return false;
  const comparableEntry = { ...entry, history: comparableHistory(entry) };
  const { observations, saleObservations, priceLevels } = priceSubstance(comparableEntry);
  return observations >= MIN_PRICE_OBS
    && saleObservations >= MIN_PRICE_SALE_OBS
    && priceLevels >= MIN_PRICE_LEVELS
    && saleEpisodeCount(comparableEntry) >= MIN_SALE_EPISODES
    && ownTrackingDays(entry) >= MIN_OWN_TRACKING_DAYS
    && (entry?.all_time_low == null || entry?.typical_sale == null || entry.all_time_low <= entry.typical_sale);
}

/**
 * @param {{
 *   plugins?: Record<string, { history?: unknown[] }>,
 *   bundles?: Record<string, { history?: unknown[] }>
 * } | null | undefined} priceData
 * @returns {string[]}
 */
export function noindexPricePagePaths(priceData) {
  const paths = [];
  for (const entries of [priceData?.plugins ?? {}, priceData?.bundles ?? {}]) {
    for (const [name, entry] of Object.entries(entries)) {
      if (!isPricePageIndexable(entry)) {
        paths.push(`/plugin-prices/${slugifyProduct(name)}/`);
      }
    }
  }
  return paths;
}

/**
 * @param {{
 *   plugins?: Record<string, { history?: unknown[] }>,
 *   bundles?: Record<string, { history?: unknown[] }>
 * } | null | undefined} priceData
 * @returns {string[]}
 */
export function indexablePricePagePaths(priceData) {
  const paths = [];
  for (const entries of [priceData?.plugins ?? {}, priceData?.bundles ?? {}]) {
    for (const [name, entry] of Object.entries(entries)) {
      if (isPricePageIndexable(entry)) {
        paths.push(`/plugin-prices/${slugifyProduct(name)}/`);
      }
    }
  }
  return paths;
}

/**
 * @param {{ plugins?: Record<string, unknown>, bundles?: Record<string, unknown> } | null | undefined} priceData
 * @param {string} name
 * @returns {boolean}
 */
export function isProductNameIndexable(priceData, name) {
  const entry = priceData?.plugins?.[name] ?? priceData?.bundles?.[name];
  return entry !== undefined && isPricePageIndexable(entry);
}

/**
 * @param {number} publicPostCount
 * @returns {boolean}
 */
export function isTagPageIndexable(publicPostCount) {
  return publicPostCount >= MIN_TAG_POSTS;
}

/**
 * @param {number} productCount
 * @returns {boolean}
 */
export function isBrandPageIndexable(productCount) {
  return productCount >= MIN_BRAND_PRODUCTS;
}
