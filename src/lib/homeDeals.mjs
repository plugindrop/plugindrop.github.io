import { rankLiveDeals, pbProductId } from './dealRanking.mjs';
import { detectBrand, tierOf } from './brands.mjs';
import { categoryForProduct } from './categoryInference.mjs';
import { dealState, everydayPrice, findTrackerEntryForPost, isPostDealEnded } from './articleDeal.mjs';
import { isProductNameIndexable, isBrandPageIndexable, isPricePageIndexable } from './indexPolicy.mjs';
import { isSearchUrl, pbLink, slugify } from './priceUtils.ts';
import { ownChecks, ownLowBefore, rarityTag, urgencyTag, supportChips } from './dealSignals.mjs';
import { composeHeadline } from './headline.mjs';
import { taglineForProduct, makerQuoteForProduct } from './dealCopy.mjs';
import { cardCopyLine } from './cardCopy.mjs';

export function aboveUsualState(entry, current, now) { const low = ownLowBefore(entry, now); return low ? { above: current > low.low + 0.01, ...low } : null; }

export function resolveCardImage({ post, entry, siblings = [] }) {
  const hero = post?.data?.heroImage;
  if (post?.data?.aiImage !== true && typeof hero === 'string' && hero.startsWith('/images/') && !hero.includes('placeholder')) return { src: hero, large: entry?.image_lg ?? null, kind: 'article', aspect: '16/10' };
  if (entry?.image) return { src: entry.image, large: entry.image_lg ?? null, kind: 'product', aspect: '16/10' };
  const sibling = siblings.find(s => s?.image);
  if (sibling) return { src: sibling.image, kind: 'product', aspect: '16/10' };
  return { src: null, kind: 'typographic', aspect: '16/10' };
}

function postIsFree(post) { const price = String(post?.data?.dealPrice ?? '').toUpperCase(); return ['FREE', '$0', '$0.00', '0', '0.00'].includes(price); }
export function buildDealPool(entries, posts, now) {
  const byId = new Map();
  for (const deal of rankLiveDeals(entries, now, { limit: Number.MAX_SAFE_INTEGER, perKeyCap: Number.MAX_SAFE_INTEGER })) {
    if (dealState(deal.entry, now) !== 'live') continue;
    if (everydayPrice(deal.entry, now)) continue;
    byId.set(pbProductId(deal.entry.pb_url), { ...deal, kind: 'tracker', post: null });
  }
  for (const post of posts) {
    if (!post?.data?.affiliate || postIsFree(post) || isPostDealEnded(post, entries, now)) continue;
    const match = findTrackerEntryForPost(post, entries, post.body);
    if (match) {
      const id = pbProductId(match.entry.pb_url);
      if (byId.has(id) && !byId.get(id).post) byId.get(id).post = post;
      continue;
    }
  }
  return [...byId.values()].sort((a, b) => b.score - a.score || b.off - a.off || a.name.localeCompare(b.name));
}

export function cardTarget(deal, priceData) {
  if (deal.post && !isPostDealEnded(deal.post, { [deal.name]: deal.entry })) return `/posts/${deal.post.id}/`;
  if (deal.kind === 'tracker' && isProductNameIndexable(priceData, deal.name)) return `/plugin-prices/${slugify(deal.name)}/`;
  return pbLink(deal.entry.pb_url, 'chan=home', { medium: 'homepage', campaign: 'home-card', data1: slugify(deal.name) });
}

