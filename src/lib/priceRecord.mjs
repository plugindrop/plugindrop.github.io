import { MIN_SALE_EPISODES, listSaleEpisodes } from './indexPolicy.mjs';

const ownSources = new Set(['auto_check', 'live_check', 'pb_deals_poll']);
const money = (value) => `$${Number(value).toFixed(2)}`;
const finite = (value) => typeof value === 'number' && Number.isFinite(value);

/** Build only facts supported by our own price observations. */
export function priceRecord(entry) {
  const checks = (Array.isArray(entry?.history) ? entry.history : [])
    .filter((row) => ownSources.has(row?.source) && /^\d{4}-\d{2}-\d{2}$/.test(row?.date ?? '') && (finite(row.sale) || finite(row.regular) && row.reg_src !== 'typical'))
    .sort((a, b) => a.date.localeCompare(b.date));
  const last = checks.at(-1);
  const observed = last ? { date: last.date, price: last.sale ?? last.regular } : null;
  const episodes = listSaleEpisodes({ history: checks });
  if (episodes.length < MIN_SALE_EPISODES) return { enough: false, checks: checks.length, observed };
  const previous = episodes.find((episode) => checks.some((row) => row.date > episode.end && !finite(row.sale)));
  const saleRows = previous ? checks.filter((row) => row.date >= previous.start && row.date <= previous.end && finite(row.sale)) : [];
  const low = saleRows.length ? Math.min(...saleRows.map((row) => row.sale)) : null;
  const regular = saleRows.find((row) => finite(row.regular))?.regular ?? null;
  const depth = finite(low) && finite(regular) && regular > low ? Math.round((1 - low / regular) * 100) : null;
  const returned = previous ? checks.find((row) => row.date > previous.end && row.source === 'pb_deals_poll' && !finite(row.sale) && finite(row.regular)) : null;
  const lows = checks.filter((row) => finite(row.sale)).map((row) => row.sale);
  return {
    enough: true,
    from: checks[0]?.date,
    to: checks.at(-1)?.date,
    checks: checks.length,
    observed,
    episodes: episodes.length,
    previous: previous ? { end: previous.end, depth } : null,
    returned: returned ? { date: returned.date, price: money(returned.regular) } : null,
    lowest: lows.length ? money(Math.min(...lows)) : null,
  };
}
