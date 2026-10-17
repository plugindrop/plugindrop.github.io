import { rankLiveDeals, pbProductId } from './dealRanking.mjs';
import { detectBrand, tierOf } from './brands.mjs';
import { categoryForProduct } from './categoryInference.mjs';
import { dealState, everydayPrice, findTrackerEntryForPost, isPostDealEnded } from './articleDeal.mjs';
import { isProductNameIndexable, isBrandPageIndexable, isPricePageIndexable } from './indexPolicy.mjs';
import { isSearchUrl, pbLink, slugify, pctOff } from './priceUtils.ts';
import { ownChecks, rarityTag, urgencyTag, supportChips } from './dealSignals.mjs';
import { composeHeadline } from './headline.mjs';

export function resolveCardImage({ post, entry, siblings = [] }) {
  const hero = post?.data?.heroImage;
  if (post?.data?.aiImage !== true && typeof hero === 'string' && hero.startsWith('/images/') && !hero.includes('placeholder')) return { src: hero, kind: 'article', aspect: '16/10' };
  if (entry?.image) return { src: entry.image, kind: 'product', aspect: '16/10' };
  const sibling = siblings.find(s => s?.image);
  if (sibling) return { src: sibling.image, kind: 'product', aspect: '16/10' };
  return { src: null, kind: 'typographic', aspect: '16/10' };
}

function postIsFree(post) { const price = String(post?.data?.dealPrice ?? '').toUpperCase(); return ['FREE', '$0', '$0.00', '0', '0.00'].includes(price); }
export function buildDealPool(entries, posts, now) {
  const byId = new Map();
  for (const deal of rankLiveDeals(entries, now, { limit: Number.MAX_SAFE_INTEGER, perKeyCap: Number.MAX_SAFE_INTEGER })) {
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
    if (isSearchUrl(post.data.affiliate) || !post.data.heroImage || post.data.aiImage || !post.data.discount || !post.data.dealPrice || !post.data.originalPrice) continue;
    const id = pbProductId(post.data.affiliate);
    if (byId.has(id)) continue;
    const current = Number(String(post.data.dealPrice).replace(/[^0-9.]/g, ''));
    const regular = Number(String(post.data.originalPrice).replace(/[^0-9.]/g, ''));
    if (!(current > 0 && regular > current)) continue;
    byId.set(id, { name: post.data.title, entry: { pb_url: post.data.affiliate, history: [] }, current, regular, off: pctOff(current, regular), score: 0, brand: null, kind: 'article', post });
  }
  return [...byId.values()].sort((a, b) => b.score - a.score || b.off - a.off || a.name.localeCompare(b.name));
}

export function cardTarget(deal, priceData) {
  if (deal.post && !isPostDealEnded(deal.post, { [deal.name]: deal.entry })) return `/posts/${deal.post.id}/`;
  if (deal.kind === 'tracker' && isProductNameIndexable(priceData, deal.name)) return `/plugin-prices/${slugify(deal.name)}/`;
  return pbLink(deal.entry.pb_url, 'chan=home', { medium: 'homepage', campaign: 'home-card', data1: slugify(deal.name) });
}

export function toCardModel(deal, { entries, priceData, now, videos = {} }) {
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
  return { key: deal.name, brand, product, category, tagline: null, headline: composeHeadline({ brand, product, category, tagline: null, off: deal.off, state: 'live' }), off: deal.off, current: deal.current, regular: deal.regular, until, urgency, rarity, chips: deal.kind === 'tracker' ? supportChips(deal.entry, now, 2) : [], image, href: cardTarget(deal, priceData), ctaHref, hasVideo: !!videos[deal.name], filters: [category.toLowerCase(), ...(urgency ? ['ending'] : []), ...(rarity?.type === 'new-low' ? ['new-low'] : []), ...(deal.current < 50 ? ['under-50'] : []), ...(category === 'Bundle' ? ['bundles'] : [])], score: deal.score, tier: tierOf(brand) };
}

export function pickSpotlight(cards) { return cards.find(c => c.image.kind !== 'typographic' && ['S', 'A'].includes(c.tier) && (c.rarity || c.off >= 50)) ?? cards.find(c => c.image.kind !== 'typographic') ?? cards[0] ?? null; }
export function endingSoon(cards) { return cards.filter(c => c.urgency && ['ends-today', 'ends-soon', 'ends-on'].includes(c.urgency.type)).sort((a, b) => a.until.localeCompare(b.until)).slice(0, 10); }
export function brandSaleClusters(cards, entries = {}) {
  const groups = new Map();
  for (const c of cards) if (c.brand && c.until) { const key = `${c.brand}|${c.until}`; groups.set(key, [...(groups.get(key) ?? []), c]); }
  return [...groups.values()].filter(g => g.length >= 3).sort((a, b) => b.length - a.length).slice(0, 2).map(g => ({ brand: g[0].brand, until: g[0].until, cards: g.slice(0, 4), count: g.length, href: brandHref(g[0].brand, entries) }));
}
const CATEGORY_GROUPS = [
  ['Synths', ['Synth']], ['Reverb & Delay', ['Reverb', 'Delay']], ['Compression', ['Compressor']], ['EQ & Mixing', ['EQ', 'Utility']], ['Mastering', ['Mastering', 'Limiter']], ['Saturation', ['Saturation']], ['Instruments', ['Instrument', 'Drums', 'Vocal']], ['Bundles', ['Bundle']],
];
export function categoryTiles(cards) { const published = new Set(['Synth','Reverb','Compressor','EQ','Saturation','Instrument','Bundle']); return CATEGORY_GROUPS.map(([label, categories]) => { const deals = cards.filter(c => categories.includes(c.category)); return { label, count: deals.length, image: deals.find(c => c.image.src)?.image ?? null, href: published.has(categories[0]) ? `/best/${slugify(categories[0])}/` : '/categories/' }; }).filter(t => t.count > 0); }
function brandHref(brand, entries) { const count = Object.entries(entries).filter(([name, entry]) => detectBrand(name, entry.notes) === brand && !isSearchUrl(entry.pb_url) && isPricePageIndexable(entry)).length; return isBrandPageIndexable(count) ? `/brands/${slugify(brand)}/` : '/brands/'; }
export function brandTiles(cards, entries = {}) { const groups = new Map(); for (const c of cards) if (c.brand) groups.set(c.brand, (groups.get(c.brand) ?? 0) + 1); return [...groups].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([brand, count]) => ({ brand, count, href: brandHref(brand, entries) })); }
