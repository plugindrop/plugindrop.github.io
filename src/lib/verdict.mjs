import { dealScoreNumeric } from './priceUtils.ts';
import { currentPriceOf, regularPriceOf } from './priceUtils.ts';
export function verdictLabel(entry) {
  const verdict = dealScoreNumeric(entry).verdict;
  if (verdict === 'none') return 'WAIT';
  if (verdict === 'good') return 'BUY NOW';
  if (verdict === 'ok') return 'FAIR SALE';
  const current = currentPriceOf(entry), regular = regularPriceOf(entry);
  return current !== null && regular !== null && current < regular ? 'AVERAGE' : 'WAIT';
}
