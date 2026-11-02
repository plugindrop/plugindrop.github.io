import { MEASURED_SOURCES } from './siteStats.mjs';
import { listSaleEpisodes } from './indexPolicy.mjs';
import { listPriceChanges } from './priceInsights.mjs';
import { formatPrice } from './priceUtils.ts';

export const BF_CHECK_ENABLED = false;
const DAY_MS = 86400000;
const measuredSources = new Set(MEASURED_SOURCES);
const finite = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;
const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const day = (date) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;
const difference = (high, low) => formatPrice(Math.round((high - low) * 100) / 100);
const month = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const price = (row) => finite(row.sale) ? row.sale : row.reg_src !== 'typical' && finite(row.regular) ? row.regular : null;

function checks(entry) {
  return (Array.isArray(entry?.history) ? entry.history : [])
    .filter((row) => measuredSources.has(row?.source) && validDate(row.date)
      && (row.store == null || row.store === 'plugin_boutique')
      && (row.cur == null || row.cur === 'USD') && price(row) !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function previousSales(rows, currentStart) {
  return listSaleEpisodes({ history: rows })
    .filter((episode) => episode.end < currentStart && rows.some((row) => row.date > episode.end && row.date < currentStart && !finite(row.sale)))
    .map((episode) => ({ ...episode, low: Math.min(...rows.filter((row) => row.date >= episode.start && row.date <= episode.end && finite(row.sale)).map((row) => row.sale)) }));
}

function l1(rows, currentStart, p) {
  const earlier = previousSales(rows, currentStart);
  if (!earlier.length) return null;
  const m = Math.min(...earlier.map((episode) => episode.low));
  const matched = earlier.filter((episode) => episode.low === m);
  const reference = matched[0];
  const M = month(reference.start);
  if (p < m * 0.98) return `Lowest price we've recorded: ${formatPrice(p)}, ${difference(m, p)} below the previous low of ${formatPrice(m)} (${M}).`;
  if (Math.abs(p - m) <= m * 0.02) {
    const subject = earlier[0].low === m ? 'its last sale' : `${matched.length} of its ${earlier.length} earlier sales`;
    return `Same price as ${subject} (${formatPrice(m)}, ${M}). Not a new low.`;
  }
  return `${difference(p, m)} above the ${formatPrice(m)} it reached in ${M}.`;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function l2(rows, latest, currentStart, flags) {
  if (latest.reg_src !== 'page' || !finite(latest.regular)) return null;
  const window = rows.filter((row) => row.date < currentStart && day(currentStart) - day(row.date) <= 120);
  if (window.length < 8) return null;
  const med = median(window.map(price));
  const R = latest.regular, p = latest.sale;
  if (R / med > 5) {
    flags.push('list_price_needs_review');
    return null;
  }
  const a = window.filter((row) => finite(row.sale)).length, b = window.length;
  const K = Math.round((1 - p / R) * 100), N = Math.round((1 - p / med) * 100);
  const d1 = window[0].date, d2 = window.at(-1).date;
  if (a / b >= 0.5 && K - N >= 10) {
    const ending = N <= 0 ? "Today's price is not below that median."
      : `Today's price is ${N}% below that, against the ${K}% shown from the ${formatPrice(R)} list price.`;
    return `On sale in ${a} of ${b} checks from ${d1} to ${d2}; the median price we saw was ${formatPrice(med)}. ${ending}`;
  }
  if (a / b <= 0.2 && K >= 25)
    return `Listed at ${formatPrice(R)} in ${b - a} of ${b} checks from ${d1} to ${d2}, so the ${K}% is measured from the price the store charged most of the time.`;
  return null;
}

function l3(rows, currentStart) {
  const before = rows.filter((row) => row.date < currentStart);
  const changes = listPriceChanges({ history: before }).filter((change) => day(currentStart) - day(change.date) <= 60);
  const rising = changes.map((change) => {
    const prior = before.filter((row) => row.date < change.date && !finite(row.sale) && row.reg_src === 'page' && finite(row.regular)).at(-1);
    return { ...change, from: prior?.regular ?? null };
  }).filter((change) => finite(change.from) && change.regular > change.from);
  const change = rising.at(-1);
  return change ? `The list price rose from ${formatPrice(change.from)} to ${formatPrice(change.regular)} on ${change.date}, ${day(currentStart) - day(change.date)} days before this sale began.` : null;
}

/** Return only statements supported by this product's measured price history. */
export function discountCheck(entry, { buildDate } = {}) {
  if (!validDate(buildDate)) return null;
  const rows = checks(entry), latest = rows.at(-1);
  if (!latest || !finite(latest.sale) || day(buildDate) - day(latest.date) < 0 || day(buildDate) - day(latest.date) > 7) return null;
  const dates = [...new Set(rows.filter((row) => row.date <= buildDate).map((row) => row.date))];
  if (dates.length < 8 || day(dates.at(-1)) - day(dates[0]) < 28) return null;
  const current = listSaleEpisodes({ history: rows })[0];
  if (!current || latest.date < current.start || latest.date > current.end) return null;
  const flags = [];
  const lines = [
    { key: 'L1', text: l1(rows, current.start, latest.sale) },
    { key: 'L2', text: l2(rows, latest, current.start, flags) },
    { key: 'L3', text: l3(rows, current.start) },
  ].filter((line) => line.text !== null);
  return lines.length ? { lines, flags } : null;
}

/** Dormant Black Friday comparison. A caller must opt in explicitly. */
export function bfCheck(entry, baselineProduct, { buildDate, enabled = BF_CHECK_ENABLED } = {}) {
  if (!enabled || !validDate(buildDate) || !/^2026-11-\d{2}$/.test(buildDate)
    || !baselineProduct || baselineProduct.n_baseline < 8 || baselineProduct.dominant_store_share < 0.9
    || !finite(baselineProduct.baseline_median) || !finite(baselineProduct.baseline_low?.price)
    || !validDate(baselineProduct.baseline_low.date)) return null;
  const latest = checks(entry).at(-1);
  if (!latest || !finite(latest.sale) || day(buildDate) - day(latest.date) < 0 || day(buildDate) - day(latest.date) > 7) return null;
  return `Black Friday check: ${formatPrice(latest.sale)} against a Jul–Oct median of ${formatPrice(baselineProduct.baseline_median)} and low of ${formatPrice(baselineProduct.baseline_low.price)} (${baselineProduct.baseline_low.date}), from ${baselineProduct.n_baseline} checks frozen on 2026-11-02.`;
}
