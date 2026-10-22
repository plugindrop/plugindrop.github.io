export function measurePricePages(pages) {
  const values = Object.values(pages).filter(html => !/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html));
  const total = values.length;
  const facts = values.filter(html => /data-product-facts\b/.test(html)).length;
  const alternatives = values.filter(html => Number(html.match(/data-alternatives-count="(\d+)"/)?.[1] ?? 0) >= 2).length;
  const iframes = values.reduce((sum, html) => sum + [...html.matchAll(/<iframe\b/gi)].length, 0);
  const banned = values.reduce((sum, html) => sum + [...html.matchAll(/\b(?:all-time low|lowest ever|best price)\b/gi)].length, 0);
  const storeCtas = values.reduce((sum, html) => sum + [...html.matchAll(/<a\b[^>]*class="[^"]*(?:cta-primary|card-cta)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)].filter(match => /plugin boutique/i.test(match[1])).length, 0);
  return { pages: total, M18: { count: facts, percent: total ? Math.round(facts / total * 100) : 0 }, M19: { count: alternatives, percent: total ? Math.round(alternatives / total * 100) : 0 }, M20: iframes, M21: storeCtas, rarity_banned: banned };
}
