import { ownChecks } from './dealSignals.mjs';
import { listSaleEpisodes } from './indexPolicy.mjs';

const money = value => `$${Number.isInteger(value) ? value : value.toFixed(2)}`;
const median = values => { const sorted = [...values].sort((a, b) => a - b); return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2; };
export function priceStatTiles(entry, now = Date.now()) {
  const checks = ownChecks(entry).filter(row => Date.parse(`${row.date}T00:00:00Z`) <= now && (Number.isFinite(row.sale) || Number.isFinite(row.regular)));
  if (!checks.length) return [];
  const latest = checks.at(-1);
  const current = Number.isFinite(latest.sale) ? latest.sale : latest.regular;
  const values = checks.map(row => Number.isFinite(row.sale) ? row.sale : row.regular).filter(Number.isFinite);
  const month = new Date(`${checks[0].date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const tiles = [
    { label: 'Current', value: money(current), note: latest.date },
    { label: "Lowest we've tracked", value: money(Math.min(...values)), note: `since ${month} · ${checks.length} checks` },
  ];
  const regular = [...checks].reverse().find(row => Number.isFinite(row.regular) && row.reg_src === 'page') ?? [...checks].reverse().find(row => Number.isFinite(row.regular));
  if (regular) tiles.push({ label: 'Regular (list)', value: money(regular.regular), note: regular.reg_src === 'page' ? 'product page' : 'reference list price' });
  const episodes = listSaleEpisodes({ history: checks });
  const prior = episodes.slice(Number.isFinite(latest.sale) ? 1 : 0);
  if (prior.length >= 2) {
    const lows = prior.map(ep => Math.min(...checks.filter(row => row.date >= ep.start && row.date <= ep.end && Number.isFinite(row.sale)).map(row => row.sale)));
    tiles.push({ label: 'Usual sale', value: money(median(lows)), note: `median of ${prior.length} prior sales` });
  }
  return tiles;
}
