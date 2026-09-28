import { comparisonPriceFacts } from './priceInsights.mjs';

const valid = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const round = (value) => Math.round(value * 100) / 100;

export function nowVsTypical(entry) {
  const facts = comparisonPriceFacts(entry);
  if (!facts || facts.salesRecorded < 2 || !valid(facts.today) || !valid(facts.sale)) return null;
  return { now: facts.today, typicalSale: facts.sale, difference: round(facts.today - facts.sale) };
}

export function topNTotal(entries, n = 3) {
  if (!Array.isArray(entries) || !Number.isInteger(n) || n < 1 || entries.length < n) return null;
  const prices = entries.slice(0, n).map(nowVsTypical);
  if (prices.some((price) => price === null)) return null;
  return { count: n, now: round(prices.reduce((sum, price) => sum + price.now, 0)),
    typicalSale: round(prices.reduce((sum, price) => sum + price.typicalSale, 0)) };
}

export function upgradeVsNew(facts, entry) {
  const newPrice = comparisonPriceFacts(entry)?.today;
  const upgradePrice = facts?.upgrade_price?.value;
  if (!valid(newPrice) || !valid(upgradePrice) || facts?.upgrade_price?.currency !== 'USD') return null;
  return { upgrade: upgradePrice, new: newPrice, difference: round(newPrice - upgradePrice) };
}