export function toCardModel(deal, { entries, priceData, now, videos = {}, copy = {} }) {
  const id = pbProductId(deal.entry.pb_url);
  const siblings = Object.values(entries).filter(entry => entry !== deal.entry && pbProductId(entry.pb_url) === id);
  const brand = deal.brand ?? detectBrand(deal.name, deal.entry.notes);
  const prefix = brand && (deal.name.toLowerCase().startsWith(`${brand.toLowerCase()} `) ? brand : brand === 'Universal Audio' && deal.name.startsWith('UAD ') ? 'UAD' : brand === 'Solid State Logic' && deal.name.startsWith('SSL ') ? 'SSL' : null);
  const product = prefix ? deal.name.slice(prefix.length).trim() : deal.name;
  const category = categoryForProduct(deal.name, deal.entry, !!priceData.bundles?.[deal.name]);
  const latest = ownChecks(deal.entry).filter(r => r.source === 'auto_check').at(-1);
  const until = /^\d{4}-\d{2}-\d{2}$/.test(latest?.until ?? '') ? latest.until : null;
  const urgency = deal.kind === 'tracker' ? urgencyTag(deal.entry, now) : null;
  const rarity = deal.kind === 'tracker' ? rarityTag(deal.entry, now) : null;
  const image = resolveCardImage({ post: deal.post, entry: deal.entry, siblings });
  const ctaHref = pbLink(deal.entry.pb_url, 'chan=home', { medium: 'homepage', campaign: 'home-card', data1: slugify(deal.name) });
  const tagline = taglineForProduct(deal.name, copy);
  const aboveState = aboveUsualState(deal.entry, deal.current, now);
  const aboveUsual = aboveState?.above ?? false;
  const cardUrgency = aboveUsual ? null : urgency;
  const videoRecord = videos[deal.name];
  const video = videoRecord?.video_id || videoRecord?.id ? { id: videoRecord.video_id ?? videoRecord.id, official: videoRecord.official === true, title: videoRecord.title ?? '', channel: videoRecord.channel ?? '' } : null;
  return { key: deal.name, brand, product, category, tagline, copyLine: cardCopyLine({ tagline, makerQuote: makerQuoteForProduct(deal.name, copy), brand }), headline: aboveUsual ? `${brand ? `${brand} ` : ''}${product}: above its usual sale price` : composeHeadline({ brand, product, category, tagline, off: deal.off, state: 'live' }), off: deal.off, offTone: aboveUsual ? 'muted' : 'strong', current: deal.current, regular: deal.regular, until, urgency: cardUrgency, rarity: aboveUsual ? null : rarity, aboveUsual, ownLow: aboveUsual ? aboveState : null, chips: aboveUsual ? [`Was $${Number.isInteger(aboveState.low) ? aboveState.low : aboveState.low.toFixed(2)} on sale in ${aboveState.month}`] : deal.kind === 'tracker' ? supportChips(deal.entry, now, 2) : [], image, href: cardTarget(deal, priceData), ctaHref, video, filters: [category.toLowerCase(), ...(cardUrgency ? ['ending'] : []), ...(rarity?.type === 'new-low' && !aboveUsual ? ['new-low'] : []), ...(deal.current < 50 ? ['under-50'] : []), ...(category === 'Bundle' ? ['bundles'] : [])], score: deal.score, tier: tierOf(brand) };
}

