export function cardCopyLine({ tagline, makerQuote } = {}) {
  if (tagline?.trim()) return { text: tagline.trim(), kind: 'tagline' };
  if (makerQuote?.quote?.trim() && makerQuote.source_url) return { text: makerQuote.quote.trim(), kind: 'maker', cite: makerQuote.source_url };
  return { text: null, kind: null };
}
