import { isPricePageIndexable } from './indexPolicy.mjs';

const productPath = (url) => /^\/?(?:https:\/\/www\.pluginboutique\.com\/)?product\/\d+[-/]/i.test(url ?? '');

export function freeToPaid(slug, map, prices, now = new Date()) {
  const selection = map?.[slug];
  if (!selection || !slug.startsWith('best-free-') && !slug.startsWith('free-') && !slug.startsWith('spitfire-labs-') && !slug.startsWith('dexed-')) return null;
  const name = selection.paid_product_key;
  const entry = prices?.plugins?.[name] ?? prices?.bundles?.[name];
  if (!entry || !productPath(entry.pb_url) || !isPricePageIndexable(entry) || !selection.pb_check?.in_stock) return null;
  const latest = [...(entry.history ?? [])].filter(row => row.source === 'auto_check' && Number.isFinite(Date.parse(row.date))).sort((a, b) => b.date.localeCompare(a.date))[0];
  const recent = latest && (now - new Date(latest.date)) / 86400000 <= 14 && (now - new Date(latest.date)) >= 0;
  const regular = recent ? latest.regular : null;
  const current = recent ? latest.sale ?? regular : null;
  const pct = recent && latest.sale != null && regular > latest.sale ? Math.round((1 - latest.sale / regular) * 100) : null;
  return { slug, name, entry, freeReference: selection.free_reference, category: selection.category,
    heading: `If you need more than ${selection.free_reference}`,
    body: recent && current != null ? `${name} is a paid ${selection.category} plugin. Tracked price: $${current}${regular != null ? ` (regular $${regular})` : ''}, checked ${new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}.${pct != null ? ` ${pct}% off right now.` : ''}` : `${name} is a paid ${selection.category} plugin.`,
    showPrice: Boolean(recent && current != null), pct };
}
