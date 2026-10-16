const keys = ['license', 'formats', 'macos_min', 'windows_min', 'apple_silicon', 'copy_protection', 'trial'];
const labels = { license: 'License', formats: 'Formats', macos_min: 'macOS', windows_min: 'Windows', apple_silicon: 'Apple Silicon', copy_protection: 'Copy protection', trial: 'Trial', source: 'Source', regular: 'Typical regular', sale: 'Typical sale', salesRecorded: 'Sales recorded', today: 'Today', verdict: 'Verdict', pb: 'Plugin Boutique' };
export const validFact = (fact) => Boolean(fact && fact.value !== null && fact.value !== undefined && fact.value !== '' && /^https:\/\//.test(fact.source_url ?? '') && fact.quote?.trim() && fact.fetched_at && ['vendor', 'vendor_docs'].includes(fact.source_kind));
const shown = (value) => Array.isArray(value) ? value.join(', ') : value === true ? 'Yes' : value === false ? 'No' : String(value);
const asArray = (value) => Array.isArray(value) ? value : value?.products ?? [];
const price = (value) => Number.isFinite(value) ? `$${value.toFixed(2)}` : null;

export function comparePrices(entry, now = Date.now()) {
  if (!entry) return {};
  const checks = (entry.history ?? []).filter((r) => OBSERVED_SOURCES.includes(r.source) && /^\d{4}-\d{2}-\d{2}$/.test(r.date ?? '')).sort((a, b) => a.date.localeCompare(b.date));
  const last = checks.at(-1) ?? {};
  const fresh = last.date && Date.parse(last.date) <= now && now - Date.parse(last.date) <= 14 * 86400000;
  const episodes = listSaleEpisodes({ history: checks });
  const lows = episodes.map((episode) => Math.min(...checks.filter((row) => row.date >= episode.start && row.date <= episode.end && Number.isFinite(row.sale)).map((row) => row.sale))).filter(Number.isFinite).sort((a, b) => a - b);
  const typicalSale = lows.length ? (lows[Math.floor((lows.length - 1) / 2)] + lows[Math.floor(lows.length / 2)]) / 2 : null;
  const observedPrice = comparablePrices({ ...entry, history: [last] }).find((row) => row.kind === 'tracker');
  return { regular: price(entry.typical_regular), sale: price(typicalSale), salesRecorded: episodes.length || null, today: fresh ? price(observedPrice?.price) : null, verdict: null, pb: entry.pb_url ?? null };
}

export function buildCompareModel({ slug = '', rawBody = '', catalog = [], vendorMap = [], vendorFacts = {}, vendorProducts = {}, priceEntries = {} }) {
  const ids = new Map();
  const normalize = (name) => name.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu)?.join(' ') ?? '';
  for (const name of [...asArray(catalog), ...asArray(vendorMap)]) if (name) ids.set(name, name);
  const byName = new Map();
  for (const [id, product] of Object.entries(vendorProducts)) {
    if (product?.status !== 'verified' || product?.superseded_by) continue;
    for (const name of [product.name, ...(product.aliases ?? [])]) if (name) byName.set(normalize(name), id);
  }
  for (const name of Object.keys(priceEntries)) byName.set(normalize(name), name);
  const headings = [...rawBody.matchAll(/^#{2,3}\s+(?:\d+[.)]\s*)?(.+)$/gm)].map((m) => m[1].trim());
  const matched = headings.map((name) => {
    const short = name.split(/\s+[—–]\s+/, 1)[0];
    return byName.get(normalize(short)) ?? short;
  });
  if (ids.size + headings.length >= 3) for (const id of matched) ids.set(id, id);
  const all = [...ids.keys()].map((id) => {
    const vendor = vendorFacts[id] ?? {};
    const facts = {};
    for (const key of keys) {
      const f = key === 'license' ? (validFact(vendor.is_free) ? vendor.is_free : vendor.price) : vendor[key];
      if (validFact(f)) facts[key] = { value: key === 'license' && f === vendor.is_free ? (f.value ? 'Free' : 'Paid') : key === 'license' && f.display ? f.display : shown(f.value), url: f.source_url, fetchedAt: f.fetched_at };
    }
    const entry = priceEntries[id] ?? priceEntries[vendorProducts[id]?.name];
    const prices = comparePrices(entry);
    return { id, name: vendorProducts[id]?.name ?? id, facts, prices, tracked: Boolean(entry) };
  });
  const free = /^(best-free-|free-alternative-)/.test(slug) || all.filter((r) => r.facts.license?.value === 'Free').length > all.length / 2;
  const coverage = { total: all.length, productIds: all.map((row) => row.id), qualified: all.filter((r) => Object.keys(r.facts).length >= 3).length, ratio: 0 };
  coverage.ratio = coverage.total ? coverage.qualified / coverage.total : 0;
  const base = { mode: 'none', columns: [], rows: [], alsoCovered: [], coverage, free };
  if (!all.length) return base;
  if (free) {
    const qualified = all.filter((r) => Object.keys(r.facts).length >= 2);
    if (!qualified.length) return base;
    if (coverage.ratio < .6) return { ...base, mode: 'list', rows: qualified };
    const columns = ['license', 'formats', 'macos_min', 'windows_min', 'source'].map((key) => ({ key, label: labels[key] }));
    const rows = all.filter((r) => Object.keys(r.facts).length >= 3);
    const alsoCovered = all.filter((r) => !rows.includes(r)).map((r) => r.name);
    const filled = rows.reduce((n, r) => n + ['license', 'formats', 'macos_min', 'windows_min'].filter((key) => r.facts[key]).length + 1, 0);
    coverage.cellRatio = filled / (rows.length * columns.length);
    if (coverage.cellRatio < .7) return { ...base, mode: 'list', rows: qualified, coverage };
    return { ...base, mode: 'table', columns, rows, alsoCovered, coverage };
  }
  let rows = all.filter((r) => Object.keys(r.facts).length + Object.values(r.prices).filter(Boolean).length >= 2);
  const alsoCovered = all.filter((r) => !rows.includes(r)).map((r) => r.name);
  const columns = keys.filter((key) => rows.filter((r) => r.facts[key]).length >= Math.ceil(rows.length * 2 / 3)).map((key) => ({ key, label: labels[key] }));
  if (rows.filter((r) => r.tracked).length >= 2) columns.push(...['regular', 'sale', 'salesRecorded', 'today', 'verdict'].filter((key) => rows.some((row) => row.prices[key])).map((key) => ({ key, label: labels[key] })));
  if (rows.filter((r) => r.prices.pb).length >= Math.ceil(rows.length * 2 / 3)) columns.push({ key: 'pb', label: labels.pb });
  const filled = rows.reduce((n, r) => n + columns.filter((c) => r.facts[c.key] || r.prices[c.key]).length, 0);
  coverage.cellRatio = rows.length && columns.length ? filled / (rows.length * columns.length) : 0;
  if (!rows.length || coverage.cellRatio < .7) return { ...base, alsoCovered: all.map((r) => r.name), coverage };
  return { ...base, mode: 'table', columns, rows, alsoCovered, coverage };
}
import { listSaleEpisodes } from './indexPolicy.mjs';
import { OBSERVED_SOURCES, comparablePrices } from './priceBasis.mjs';
