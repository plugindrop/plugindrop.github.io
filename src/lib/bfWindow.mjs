// Black Friday / Cyber Monday window (JST calendar dates). Outside the window nothing is shown.
export const BF_HUB_PATH = '/posts/best-plugin-boutique-black-friday-deals-2026/';
export const BF_DEVELOPERS_PATH = '/posts/black-friday-2026-plugin-developer-sales/';
export const BF_WINDOW = { start: '2026-11-27', cyber: '2026-11-30', end: '2026-12-02' };

export function jstDate(now = Date.now()) { return new Date(now + 9 * 3600e3).toISOString().slice(0, 10); }

// 'bf' | 'cm' | null
export function bfPhase(now = Date.now()) {
  const d = jstDate(now);
  if (d < BF_WINDOW.start || d > BF_WINDOW.end) return null;
  return d >= BF_WINDOW.cyber ? 'cm' : 'bf';
}

// Soonest-ending, deepest real discounts that link to our own price page. Never invents a price.
export function pickBfCards(cards, limit = 4) {
  return cards
    .filter(c => !c.aboveUsual && c.until && c.off > 0 && String(c.href).startsWith('/plugin-prices/'))
    .sort((a, b) => a.until.localeCompare(b.until) || b.off - a.off)
    .slice(0, limit);
}
