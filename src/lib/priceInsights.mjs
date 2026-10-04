import { comparableHistory, listSaleEpisodes } from './indexPolicy.mjs';
import { DEFAULT_AUDIT_INDEX, OBSERVED_SOURCES, confirmedSaleOf, isStandardCents, latestTrackerRow, pbPathOf, sourceKindOf } from './priceBasis.mjs';
import { currentPriceOf, formatPrice, dealScore } from './priceUtils.ts';

const observed = new Set(OBSERVED_SOURCES);
const rows = (e) => Array.isArray(e?.history) ? e.history : [];
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const money = (n) => formatPrice(n);
const diff = (a, b) => money((Math.round(a * 100) - Math.round(b * 100)) / 100);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const joinList = (a) => a.length <= 1 ? (a[0] ?? '') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`;
const nums = (a) => a.length <= 4 ? joinList(a.map(String)) : `${Math.min(...a)} to ${Math.max(...a)}`;
const ym = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const pct = (lo, hi) => Math.round((1 - lo / hi) * 100);
const range = (a) => ym(a.first) === ym(a.last) ? `from ${ym(a.first)}` : `from ${ym(a.first)} to ${ym(a.last)}`;

export function sameCategoryPeers(entry, name, candidates) {
  if (!entry?.category) return [];
  const withPrices = candidates
    .filter((candidate) => candidate.name !== name && candidate.entry.category === entry.category)
    .map((candidate) => ({ ...candidate, price: currentPriceOf(candidate.entry) }))
    .filter((candidate) => candidate.price !== null)
    .sort((a, b) => a.price - b.price);
  if (withPrices.length < 2) return [];
  const selfPrice = currentPriceOf(entry);
  const cheaper = selfPrice !== null ? withPrices.filter((candidate) => candidate.price < selfPrice) : [];
  return (cheaper.length >= 2 ? cheaper : withPrices).slice(0, 3);
}

export function pricedChecks(entry) {
  return rows(entry).filter((r) => observed.has(r?.source) && (finite(r.sale) || finite(r.regular)))
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function listPriceChanges(entry) {
  const checks = comparableHistory(entry).filter((r) => observed.has(r.source) && !finite(r.sale)
    && finite(r.regular) && r.reg_src === 'page')
    .sort((a, b) => a.date.localeCompare(b.date));
  const runs = [];
  for (const row of checks) {
    const last = runs.at(-1);
    if (last?.regular === row.regular) last.count++;
    else runs.push({ date: row.date, regular: row.regular, count: 1 });
  }
  const stable = runs.filter((run) => run.count >= 2);
  return stable.slice(1).filter((run, i) => run.regular !== stable[i].regular)
    .map(({ date, regular }) => ({ date, regular }));
}
export function trackedSales(checks) {
  return listSaleEpisodes({ history: checks }).reverse().map((ep) => {
    const saleRows = checks.filter((r) => r.date >= ep.start && r.date <= ep.end && finite(r.sale));
    const low = Math.min(...saleRows.map((r) => r.sale));
    const regular = saleRows.find((r) => finite(r.regular))?.regular ?? null;
    return { ...ep, low, regular, depthPct: finite(regular) && regular > low ? pct(low, regular) : null,
      leftCensored: ep.start === checks[0]?.date };
  });
}
export function observedSaleBreaks(sales, checks) {
  return sales.slice(1).flatMap((s, i) => checks.some((r) => r.date > sales[i].end && r.date < s.start && !finite(r.sale))
    ? [days(sales[i].end, s.start)] : []);
}
export function confirmedArchiveSales(entry, auditIndex = DEFAULT_AUDIT_INDEX) {
  const path = pbPathOf(entry?.pb_url);
  return rows(entry).flatMap((r) => { const sale = confirmedSaleOf(r, path, auditIndex); return sale ? [sale] : []; })
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function archivedPrices(entry, auditIndex = DEFAULT_AUDIT_INDEX) {
  const confirmedDates = new Set(confirmedArchiveSales(entry, auditIndex).map((r) => r.date));
  const archive = rows(entry).filter((r) => r.source === 'wayback' && finite(r.regular))
    .sort((a, b) => a.date.localeCompare(b.date));
  const excluded = archive.filter((r) => !isStandardCents(r.regular)).map((r) => ({ date: r.date, value: r.regular }));
  const kept = archive.filter((r) => isStandardCents(r.regular) && !confirmedDates.has(r.date));
  if (!kept.length) return null;
  const levels = [...new Set(kept.map((r) => r.regular))].sort((a, b) => b - a).map((price) => {
    const dates = kept.filter((r) => r.regular === price).map((r) => r.date);
    return { price, count: dates.length, first: dates[0], last: dates.at(-1) };
  });
  return { first: kept[0].date, last: kept.at(-1).date, count: kept.length, excluded, levels };
}
export function researchMentions(entry, auditIndex = DEFAULT_AUDIT_INDEX) {
  const path = pbPathOf(entry?.pb_url);
  const found = rows(entry).filter((r) => finite(r.sale)).map((r) => ({ row: r, kind: sourceKindOf(r, path, auditIndex) }))
    .filter(({ kind }) => ['research_estimate', 'research_report', 'research_other_store'].includes(kind))
    .sort((a, b) => a.row.date.localeCompare(b.row.date));
  return found.length ? { months: [...new Set(found.map(({ row }) => ym(row.date)))], kinds: new Set(found.map(({ kind }) => kind)) } : null;
}
export function pageState(entry, checks, sales) {
  const latestPriced = checks.at(-1) ?? null;
  const lastOwnDate = latestTrackerRow(entry)?.date ?? null;
  const state = !latestPriced ? 'no_checks' : finite(latestPriced.sale) ? 'on_sale' : sales.length ? 'list' : 'no_tracked_sale';
  return { state, latestPriced, lastOwnDate, unreadableAfter: Boolean(latestPriced && lastOwnDate > latestPriced.date) };
}
export const listPriceBasis = (r) => ({ value: r?.regular ?? null, kind: r?.reg_src === 'page' ? 'page' : 'reference' });
export const validUntil = (r, buildDate) => typeof r?.until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.until) && r.until >= buildDate ? r.until : null;
export function buildPageFacts(entry, { buildDate, auditIndex = DEFAULT_AUDIT_INDEX } = {}) {
  const checks = pricedChecks(entry), sales = trackedSales(checks), state = pageState(entry, checks, sales);
  return { ...state, checks, sales, breaks: observedSaleBreaks(sales, checks), archive: archivedPrices(entry, auditIndex),
    confirmed: confirmedArchiveSales(entry, auditIndex), mentions: researchMentions(entry, auditIndex),
    basis: listPriceBasis(state.latestPriced), until: validUntil(state.latestPriced, buildDate ?? '') };
}

const unreadable = (f) => f.unreadableAfter ? `Our checks after ${f.latestPriced.date} (up to ${f.lastOwnDate}) could not read a price from the store page.` : null;
const confirmedLine = (f, verb = 'also showed') => {
  const c = f.confirmed.slice(0, 3);
  if (!c.length) return null;
  if (c.length === 1) return `An archived Plugin Boutique page ${verb} a sale price of ${money(c[0].price)} (${c[0].date}).`;
  return `Archived Plugin Boutique pages ${verb} sale prices of ${joinList(c.map((r) => `${money(r.price)} (${r.date})`))}.`;
};
const archiveLine = (f, today = null) => {
  const a = f.archive;
  if (!a) return null;
  const low = Math.min(...a.levels.map((l) => l.price));
  if (a.count === 1) {
    const first = `An archived Plugin Boutique page from ${ym(a.first)} showed ${money(low)}.`;
    return today === null ? first : `${first} ${low < today ? `That is ${diff(today, low)} below today's price.` : `That was not below today's ${money(today)}.`}`;
  }
  const selected = a.levels.length <= 4 ? a.levels : a.levels.slice(-4).sort((x, y) => y.price - x.price);
  const levels = (a.levels.length <= 4 ? joinList : (items) => items.join(', '))(selected.map((l) => `${money(l.price)} (${plural(l.count, 'page')})`))
    + (a.levels.length <= 4 ? '' : ` and ${plural(a.levels.length - 4, 'higher price')}`);
  const first = `Archived Plugin Boutique pages ${range(a)} showed ${levels}.`;
  return today === null ? first : `${first} ${low < today ? `The lowest of those, ${money(low)}, is ${diff(today, low)} below today's price.` : `None was below today's ${money(today)}.`}`;
};
const basisLine = (n, f) => f.basis.kind === 'page'
  ? `Plugin Boutique showed ${n} at its ${money(f.basis.value)} list price in our check on ${f.latestPriced.date}.`
  : `Our check on ${f.latestPriced.date} found no sale price; our reference list price is ${money(f.basis.value)}.`;
const earlier = (f) => f.sales.slice(0, -1);
const lowOf = (s) => Math.min(...s.map((x) => x.low));

export function buildDecisionAnswers(name, f, availabilityAnswer) {
  const out = [];
  const add = (key, q, parts) => out.push({ key, q, a: parts.filter(Boolean).join(' ') });
  if (f.state === 'on_sale') {
    const r = f.latestPriced, p = r.sale, e = earlier(f), m = lowOf(e);
    let comparison = 'This is the first sale our checks have caught.';
    if (e.length && p < m) comparison = `That is ${diff(m, p)} below ${e.length === 1 ? 'the one earlier sale' : `the lowest of the ${e.length} earlier sales`} we tracked (${money(m)}).`;
    else if (e.length && p === m && e.every((s) => s.low === m)) comparison = e.length === 1
      ? `The one earlier sale we tracked also went to ${money(m)}.` : e.length === 2
        ? `Both earlier sales we tracked also went to ${money(m)}.` : `All ${e.length} earlier sales we tracked also went to ${money(m)}.`;
    else if (e.length && p === m) comparison = `That matches the lowest of the ${e.length} earlier sales we tracked.`;
    else if (e.length) {
      const ep = [...e].reverse().find((s) => s.low === m);
      comparison = `That is ${diff(p, m)} above ${e.length === 1 ? 'the one earlier sale' : `the lowest of the ${e.length} earlier sales`} we tracked (${money(m)}, first seen ${ep.start}).`;
    }
    const pctPart = finite(r.regular) && r.regular > p ? r.reg_src === 'page'
      ? ` (${pct(p, r.regular)}% off ${money(r.regular)})`
      : ` (${pct(p, r.regular)}% below our reference list price of ${money(r.regular)})` : '';
    add('compare', `How does today's ${money(p)} compare with past prices for ${name}?`, [
      `Plugin Boutique listed ${name} at ${money(p)}${pctPart} on ${r.date}.`, comparison,
      confirmedLine(f), archiveLine(f, p), unreadable(f)]);
    const cur = f.sales.at(-1), done = e.filter((s) => !s.leftCensored);
    let duration = null;
    if (done.length === 1) duration = `The one earlier sale we could follow from start to finish was visible for ${plural(done[0].days, 'day')} (${done[0].start}${done[0].start === done[0].end ? '' : ` to ${done[0].end}`}).`;
    else if (done.length > 1 && done.every((s) => s.days === done[0].days)) duration = `The ${done.length} earlier sales we could follow from start to finish were each visible for ${plural(done[0].days, 'day')}.`;
    else if (done.length > 1) duration = `The ${done.length} earlier sales we could follow from start to finish were visible for ${nums(done.map((s) => s.days))} days.`;
    const end = f.until ? `The store page said the offer runs until ${f.until} when we checked on ${r.date}.` : 'We have no end date from the store page for this sale.';
    const start = cur.start === r.date ? f.until ? 'This sale first appeared in that check.' : `This sale first appeared in our check on ${r.date}.`
      : cur.leftCensored ? `Every price check since our tracking began on ${cur.start} has shown it on sale.`
        : `Every price check since ${cur.start} has shown it on sale.`;
    add('end', `When does the current ${name} sale end?`, [end, start, duration]);
    if (f.breaks.length) add('breaks', `How soon did ${name} go back on sale in the past?`, [f.breaks.length === 1
      ? `Counting from the last check that showed an earlier sale, our checks next found it on sale ${plural(f.breaks[0], 'day')} later.`
      : `Counting from the last check that showed an earlier sale, our checks next found it on sale ${nums(f.breaks)} days later.`]);
  } else if (f.state === 'list') {
    const s = f.sales, lo = lowOf(s), hi = Math.max(...s.map((x) => x.low)), l = f.basis.value;
    const subject = s.length === 1 ? 'The one sale' : s.length === 2 ? 'Both sales' : `All ${s.length} sales`;
    const sale = lo === hi ? `${subject} we tracked at Plugin Boutique went to ${money(lo)}${l > lo ? `, ${diff(l, lo)} less (${pct(lo, l)}% off).` : '.'}`
      : `The ${s.length} sales we tracked at Plugin Boutique went to between ${money(lo)} and ${money(hi)}${l > hi ? `, ${diff(l, hi)} to ${diff(l, lo)} less (${pct(hi, l)}–${pct(lo, l)}% off).` : '.'}`;
    add('discount', `How much cheaper does ${name} get on sale?`, [basisLine(name, f), sale, confirmedLine(f), archiveLine(f), unreadable(f)]);
    const last = s.at(-1), d = f.latestPriced.date, k = f.checks.filter((r) => r.date > last.end).length, b = f.breaks;
    let breakLine = null;
    if (b.length === 1) breakLine = days(last.end, d) > b[0]
      ? `That ${days(last.end, d)}-day stretch is longer than the one break between sales we have observed (${plural(b[0], 'day')}).`
      : `The one break between sales we have observed lasted ${plural(b[0], 'day')}.`;
    else if (b.length > 1) breakLine = days(last.end, d) > Math.max(...b)
      ? `That ${days(last.end, d)}-day stretch is longer than any break between sales we have observed (${nums(b)} days).`
      : `Breaks between sales we have observed lasted ${nums(b)} days.`;
    add('last', `When was ${name} last on sale?`, [`Our checks last found it on sale on ${last.end}.`,
      k === 1 ? `The one price check since then, on ${d}, did not show a sale price.`
        : `None of the ${k} price checks since then, up to ${d}, showed a sale price.`, breakLine, unreadable(f)]);
  } else if (f.state === 'no_tracked_sale') {
    const n = f.checks.length, first = f.checks[0].date;
    add('sale', `Does ${name} go on sale at Plugin Boutique?`, [n === 1
      ? `Not in our checks so far: our one price check, on ${first}, did not show a sale price.`
      : `Not in our checks so far: none of our ${n} price checks since ${first} showed a sale price.`,
      confirmedLine(f, 'did show'), basisLine(name, f), archiveLine(f), unreadable(f)]);
  }
  add('availability', `Is ${name} available on Plugin Boutique?`, [availabilityAnswer]);
  return out;
}
export function buildResearchNote(name, f) {
  if (!f.mentions) return null;
  const k = f.mentions.kinds;
  const kinds = [
    k.has('research_estimate') && 'Some are estimates from a brand-wide discount, not observed prices.',
    k.has('research_report') && 'Some come from third-party sale reports.',
    k.has('research_other_store') && 'Some are prices at other stores.',
  ].filter(Boolean).join(' ');
  return `Our research notes also mention sales of ${name} in ${joinList(f.mentions.months)}. ${kinds} They are not prices we saw on Plugin Boutique's pages, so none of the comparisons on this page use them.`;
}
export function buildCoverageLine(f) {
  if (f.state === 'no_checks') return null;
  const dates = [...new Set(f.checks.map((r) => r.date))], n = dates.length, first = dates[0], last = dates.at(-1);
  let line = n === 1 ? `This record: 1 price check, on ${first}`
    : `This record: ${n} price checks since ${first} (about every ${plural(Math.max(1, Math.round(days(first, last) / (n - 1))), 'day')})`;
  if (f.archive) line += `, plus ${plural(f.archive.count, 'archived Plugin Boutique page')} ${range(f.archive)}`;
  return `${line}. ${f.archive ? 'Sales between archived pages would not appear here.' : `Sales before ${first} would not appear here.`}`;
}
export function summarizeVerdict(name, f) {
  if (f.state === 'no_checks') return `We have not read a price for ${name} from the store page yet.`;
  if (f.state === 'no_tracked_sale') return `No sale price in ${plural(f.checks.length, 'price check')} since ${f.checks[0].date}.`;
  if (f.state === 'list') {
    const s = f.sales, lo = lowOf(s), hi = Math.max(...s.map((x) => x.low)), last = s.at(-1);
    return lo === hi ? `${s.length === 1 ? 'The one sale' : `${s.length} sales`} we tracked went to ${money(lo)}; last seen on sale ${last.end}.`
      : `${s.length} sales we tracked went to ${money(lo)}–${money(hi)}; last seen on sale ${last.end}.`;
  }
  const p = f.latestPriced.sale, d = f.latestPriced.date, e = earlier(f);
  if (!e.length) return `${money(p)} on ${d}; the first sale our checks have caught.`;
  const m = lowOf(e), ref = e.length === 1 ? 'the one earlier sale we tracked' : `the lowest of the ${e.length} earlier sales we tracked`;
  if (p < m) return `${money(p)} on ${d}; ${diff(m, p)} below ${ref} (${money(m)}).`;
  if (p === m) return `${money(p)} on ${d}; the same as ${ref}.`;
  return `${money(p)} on ${d}; ${diff(p, m)} above ${ref} (${money(m)}).`;
}
export const alertTarget = (f) => f.sales.length ? lowOf(f.sales) : null;

