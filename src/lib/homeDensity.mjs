const count = (s, re) => [...s.matchAll(re)].length;
export function measureHome(html) {
  const cards = [...html.matchAll(/<article\b(?=[^>]*\bdata-deal-card\b)[^>]*>[\s\S]*?<\/article>/gi)];
  const visible = cards.filter(m => !/<div\b(?=[^>]*\bgrid-item\b)(?=[^>]*\bdata-extra\b)[^>]*>\s*$/.test(html.slice(0, m.index)));
  const brands = new Map();
  for (const m of visible) { const brand = m[0].match(/data-brand="([^"]+)"/)?.[1] ?? m[0].match(/<h3>\s*([^<]+)\s*<strong>/)?.[1]?.trim(); if (brand) brands.set(brand, (brands.get(brand) ?? 0) + 1); }
  const missingOff = cards.filter(m => !/class="[^"]*off-tag\b/.test(m[0]) && !/variant-ended/.test(m[0])).length;
  return { cards: cards.length, M1: cards.filter(m => /class="[^"]*(?:tagline|card-copy-line)\b(?![^"]*fallback)/.test(m[0])).length, M2: cards.filter(m => /tagline--fallback/.test(m[0])).length, M3: missingOff, M4: count(html, /Above its usual sale price/g), M5: visible.length, M6: count(html, /<img\b/gi), M12: { maxBrandShare: visible.length && brands.size ? Math.max(...brands.values()) / visible.length : null, brands: Object.fromEntries(brands) } };
}
