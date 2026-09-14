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
  pctOff,
  sparklinePoints,
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

export interface DiscountFrequency {
  totalObservations: number;
  saleObservations: number;
  maxDiscountPct: number;
}

export interface VerdictRow {
  name: string;
  slug: string;
  pbUrl: string | null;
  current: number | null;
  regular: number | null;
  allTimeLow: number | null;
  verdict: FableVerdict;
  score: number;
  observations: number;
  checkedLabel: string | null;
  hasLiveDrop: boolean;
  rarelyDiscounts: boolean;
  sparkline: string | null;
  discountFrequency: DiscountFrequency | null;
}

// Discount frequency mirrors the same auto_check-only discipline as
// observation counting elsewhere (design doc §10) — poll/backfill rows don't
// count as a real "did we check and see a sale" event.
function discountFrequencyOf(entry: PriceEntry): DiscountFrequency | null {
  const obs = entry.history.filter((h) => h.source === 'auto_check');
  if (obs.length === 0) return null;

  let saleObservations = 0;
  let maxDiscountPct = 0;
  for (const h of obs) {
    const pct = pctOff(h.sale, h.regular);
    if (pct > 0) {
      saleObservations += 1;
      if (pct > maxDiscountPct) maxDiscountPct = pct;
    }
  }
  return { totalObservations: obs.length, saleObservations, maxDiscountPct };
}

export function discountFrequencyLabel(freq: DiscountFrequency | null): string {
  if (!freq || freq.totalObservations === 0) return 'No record';
  if (freq.saleObservations === 0) return `Never discounted in ${freq.totalObservations} checks`;
  const pct = Math.round((freq.saleObservations / freq.totalObservations) * 100);
  return `On sale in ${pct}% of ${freq.totalObservations} checks (up to ${freq.maxDiscountPct}% off)`;
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
    pbUrl: entry.pb_url ?? null,
    current,
    regular,
    allTimeLow: entry.all_time_low,
    verdict: fableVerdictLabel(entry),
    score: ds.score,
    observations,
    checkedLabel: checkedDate ? formatCheckedDate(checkedDate) : null,
    hasLiveDrop: liveDropOf(entry, 7) !== null,
    rarelyDiscounts: label === 'Rarely discounts',
    sparkline: sparklinePoints(entry.history),
    discountFrequency: discountFrequencyOf(entry),
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

// --- Compare-page helpers (design doc §5 Step 5) ---

export function compareHeadline(a: VerdictRow, b: VerdictRow): string {
  const [better, other] = a.score >= b.score ? [a, b] : [b, a];
  return `Right now ${better.name} is the better buy at ${formatPrice(better.current)} (${better.score}/100); `
    + `${other.name} sits at ${formatPrice(other.current)} (${other.score}/100).`;
}

// Null when either side lacks 2+ history points — callers should show the
// "not enough history to compare" fallback for BOTH sparklines rather than
// one alone (design doc §5 Step 5 item 4).
export function pairSparklineNote(a: VerdictRow, b: VerdictRow): string | null {
  if (a.sparkline && b.sparkline) return null;
  return "We don't have enough price history yet to chart a comparison for both products.";
}

function discountCompareAnswer(a: VerdictRow, b: VerdictRow): string {
  const fa = a.discountFrequency;
  const fb = b.discountFrequency;
  if (!fa && !fb) return `We don't have enough recorded checks for either product yet.`;
  if (!fa) return `${b.name} has a discount record (${discountFrequencyLabel(fb)}); ${a.name} doesn't have enough recorded checks yet.`;
  if (!fb) return `${a.name} has a discount record (${discountFrequencyLabel(fa)}); ${b.name} doesn't have enough recorded checks yet.`;

  const rateA = fa.totalObservations > 0 ? fa.saleObservations / fa.totalObservations : 0;
  const rateB = fb.totalObservations > 0 ? fb.saleObservations / fb.totalObservations : 0;
  if (rateA === rateB) {
    return `${a.name} and ${b.name} discount about as often as each other based on our tracked checks.`;
  }
  const more = rateA > rateB ? a : b;
  const less = rateA > rateB ? b : a;
  return `${more.name} discounts more often than ${less.name} based on our tracked checks `
    + `(${discountFrequencyLabel(more.discountFrequency)} vs. ${discountFrequencyLabel(less.discountFrequency)}).`;
}

export function pairFaqs(a: VerdictRow, b: VerdictRow): Faq[] {
  return [
    { q: `Is ${a.name} or ${b.name} cheaper right now?`, a: compareHeadline(a, b) },
    { q: `Which discounts more often, ${a.name} or ${b.name}?`, a: discountCompareAnswer(a, b) },
    {
      q: `What's the lowest price recorded for ${a.name} and ${b.name}?`,
      a: `${a.name}'s lowest tracked price is ${formatPrice(a.allTimeLow)}; ${b.name}'s is ${formatPrice(b.allTimeLow)}.`,
    },
  ];
}
