import { isProductNameIndexable, slugifyProduct } from './indexPolicy.mjs';

export function dealsBoxLinks(deals, priceData, limit = 3) {
  return deals.map((deal, index) => ({
    ...deal,
    pricePath: deal.productName && isProductNameIndexable(priceData, deal.productName)
      ? `/plugin-prices/${slugifyProduct(deal.productName)}/` : null,
    index,
  }))
    .sort((a, b) => Number(!!b.pricePath) - Number(!!a.pricePath) || a.index - b.index)
    .slice(0, limit)
    .map(({ index, ...deal }) => deal);
}
