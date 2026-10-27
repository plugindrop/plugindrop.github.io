import { siteStats } from './siteStats.mjs';

export function buildEmailDealSignals(pool, models, priceData, generatedAt) {
  const deals = {};
  for (let index = 0; index < pool.length; index++) {
    const deal = pool[index];
    const card = models[index];
    deals[deal.name] = {
      brand: card.brand, product: card.product, category: card.category,
      copyLine: card.copyLine?.text ? {
        text: card.copyLine.text, kind: card.copyLine.kind,
        attribution: card.copyLine.attribution ?? null,
      } : null,
      current: card.current, regular: card.regular, off: card.off,
      until: card.until, urgency: card.urgency, rarity: card.rarity,
      chips: card.chips, aboveUsual: card.aboveUsual,
      image: card.image?.src ?? null, pbUrl: deal.entry.pb_url,
    };
  }
  return {
    generated_at: generatedAt,
    price_last_updated: priceData.last_updated,
    stats: { trackedProducts: siteStats(priceData).trackedProducts },
    deals,
  };
}