// A "Rarely discounts" verdict is a claim about discount frequency. It needs a
// real observation history; a handful of days of checks cannot support it.
export const MIN_CHECKS_FOR_DISCOUNT_FREQUENCY = 4;
export const MIN_CHECKS_FOR_NO_SALE_CLAIM = 3;
export const MIN_DAYS_FOR_DISCOUNT_FREQUENCY = 28;
const NOT_ENOUGH_HISTORY = { label: 'Not enough price history yet', cls: 'ds-unknown' };

export function guardDiscountFrequency(verdict, checks, salesRecorded = 0, typicalSale = null) {
  if (verdict?.label !== 'Rarely discounts') return verdict;
  const dates = [...new Set((checks ?? []).map((row) => row.date))].sort();
  if (salesRecorded === 0 && typicalSale === null) return dates.length >= MIN_CHECKS_FOR_NO_SALE_CLAIM
    ? { label: `No sale seen in ${dates.length} ${dates.length === 1 ? 'check' : 'checks'} since ${dates[0]}`, cls: 'ds-unknown' }
    : NOT_ENOUGH_HISTORY;
  const span = dates.length > 1 ? days(dates[0], dates.at(-1)) : 0;
  return salesRecorded > 0 && dates.length >= MIN_CHECKS_FOR_DISCOUNT_FREQUENCY && span >= MIN_DAYS_FOR_DISCOUNT_FREQUENCY ? verdict : NOT_ENOUGH_HISTORY;
}

