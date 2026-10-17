import { MIN_OWN_TRACKING_DAYS, listSaleEpisodes } from './indexPolicy.mjs';
import { dealState } from './articleDeal.mjs';

const SOURCES = new Set(['auto_check', 'live_check', 'pb_deals_poll']);
const DAY = 86400000;
const valid = row => SOURCES.has(row?.source) && /^\d{4}-\d{2}-\d{2}$/.test(row?.date ?? '');
const dateMs = s => Date.parse(`${s}T00:00:00Z`);
const dateText = s => new Date(`${s}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const monthText = s => new Date(`${s}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const money = n => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const median = ns => { const a = [...ns].sort((x, y) => x - y); return a.length ? (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2 : null; };

export function ownChecks(entry) { return (entry?.history ?? []).filter(valid).sort((a, b) => a.date.localeCompare(b.date)); }
export function ownSpanDays(entry) { const rows = ownChecks(entry); return rows.length < 2 ? 0 : (dateMs(rows.at(-1).date) - dateMs(rows[0].date)) / DAY; }
function episodes(entry) { const rows = ownChecks(entry); return listSaleEpisodes({ history: rows }).map(ep => ({ ...ep, low: Math.min(...rows.filter(r => r.date >= ep.start && r.date <= ep.end && typeof r.sale === 'number').map(r => r.sale)) })); }

export function urgencyTag(entry, now) {
  if (dealState(entry, now) !== 'live') return null;
  const latest = ownChecks(entry).filter(r => r.source === 'auto_check').at(-1);
  if (!latest?.until || !/^\d{4}-\d{2}-\d{2}$/.test(latest.until)) return null;
  const days = Math.round((dateMs(latest.until) - dateMs(new Date(now + 9 * 3600000).toISOString().slice(0, 10))) / DAY);
  if (days < 0 || days > 21) return null;
  return days === 0 ? { type: 'ends-today', text: 'Ends today' } : days <= 3 ? { type: 'ends-soon', text: `Ends in ${days} ${days === 1 ? 'day' : 'days'}` } : { type: 'ends-on', text: `Ends ${dateText(latest.until)}` };
}

export function rarityTag(entry, now) {
  if (dealState(entry, now) !== 'live') return null;
  const rows = ownChecks(entry);
  const span = ownSpanDays(entry);
  if (span < MIN_OWN_TRACKING_DAYS) return null;
  const eps = episodes(entry);
  if (!eps.length) return null;
  const first = rows[0].date;
  const current = eps[0].low;
  const previous = eps.slice(1).map(ep => ep.low);
  if (previous.length && current < Math.min(...previous) - 0.01) return { type: 'new-low', text: 'New low', full: `Lowest price in ${span} days of tracking (since ${monthText(first)})` };
  if (eps.length === 1) {
    const before = rows.filter(r => r.date < eps[0].start && r.sale == null);
    const months = Math.floor((dateMs(eps[0].start) - dateMs(first)) / DAY / 30);
    if (before.length >= 5 && dateMs(eps[0].start) - dateMs(first) >= 60 * DAY && months >= 2) return { type: 'first-sale', text: `First sale in ${months} months`, full: `First discount we've recorded in ${months} months of checks` };
  }
  if (previous.length && current <= Math.min(...previous) + 0.01) return { type: 'matches-low', text: 'Matches lowest', full: `Matches the lowest price we've recorded since ${monthText(first)}` };
  const typical = median(previous);
  if (eps.length >= 3 && typical !== null && current <= typical * 0.9) return { type: 'deeper-than-usual', text: 'Deeper than usual', full: `Lower than its usual sale price of ${money(typical)} since ${monthText(first)}` };
  return null;
}

export function supportChips(entry, now, max = 1) {
  const rows = ownChecks(entry), eps = episodes(entry), prior = eps.slice(1);
  const chips = [];
  if (prior.length >= 2) chips.push(`Usually ${money(median(prior.map(ep => ep.low)))} when on sale`);
  if (eps.length >= 2) chips.push(`On sale ${eps.length}× since ${monthText(rows[0].date)}`);
  if (prior[0]) chips.push(`Last sale ended ${dateText(prior[0].end)} at ${money(prior[0].low)}`);
  const regular = rows.filter(r => r.sale == null && typeof r.regular === 'number');
  if (regular.length >= 3) chips.push(`Regular price ${money(regular.at(-1).regular)} since ${monthText(regular[0].date)}`);
  return chips.slice(0, max);
}
