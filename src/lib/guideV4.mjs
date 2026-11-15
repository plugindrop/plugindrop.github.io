import { comparisonPriceFacts } from './priceInsights.mjs';
import { priceStatTiles } from './priceStats.mjs';
import { isPricePageIndexable, slugifyProduct } from './indexPolicy.mjs';

const marker = /^<!-- guide:v4 kind=(roundup|review|vs|guide|report) -->/;
const heading = /<h2\b[^>]*\bid="([^"]+)"[^>]*>[\s\S]*?<\/h2>/gi;
const clean = value => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function isGuideV4(body) { return typeof body === 'string' && marker.test(body); }

export function splitGuideV4(html, rawBody) {
  const kind = rawBody?.match(marker)?.[1];
  if (!kind || typeof html !== 'string') return null;
  const headings = [...html.matchAll(heading)];
  if (!headings.length) return null;
  const sections = headings.map((h, i) => {
    const part = html.slice(h.index, headings[i + 1]?.index ?? html.length);
    const role = part.match(/<!-- role:([a-z]+) -->/)?.[1];
    const pick = part.match(/<!-- pick:([^>]+) -->/)?.[1]?.trim() ?? null;
    return role ? { role, id: h[1], html: part, pick } : null;
  });
  if (sections.some(s => !s)) return null;
  const faq = sections.find(s => s.role === 'faq')?.html ?? '';
  const faqItems = [...faq.matchAll(/<p>Q:\s*([\s\S]*?)<\/p>\s*<p>A:\s*([\s\S]*?)<\/p>/gi)]
    .map(m => ({ q: m[1].replace(/<[^>]*>/g, '').trim(), a: m[2].replace(/<[^>]*>/g, '').trim() }));
  return { kind, tldrHtml: html.slice(0, headings[0].index), sections, faqItems };
}

export function resolvePick(name, data) {
  if (!name || !data) return null;
  const entries = { ...(data.priceHistory?.bundles ?? {}), ...(data.priceHistory?.plugins ?? {}) };
  const content = data.productContent ?? {};
  const aliases = data.articleAliases ?? {};
  const brands = data.brandAliases ?? [];
  let query = aliases[name] ?? name;
  for (const brand of brands) {
    for (const prefix of brand.prefixes ?? []) {
      if (query.toLowerCase().startsWith(prefix.toLowerCase() + ' ')) query = brand.canonical + query.slice(prefix.length);
    }
  }
  const freeRows = Object.values(data.freeFacts?.articles ?? {}).flat();
  const keys = new Set([...Object.keys(entries), ...Object.keys(content), ...Object.keys(data.videos ?? {}), ...freeRows.map(row => row.name).filter(Boolean)]);
  const canonical = [...keys].find(key => clean(key) === clean(query));
  if (!canonical) return null;
  const entry = entries[canonical] ?? null;
  const freeFact = freeRows.find(row => clean(row.name) === clean(canonical)) ?? null;
  const priceFacts = entry ? comparisonPriceFacts(entry) : null;
  const pricePath = entry && isPricePageIndexable(entry) ? `/plugin-prices/${slugifyProduct(canonical)}/` : null;
  return { name: canonical, entry, content: content[canonical] ?? null, video: data.videos?.[canonical] ?? null,
    freeFact, priceFacts, pricePath, priceTiles: entry ? priceStatTiles(entry) : [] };
}

export function priceTableRow(pick) {
  if (!pick) return null;
  const facts = pick.priceFacts;
  const low = pick.priceTiles.find(tile => tile.label === "Lowest we've tracked")?.value ?? 'Not tracked';
  const money = value => Number.isFinite(value) ? `$${Number.isInteger(value) ? value : value.toFixed(2)}` : 'Not tracked';
  const free = !pick.entry && !!pick.freeFact;
  return { name: pick.name, pricePath: pick.pricePath, type: free ? 'Free' : 'Paid',
    current: free ? 'Free' : money(facts?.today), regular: free ? 'Free' : money(facts?.regular),
    off: Number.isFinite(facts?.today) && Number.isFinite(facts?.regular) && facts.regular > facts.today
      ? `${Math.round((1 - facts.today / facts.regular) * 100)}%` : '—',
    low: free ? 'Free' : low };
}