export function comparisonPriceFacts(entry) {
  if (!entry) return null;
  const facts = buildPageFacts(entry);
  const today = currentPriceOf(entry);
  const regular = entry.typical_regular ?? null;
  // The catalog seeds typical_sale from its first observed sale. Use the
  // same definition on the checks behind salesRecorded.
  const observedSale = facts.checks.find((row) => finite(row.sale))?.sale ?? null;
  const researchSale = rows(entry).find((row) => row.source?.startsWith('research_') && finite(row.sale) && row.sale === entry.typical_sale);
  const sale = observedSale ?? (researchSale ? entry.typical_sale : null);
  const saleNote = observedSale ? null : researchSale ? `${ym(researchSale.date)} record` : null;
  const allTimeLow = facts.sales.length ? Math.min(...facts.sales.map((episode) => episode.low)) : null;
  return {
    regular, sale, saleNote, today, salesRecorded: facts.sales.length,
    verdict: facts.sales.length === 0 && sale !== null && dealScore(today, regular, sale, allTimeLow).label === 'Wait for a sale'
      ? NOT_ENOUGH_HISTORY
      : guardDiscountFrequency(dealScore(today, regular, sale, allTimeLow), facts.checks, facts.sales.length, sale),
    hasPrice: [regular, sale, today].some((value) => value !== null),
  };
}
