import { detectBrand } from './brands.mjs';

const MEASURED = new Set(['auto_check', 'pb_deals_poll']);

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
