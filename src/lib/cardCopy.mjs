export function cardCopyLine({ tagline, makerQuote, brand } = {}) {
  if (tagline?.trim()) return { text: tagline.trim(), kind: 'tagline' };
  let attribution = brand?.trim();
  if (!attribution && makerQuote?.source_url) {
    try { const host = new URL(makerQuote.source_url).hostname; if (!/(?:^|\.)pluginboutique\.com$/i.test(host)) attribution = host.replace(/^www\./, ''); } catch { /* invalid source */ }
  }
  if (makerQuote?.quote?.trim() && makerQuote.source_url && attribution) return { text: makerQuote.quote.trim(), kind: 'maker', cite: makerQuote.source_url, attribution };
  return { text: null, kind: null };
}
