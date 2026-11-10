import { MEASURED_SOURCES } from './siteStats.mjs';
import { listSaleEpisodes } from './indexPolicy.mjs';
import { categoryForProduct } from './categoryInference.mjs';
import { lowestSeen } from './priceBasis.mjs';

export const MIN_CATEGORY_PEERS = 5;
export const FRESH_DAYS = 7;
const depthCache = new WeakMap();
const measured = new Set(MEASURED_SOURCES);
const finite = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;
const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const days = (start, end) => Math.round((Date.parse(end) - Date.parse(start)) / 86400000);

export function measuredPriceChecks(entry) {
  const byDate = new Map();
  for (const row of Array.isArray(entry?.history) ? entry.history : []) {
    if (!measured.has(row?.source) || !validDate(row.date)
      || (row.store != null && row.store !== 'plugin_boutique')
      || (row.cur != null && row.cur !== 'USD')
      || (!finite(row.sale) && !(row.reg_src !== 'typical' && finite(row.regular)))) continue;
    const prior = byDate.get(row.date);
    if (!prior || (!finite(prior.sale) && finite(row.sale))) byDate.set(row.date, row);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function saleShare(entry) {
  const checks = measuredPriceChecks(entry);
  if (checks.length < 8) return null;
  const counts = new Map();
  let saleDays = 0;
  for (const row of checks) {
    if (finite(row.sale)) saleDays++;
    const price = finite(row.sale) ? row.sale : row.regular;
    counts.set(price, (counts.get(price) ?? 0) + 1);
  }
  return { saleDays, totalDays: checks.length, first: checks[0].date, last: checks.at(-1).date,
    levels: [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 3).map(([price, days]) => ({ price, days })),
    everyCheck: saleDays === checks.length };
}

export function episodeRows(entry) {
  const checks = measuredPriceChecks(entry);
  const episodes = listSaleEpisodes({ history: checks });
  const depthOf = (episode) => {
    const depths = checks.filter((row) => row.date >= episode.start && row.date <= episode.end
      && finite(row.sale) && finite(row.regular) && row.regular > row.sale)
      .map((row) => Math.round((1 - row.sale / row.regular) * 100));
    return depths.length ? Math.max(...depths) : null;
  };
  return episodes.map((episode, index) => {
    const previous = episodes[index + 1];
    const after = checks.find((row) => row.date > episode.end && !finite(row.sale) && finite(row.regular));
    return { ...episode, number: episodes.length - index, depth: depthOf(episode),
      previousDepth: previous ? depthOf(previous) : null,
      daysSincePrevious: previous ? days(previous.end, episode.start) : null,
      returnPrice: after?.regular ?? null, returnDate: after?.date ?? null };
  });
}

export function saleGaps(facts, buildDate) {
  const gaps = facts?.breaks ?? [];
  if (!gaps.length && facts?.state !== 'list') return null;
  const lastSaleEnd = facts?.state === 'list' ? facts.sales?.at(-1)?.end ?? null : null;
  const lastCheck = facts?.latestPriced?.date ?? null;
  return { gaps: [...gaps], sinceLastSale: lastSaleEnd && lastCheck ? days(lastSaleEnd, lastCheck) : null, lastSaleEnd };
}

export function maxRecordedDepth(entry) {
  if (entry && depthCache.has(entry)) return depthCache.get(entry);
  const depths = episodeRows(entry).map((row) => row.depth).filter((depth) => depth !== null);
  const depth = depths.length ? Math.max(...depths) : null;
  if (entry) depthCache.set(entry, depth);
  return depth;
}

export function categoryDepthRank(name, entry, peers) {
  const self = peers.find((peer) => peer.name === name);
  const category = categoryForProduct(name, entry, self?.kind === 'bundle');
  const group = peers.filter((peer) => categoryForProduct(peer.name, peer.entry, peer.kind === 'bundle') === category);
  const depth = maxRecordedDepth(entry);
  if (!category || group.length < MIN_CATEGORY_PEERS || depth === null) return null;
  return { category, peers: group.length, deeper: group.filter((peer) => (maxRecordedDepth(peer.entry) ?? -1) > depth).length, depth };
}

export function freshness(entry, buildDate) {
  const lastCheck = measuredPriceChecks(entry).at(-1)?.date ?? null;
  const ageDays = lastCheck && validDate(buildDate) ? days(lastCheck, buildDate) : null;
  return { lastCheck, ageDays, fresh: ageDays !== null && ageDays >= 0 && ageDays <= FRESH_DAYS };
}

export function distanceFromLow(entry, buildDate) {
  if (!freshness(entry, buildDate).fresh) return null;
  const row = measuredPriceChecks(entry).at(-1);
  const low = lowestSeen(entry);
  if (!row || !low) return null;
  const latestPrice = finite(row.sale) ? row.sale : row.regular;
  return { latestPrice, latestDate: row.date, low: low.price, lowDate: low.date,
    diff: Math.round((latestPrice - low.price) * 100) / 100 };
}
