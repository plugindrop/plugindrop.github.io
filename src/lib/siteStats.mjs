import { detectBrand } from './brands.mjs';
import { isPricePageIndexable, listSaleEpisodes } from './indexPolicy.mjs';

export const MEASURED_SOURCES = ['auto_check', 'pb_deals_poll'];
const MEASURED = new Set(MEASURED_SOURCES);

function productId(entry) {
  if (entry?.pbProductId != null && String(entry.pbProductId).trim()) return String(entry.pbProductId).trim();
  const url = entry?.pb_url;
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url, 'https://www.pluginboutique.com');
    if (!['pluginboutique.com', 'www.pluginboutique.com'].includes(parsed.hostname)) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'product') return null;
    const id = parts.at(-1)?.match(/^(\d+)(?:-|$)/)?.[1];
    return id ?? null;
  } catch { return null; }
}

function normaliseName(name) {
  return name.normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ');
}

export function siteStats(data) {
  const entries = [...Object.entries(data?.plugins ?? {}), ...Object.entries(data?.bundles ?? {})];
  const products = new Map();
  let trackingSince = null;
  for (const [name, entry] of entries) {
    const measured = (entry?.history ?? []).filter((row) => MEASURED.has(row?.source));
    if (!measured.length) continue;
    const key = productId(entry) ?? `name:${normaliseName(name)}`;
    const brand = entry.brand ?? detectBrand(name, entry.notes);
    if (!products.has(key) || (!products.get(key) && brand)) products.set(key, brand ?? null);
    for (const row of measured) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(row.date ?? '') && (!trackingSince || row.date < trackingSince)) trackingSince = row.date;
    }
  }
  const brands = new Set([...products.values()].filter(Boolean).map((brand) => brand.trim().toLowerCase()));
  return { trackedProducts: products.size, trackingSince, brandsTracked: brands.size, pricePages: entries.length };
}

function measuredRows(entry) {
  return (entry?.history ?? []).filter((row) => MEASURED.has(row?.source));
}

function earliestMeasuredDate(rows) {
  let first = null;
  for (const row of rows) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(row?.date ?? '') && (!first || row.date < first)) first = row.date;
  }
  return first;
}

export function brandStats(data, { now, dealPool = [] } = {}) {
  const entries = [...Object.entries(data?.plugins ?? {}), ...Object.entries(data?.bundles ?? {})];
  const products = new Map();
  for (const [name, entry] of entries) {
    const brand = detectBrand(name, entry?.notes);
    if (!brand) continue;
    const key = productId(entry) ?? `name:${normaliseName(name)}`;
    if (!products.has(key)) products.set(key, { brand, measured: [], indexable: false });
    const product = products.get(key);
    product.measured.push(...measuredRows(entry));
    product.indexable ||= isPricePageIndexable(entry);
  }

  const stats = new Map();
  const ensure = (brand) => {
    if (!stats.has(brand)) stats.set(brand, {
      tracked: 0, onSaleNow: 0, typicallyDiscounted: 0, indexable: 0, trackingSince: null,
    });
    return stats.get(brand);
  };
  for (const { brand, measured, indexable } of products.values()) {
    const item = ensure(brand);
    if (measured.length) item.tracked++;
    if (listSaleEpisodes({ history: measured }).length) item.typicallyDiscounted++;
    if (indexable) item.indexable++;
    const first = earliestMeasuredDate(measured);
    if (first && (!item.trackingSince || first < item.trackingSince)) item.trackingSince = first;
  }

  // buildDealPool has already deduplicated products for HOME.
  for (const deal of dealPool) {
    const brand = detectBrand(deal?.name ?? '', deal?.entry?.notes);
    if (brand) ensure(brand).onSaleNow++;
  }
  return stats;
}
