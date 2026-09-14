/**
 * Types and deterministic text helpers for the programmatic /best/ and
 * /compare/ routes (design: docs/design-compare-best-pages-2026-08-09.md).
 *
 * The manifest (programmatic_pages.json) is a permission ledger only — it
 * never carries prices, verdicts, or copy. Everything here recomputes those
 * live from price_history.json at build time, reusing priceUtils.ts so the
 * verdict logic is never reimplemented a second time.
 */

import {
  currentPriceOf,
  regularPriceOf,
  dealScore,
  dealScoreNumeric,
  liveDropOf,
  latestCheckedDate,
  formatCheckedDate,
  formatPrice,
  slugify,
  type PriceEntry,
} from './priceUtils';

// --- Manifest types (mirrors astro-site/dtm/src/data/programmatic_pages.json) ---

export interface ManifestSelection {
  product_count?: number;
  median_observations?: number;
  score?: number;
  demand_a?: number;
  demand_b?: number;
  reason?: string;
}

export interface ManifestCategory {
  slug: string;
  label: string;
  status: 'published' | 'draft';
  first_published: string;
  products: string[];
  editorial_post: string | null;
  when_does_posts: string[];
  selection: ManifestSelection;
}

export interface ManifestPair {
  slug: string;
  status: 'published' | 'draft';
  first_published: string;
  a: string;
  b: string;
  category: string;
  selection: ManifestSelection;
  when_does: { a: string | null; b: string | null };
  editorial_post: string | null;
}

export interface ProgrammaticManifest {
  schema_version: number;
  generated_at: string;
  source_last_updated: string;
  policy: Record<string, unknown>;
  categories: ManifestCategory[];
  pairs: ManifestPair[];
}

export interface ProgrammaticPriceData {
  last_updated: string;
  plugins?: Record<string, PriceEntry>;
  bundles?: Record<string, PriceEntry>;
}

function lookupEntry(name: string, priceData: ProgrammaticPriceData): PriceEntry | null {
  return priceData.plugins?.[name] ?? priceData.bundles?.[name] ?? null;
}

// --- Verdict row (one product, live-recomputed) ---

export type FableVerdict = 'BUY NOW' | 'FAIR SALE' | 'AVERAGE' | 'WAIT';

export interface VerdictRow {
  name: string;
  slug: string;
  current: number | null;
  regular: number | null;
  allTimeLow: number | null;
  verdict: FableVerdict;
  score: number;
  observations: number;
  checkedLabel: string | null;
  hasLiveDrop: boolean;
  rarelyDiscounts: boolean;
}

// TODO(design §5 Step 3): this duplicates fableVerdictLabel() in
// pages/plugin-prices/[slug].astro. Not consolidated in this PR (1 PR = 1
// change) — future PR should move both call sites onto this one function.
export function fableVerdictLabel(entry: PriceEntry): FableVerdict {
  const ds = dealScoreNumeric(entry);
  if (ds.verdict === 'none') return 'WAIT';
  if (ds.verdict === 'good') return 'BUY NOW';
  if (ds.verdict === 'ok') return 'FAIR SALE';
  const current = currentPriceOf(entry);
  const regular = regularPriceOf(entry);
  const onSale = current !== null && regular !== null && current < regular;
  return onSale ? 'AVERAGE' : 'WAIT';
}

export function rowFor(name: string, priceData: ProgrammaticPriceData): VerdictRow | null {
  const entry = lookupEntry(name, priceData);
  if (!entry) return null;

  const current = currentPriceOf(entry);
  const regular = regularPriceOf(entry);
  const ds = dealScoreNumeric(entry);
  const checkedDate = latestCheckedDate(entry);
  // Observation count mirrors liveDropOf's own discipline: only auto_check
  // rows count as a real observation (design doc §10).
  const observations = entry.history.filter((h) => h.source === 'auto_check').length;
  const label = dealScore(current, entry.typical_regular, entry.typical_sale, entry.all_time_low).label;

  return {
    name,
    slug: slugify(name),
    current,
    regular,
    allTimeLow: entry.all_time_low,
    verdict: fableVerdictLabel(entry),
    score: ds.score,
    observations,
    checkedLabel: checkedDate ? formatCheckedDate(checkedDate) : null,
    hasLiveDrop: liveDropOf(entry, 7) !== null,
    rarelyDiscounts: label === 'Rarely discounts',
  };
}

export function rowsFor(names: string[], priceData: ProgrammaticPriceData): VerdictRow[] {
  return names
    .map((name) => rowFor(name, priceData))
    .filter((row): row is VerdictRow => row !== null);
}

// Table sort order per design doc §5 Step 4: score desc, observations desc, name asc.
export function sortRows(rows: VerdictRow[]): VerdictRow[] {
  return [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.observations !== a.observations) return b.observations - a.observations;
    return a.name.localeCompare(b.name);
  });
}

// --- Deterministic copy (template-only, no LLM — design doc §8 item 2) ---

export function categoryIntro(label: string, rows: VerdictRow[]): string {
  const trackedCount = rows.length;
  const onSaleCount = rows.filter((r) => r.hasLiveDrop).length;
  const saleClause = onSaleCount > 0
    ? `${onSaleCount} of them ${onSaleCount === 1 ? 'has' : 'have'} a live price drop right now.`
    : 'None of them have a live price drop right now.';
  return `We track ${trackedCount} ${label} plugin${trackedCount === 1 ? '' : 's'} at Plugin Boutique. `
    + `${saleClause} Rankings here are based purely on our own tracked pricing data — no developer pays for placement.`;
}

export interface Faq {
  q: string;
  a: string;
}

export function categoryFaqs(label: string, rows: VerdictRow[]): Faq[] {
  const trackedCount = rows.length;
  const liveDrops = rows.filter((r) => r.hasLiveDrop);
  const best = sortRows(rows)[0] ?? null;

  const saleAnswer = liveDrops.length > 0
    ? `Yes — right now ${liveDrops.length} ${label} plugin${liveDrops.length === 1 ? ' has' : 's have'} a live, recently-checked price drop. See the "On sale right now" section above.`
    : `Not at the moment — none of the ${label} plugins we track have a live price drop right now. Check back, or set a price alert on the ones you're watching.`;

  const bestAnswer = best
    ? `Based on our tracked pricing, ${best.name} currently has the strongest deal score (${best.score}/100) among ${label} plugins.`
    : `We don't have enough tracked pricing data yet to call out a single best deal in this category.`;

  return [
    { q: `Is any ${label} plugin on sale right now?`, a: saleAnswer },
    { q: `Which ${label} plugin is the best deal right now?`, a: bestAnswer },
    { q: `How many ${label} plugins do you track?`, a: `We track ${trackedCount} ${label} plugin${trackedCount === 1 ? '' : 's'} at Plugin Boutique, with verdicts recalculated from our own price history on every update.` },
  ];
}

// --- Compare-page helpers (design doc §5 Step 5, used by a later PR) ---

export function compareHeadline(a: VerdictRow, b: VerdictRow): string {
  const [better, other] = a.score >= b.score ? [a, b] : [b, a];
  return `Right now ${better.name} is the better buy at ${formatPrice(better.current)} (${better.score}/100); `
    + `${other.name} sits at ${formatPrice(other.current)} (${other.score}/100).`;
}
