// One-sentence "buy now or wait" verdict for a price page.
// Pure: every number comes from values the page already renders
// (latest priced check, lowest recorded price, tracked sale episodes,
// gaps between sales, store end date, check count, category depth rank).
import { formatPrice } from './priceUtils.ts';

export const MIN_CHECKS_FOR_VERDICT = 3;
export const STALE_DAYS = 7;

const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const money = (n) => formatPrice(n);
const cents = (n) => Math.round(n * 100);
const minus = (a, b) => (cents(a) - cents(b)) / 100;
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const joinList = (a) => a.length <= 1 ? (a[0] ?? '') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`;
const nums = (a) => a.length <= 4 ? joinList(a.map(String)) : `${Math.min(...a)} to ${Math.max(...a)}`;

function rankLine(rank) {
  if (!rank) return null;
  return rank.deeper === 0
    ? `No product among the ${rank.peers} ${rank.category} products we track has a deeper recorded cut than its ${rank.depth}%.`
    : `${rank.deeper} of the ${rank.peers} ${rank.category} products we track ${rank.deeper === 1 ? 'has' : 'have'} had a deeper recorded cut than its ${rank.depth}%.`;
}

/**
 * @param {object} input
 * @param {string} input.name
 * @param {object} input.facts   buildPageFacts() result
 * @param {{price:number,date:string}|null} input.low  lowestSeen() result
 * @param {object|null} [input.rank] categoryDepthRank() result
 * @param {string} [input.label]  banner verdict label (BUY NOW / FAIR SALE / AVERAGE / WAIT)
 * @param {string} input.buildDate YYYY-MM-DD
 * @param {number|null} [input.shownPrice] price in the page's current / last-recorded tile
 * @returns {{ key: string, text: string } | null}
 */
export function priceVerdict({ name, facts, low, rank = null, label = '', buildDate, shownPrice }) {
  const out = (key, ...parts) => ({ key, text: parts.filter(Boolean).join(' ') });
  if (!facts) return null;
  if (facts.state === 'no_checks' || !facts.latestPriced) {
    return out('no_reading', `We have not read a store price for ${name} yet, so this page has nothing to weigh buying now against waiting.`);
  }
  const r = facts.latestPriced;
  const dates = [...new Set(facts.checks.map((row) => row.date))].sort();
  const n = dates.length;
  const price = finite(r.sale) ? r.sale : r.regular;
  const regular = finite(r.regular) ? r.regular : null;
  if (!finite(price)) return null;
  if (shownPrice !== undefined && shownPrice !== price) {
    return out('unsettled', `Our checks of ${name} disagree on its latest price (last clean reading ${r.date}), so we are not drawing a buy-or-wait call from them until a newer check settles it.`);
  }

  if (n < MIN_CHECKS_FOR_VERDICT) {
    const span = n === 1 ? `one price check (${dates[0]})` : `${n} price checks (${dates[0]} and ${dates.at(-1)})`;
    return out('short_record', `With only ${span} on file, our record cannot yet show how often ${name} goes on sale or how low it gets; the latest check showed ${money(price)}${finite(r.sale) && regular !== null && regular > r.sale ? ` against a ${money(regular)} list price` : ''}.`);
  }

  const L = low && finite(low.price) ? low.price : null;
  const age = buildDate ? days(r.date, buildDate) : 0;
  const stale = age > STALE_DAYS || age < 0;

  if (facts.state === 'on_sale') {
    const p = r.sale;
    const cur = facts.sales.at(-1);
    const atLow = L === null || cents(p) <= cents(L);
    if (stale) {
      return out('stale_sale', `Our latest reading, on ${r.date}, had ${name} on sale at ${money(p)}${atLow ? ', the lowest price we have recorded' : `, ${money(minus(p, L))} above the ${money(L)} low we recorded on ${low.date}`}; that sale may have changed since, so confirm the store price before deciding.`);
    }
    if (atLow) {
      if (facts.sales.length === 1 && !cur?.leftCensored) {
        return out('first_sale', `${name} had not shown a sale price in our checks before ${cur.start}, so today's ${money(p)} is also the lowest we have recorded${facts.until ? `; the store listed the offer until ${facts.until}` : ''}.`);
      }
      if (facts.until) {
        return out('low_with_end', `${money(p)} matches the lowest price we have recorded for ${name}, and the store listed this offer until ${facts.until}.`, rankLine(rank));
      }
      return out('low_no_end', `${money(p)} matches the lowest price we have recorded for ${name}; the store page gave no end date, and our checks have shown this sale since ${cur?.start ?? r.date}.`, rankLine(rank));
    }
    const d = minus(p, L);
    if (label === 'BUY NOW') {
      const share = regular ? Math.round((d / regular) * 100) : null;
      return out('near_low', `At ${money(p)}, ${name} is ${money(d)} above the lowest price we recorded (${money(L)} on ${low.date})${share !== null ? `, a gap of ${share}% of its ${money(regular)} list price` : ''}.`);
    }
    return out('above_low', `${name} is on sale at ${money(p)}, but our records show it lower: ${money(L)} on ${low.date}, ${money(d)} less.${facts.until ? ` This offer was listed until ${facts.until}; holding out for ${money(L)} means skipping it.` : ''}`);
  }

  if (facts.state === 'list') {
    const last = facts.sales.at(-1);
    const since = days(last.end, r.date);
    const lowPart = L !== null && regular !== null && L < regular ? `${money(L)}, ${money(minus(regular, L))} under today's ${money(regular)}` : null;
    const b = facts.breaks;
    if (stale) {
      return out('stale_list', `Our latest reading, on ${r.date}, found ${name} at ${money(price)} with no sale price, ${since === 0 ? 'on the same day its last tracked sale ended' : `${plural(since, 'day')} after its last tracked sale ended (${last.end})`}; prices may have moved since then.`);
    }
    if (!b.length) {
      return out('list_single', `${name} is back at ${money(price)}; we have tracked ${facts.sales.length === 1 ? 'one sale' : plural(facts.sales.length, 'sale')} so far, last seen ${last.end}, so there is no gap between sales yet to time the next one by.${lowPart ? ` The lowest price we recorded is ${lowPart}.` : ''}`);
    }
    if (since > Math.max(...b)) {
      return out('list_beyond_gap', `${name} has gone ${plural(since, 'day')} without a sale since ${last.end}, longer than any gap between sales we have observed (${nums(b)} days).${lowPart ? ` Its lowest recorded price is ${lowPart}.` : ''}`);
    }
    return out('list_within_gap', `${name} is at ${money(price)}, ${plural(since, 'day')} after its last sale ended on ${last.end}; past gaps between sales we observed ran ${nums(b)} days, so this stretch is still inside that range.${lowPart ? ` The lowest it reached was ${lowPart}.` : ''}`);
  }

  if (facts.state === 'no_tracked_sale') {
    const archived = L !== null && regular !== null && L < regular;
    return out(archived ? 'never_on_sale_archive' : 'never_on_sale',
      `None of our ${n} price checks since ${dates[0]} caught ${name} below ${money(price)}${archived ? `; the only lower price we hold is ${money(L)} from an archived store page dated ${low.date}` : ', so there is no recorded sale price to wait for'}.`);
  }
  return null;
}
