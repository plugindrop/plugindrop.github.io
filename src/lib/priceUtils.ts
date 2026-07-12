/**
 * Shared price-data helpers used by the inline price-check card (PriceTracker.astro)
 * and the "Today's Best Deals" sidebar (TopDeals.astro).
 *
 * Kept separate from plugin-prices.astro / plugin-prices/[slug].astro on purpose —
 * those pages are out of scope for this change, but they establish the conventions
 * (slugify, sparkline, "current = latest.sale ?? latest.regular") that this file
 * mirrors so the whole site stays consistent.
 */

export const AFF = "a_aid=69cb95abe1763";

export interface HistoryEntry {
  date: string;
  regular: number | null;
  sale: number | null;
  source: string;
}

export interface PriceEntry {
  pb_url: string;
  typical_regular: number | null;
  typical_sale: number | null;
  all_time_low: number | null;
  notes?: string;
  category?: string;
  history: HistoryEntry[];
}

// Slug used for per-product pages: /plugin-prices/{slug}/
// Mirrors the slugify() in plugin-prices.astro / plugin-prices/[slug].astro exactly.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatPrice(val: number | null): string {
  if (val === null) return '—';
  return `$${val}`;
}

// Affiliate link builder. Preserves http passthrough for non-PB URLs (some
// entries may already carry a full URL) and appends the PB affiliate id plus
// any extra tracking params for the given placement.
export function pbLink(path: string, extraParams = ''): string {
  if (!path) return '#';
  if (path.startsWith('http')) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `https://www.pluginboutique.com${path}${sep}${AFF}${extraParams ? `&${extraParams}` : ''}`;
}

// "Current" price for an entry: the most recent tracked snapshot (sale price
// if one was recorded, else regular), falling back to the typical sale/regular
// figures only when there's no history at all yet. Mirrors the convention
// already used by plugin-prices.astro (row.current = sale ?? regular).
export function currentPriceOf(entry: PriceEntry): number | null {
  const latest = entry.history.at(-1);
  const latestVal = latest ? (latest.sale ?? latest.regular) : null;
  return latestVal ?? entry.typical_sale ?? entry.typical_regular ?? null;
}

// "Regular" price paired with currentPriceOf — same latest-snapshot-first logic.
export function regularPriceOf(entry: PriceEntry): number | null {
  const latest = entry.history.at(-1);
  return latest?.regular ?? entry.typical_regular ?? null;
}

// A "live" drop must be a RECENT scraped observation (auto_check within
// maxAgeDays). Without this gate, stale months-old observations surfaced as
// "Live Price Drops" (2026-07-12 incident: FabFilter Total Bundle showed a
// May price that no longer existed on the store page).
export function liveDropOf(
  entry: PriceEntry,
  maxAgeDays = 7,
): { current: number; regular: number } | null {
  const obs = [...entry.history]
    .filter((h) => h.source === 'auto_check' && (h.sale ?? h.regular) !== null)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = obs.at(-1);
  if (!latest) return null;
  const ageMs = Date.now() - new Date(`${latest.date}T00:00:00Z`).getTime();
  if (!(ageMs >= 0) || ageMs > maxAgeDays * 86400000) return null;
  const current = latest.sale ?? latest.regular;
  const regular = latest.regular ?? entry.typical_regular;
  if (current === null || regular === null || current >= regular) return null;
  return { current, regular };
}

export function pctOff(current: number | null, regular: number | null): number {
  if (current === null || regular === null || regular <= 0 || current >= regular) return 0;
  return Math.round((1 - current / regular) * 100);
}

// Builds an SVG polyline points-string from an entry's history (sale price
// when available, otherwise regular price). Returns null when there isn't
// enough data to draw an honest trend line — callers should show "—" instead.
export function sparklinePoints(history: HistoryEntry[]): string | null {
  const vals = history.map((h) => h.sale ?? h.regular).filter((v): v is number => v !== null);
  if (vals.length < 2) return null;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const pad = 3;
  const step = (w - pad * 2) / (vals.length - 1);

  return vals
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + (h - pad * 2) * (1 - (v - min) / range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export interface DealScoreResult {
  label: string;
  cls: string;
}

/**
 * Honest deal-score badge derived only from tracked data:
 *  - "At its lowest"     — at/near the lowest price we've ever tracked (best)
 *  - "Great deal"        — at or below this product's typical sale price
 *  - "On sale"           — below regular, but not yet at its typical sale depth
 *  - "Rarely discounts"  — no typical sale on record, or its "sale" barely
 *                          moves the needle (<5% off regular) — don't wait for one
 *  - "Wait for a sale"   — sitting at regular price, but it does discount sometimes
 *  - "No data"           — nothing to price at all
 */
export function dealScore(
  current: number | null,
  typicalRegular: number | null,
  typicalSale: number | null,
  allTimeLow: number | null,
): DealScoreResult {
  if (current === null) return { label: 'No data', cls: 'ds-unknown' };

  if (allTimeLow !== null && current <= allTimeLow * 1.02) {
    return { label: 'At its lowest', cls: 'ds-lowest' };
  }
  if (typicalSale !== null && current <= typicalSale) {
    return { label: 'Great deal', cls: 'ds-great' };
  }
  if (typicalRegular !== null && current < typicalRegular) {
    return { label: 'On sale', cls: 'ds-sale' };
  }
  if (typicalSale === null || (typicalRegular !== null && typicalSale >= typicalRegular * 0.95)) {
    return { label: 'Rarely discounts', cls: 'ds-rare' };
  }
  return { label: 'Wait for a sale', cls: 'ds-wait' };
}