export function pickSpotlight(cards) { const eligible = cards.filter(c => !c.aboveUsual); const preferred = eligible.filter(c => c.image.kind !== 'typographic' && ['S', 'A'].includes(c.tier) && (c.rarity || c.off >= 50)); const group = preferred.length ? preferred : eligible.filter(c => c.image.kind !== 'typographic'); const first = group[0] ?? eligible[0]; const tierRank = tier => ({ S: 0, A: 1, B: 2, C: 3 })[tier] ?? 4; return group.find(c => c.copyLine?.text && tierRank(c.tier) <= tierRank(first?.tier)) ?? first ?? null; }
export function orderForVariety(cards) {
  const ordered = [];
  for (const group of [cards.filter(c => c.copyLine?.text?.trim() || c.tagline?.trim()), cards.filter(c => !(c.copyLine?.text?.trim() || c.tagline?.trim()))]) {
    const pending = [...group];
    while (pending.length) {
      const last = ordered.at(-1);
      const repeated = last?.brand && ordered.at(-2)?.brand === last.brand;
      const index = repeated ? pending.findIndex(c => c.brand !== last.brand) : 0;
      if (index < 0) { ordered.push(...pending); break; }
      ordered.push(pending.splice(index, 1)[0]);
    }
  }
  return ordered;
}
export function endingSoon(cards) { return cards.filter(c => c.urgency && ['ends-today', 'ends-soon', 'ends-on'].includes(c.urgency.type)).sort((a, b) => a.until.localeCompare(b.until)).slice(0, 10); }
export function brandSaleClusters(cards, entries = {}) {
  const groups = new Map();
  for (const c of cards) if (c.brand && c.until && !c.aboveUsual) { const key = `${c.brand}|${c.until}`; groups.set(key, [...(groups.get(key) ?? []), c]); }
  return [...groups.values()].filter(g => g.length >= 3).sort((a, b) => b.length - a.length).slice(0, 2).map(g => ({ brand: g[0].brand, until: g[0].until, cards: g.slice(0, 4), summary: clusterSummary(g), count: g.length, href: brandHref(g[0].brand, entries) }));
}
export function clusterSummary(cards) {
  const discounts = cards.map(card => card.off).filter(off => Number.isFinite(off) && off > 0);
  return { count: cards.length, min: discounts.length ? Math.min(...discounts) : null, max: discounts.length ? Math.max(...discounts) : null };
}
export function allocateSections(cards, budget = 28) {
  const spotlight = cards.spotlight ?? null;
  const hot = [...(cards.hot ?? [])];
  const clusters = (cards.clusters ?? []).filter(cluster => cluster.cards?.length).map(cluster => ({ ...cluster, cards: [...cluster.cards] }));
  const soon = [...(cards.soon ?? [])];
  const grid = [...(cards.grid ?? [])];
  let initial = Math.min(12, grid.length);
  const total = () => Number(!!spotlight) + hot.length + clusters.reduce((sum, cluster) => sum + cluster.cards.length, 0) + soon.length + initial;
  while (total() > budget && initial > 8) initial--;
  while (total() > budget && soon.length) soon.pop();
  while (total() > budget && clusters.length > 1) clusters.pop();
  while (total() > budget && initial) initial--;
  while (total() > budget && hot.length) hot.pop();
  while (total() > budget && clusters.length) clusters.pop();
  return { spotlight: total() <= budget ? spotlight : null, hot, clusters, soon, gridInitial: grid.slice(0, initial), gridExtra: grid.slice(initial) };
}
const CATEGORY_GROUPS = [
  ['Synths', ['Synth']], ['Reverb & Delay', ['Reverb', 'Delay']], ['Compression', ['Compressor']], ['EQ & Mixing', ['EQ', 'Utility']], ['Mastering', ['Mastering', 'Limiter']], ['Saturation', ['Saturation']], ['Instruments', ['Instrument', 'Drums', 'Vocal']], ['Bundles', ['Bundle']],
];
export function categoryTiles(cards) { const published = new Set(['Synth','Reverb','Compressor','EQ','Saturation','Instrument','Bundle']); return CATEGORY_GROUPS.map(([label, categories]) => { const deals = cards.filter(c => categories.includes(c.category)); return { label, count: deals.length, image: deals.find(c => c.image.src)?.image ?? null, href: published.has(categories[0]) ? `/best/${slugify(categories[0])}/` : '/categories/' }; }).filter(t => t.count > 0); }
function brandHref(brand, entries) { const count = Object.entries(entries).filter(([name, entry]) => detectBrand(name, entry.notes) === brand && !isSearchUrl(entry.pb_url) && isPricePageIndexable(entry)).length; return isBrandPageIndexable(count) ? `/brands/${slugify(brand)}/` : '/brands/'; }
export function brandTiles(cards, entries = {}) { const groups = new Map(); for (const c of cards) if (c.brand) groups.set(c.brand, (groups.get(c.brand) ?? 0) + 1); return [...groups].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([brand, count]) => ({ brand, count, href: brandHref(brand, entries) })); }
