import { slugifyProduct } from './indexPolicy.mjs';
import { measuredPriceChecks, saleShare, episodeRows, maxRecordedDepth, freshness } from './pricePageEvidence.mjs';
import { productsOf } from './priceTrends.mjs';

export function productEvidenceRows(products) {
  return products.map(({ name, entry }) => {
    const episodes = episodeRows(entry);
    const maximum = maxRecordedDepth(entry);
    return {
      name, slug: slugifyProduct(name), saleShare: saleShare(entry),
      maxDiscount: maximum,
      maxDate: maximum === null ? null : episodes.find(row => row.depth === maximum)?.depthDate ?? null,
      lastSale: episodes[0]?.end ?? null,
    };
  });
}

export function monthEventDifference(data, month) {
  const monthCounts = (value) => {
    const counts = { starts: 0, ends: 0, newLows: 0 };
    for (const product of productsOf(data)) {
      for (const episode of episodeRows(product.entry)) {
        if (episode.start.startsWith(value)) counts.starts++;
        if (episode.end.startsWith(value)) counts.ends++;
      }
      let priorLow = Infinity;
      for (const row of measuredPriceChecks(product.entry)) {
        if (row.date.startsWith(value)) {
          if (priorLow < Infinity && Number.isFinite(row.sale) && row.sale >= 0 && row.sale < priorLow) counts.newLows++;
        }
        for (const price of [row.reg_src === 'typical' ? null : row.regular, row.sale]) {
          if (Number.isFinite(price) && price >= 0) priorLow = Math.min(priorLow, price);
        }
      }
    }
    return counts;
  };
  const previous = new Date(`${month}-01T00:00:00Z`);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const previousMonth = previous.toISOString().slice(0, 7);
  const current = monthCounts(month);
  const before = monthCounts(previousMonth);
  return { previousMonth, ...Object.fromEntries(Object.keys(current).map(key => [key, { count: current[key], delta: current[key] - before[key] }])) };
}

export function tagArticlePriceRows(posts, matches) {
  return posts.map((post, index) => {
    const entry = matches[index]?.entry;
    return {
      id: post.id,
      lastCheck: entry ? freshness(entry).lastCheck : null,
    };
  });
}
