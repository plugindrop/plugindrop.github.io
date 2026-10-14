import { detectBrand } from './brands.mjs';
import { slugifyProduct } from './indexPolicy.mjs';
import { MIN_CHECKS_FOR_NO_SALE_CLAIM } from './priceInsights.mjs';
import { comparableHistory, listSaleEpisodes, OBSERVED_SOURCES } from './indexPolicy.mjs';
import { categoryForProduct } from './categoryInference.mjs';

export const sourceKind = (source) => source === 'wayback' ? 'archived'
  : /^(research|plugindeals\.net)/.test(source ?? '') ? 'estimated'
  : OBSERVED_SOURCES.includes(source) ? 'measured' : 'unverified';

export const storeName = (store) => ({ plugin_boutique: 'Plugin Boutique', vendor: 'Vendor store', thomann: 'Thomann', gear4music: 'Gear4music' })[store] ?? (store ? store.replaceAll('_', ' ') : 'Store not recorded');

export function productsOf(data) {
  const seen = new Set();
  return [...Object.entries(data.bundles ?? {}).map(([name, entry]) => ({ name, entry, bundle: true })), ...Object.entries(data.plugins ?? {}).map(([name, entry]) => ({ name, entry, bundle: false }))]
    .filter(({ name, entry }) => { const key = entry.pbProductId ? `pb:${entry.pbProductId}` : `name:${slugifyProduct(name)}`; if (seen.has(key)) return false; seen.add(key); return true; })
    .map(({ name, entry, bundle }) => ({ name, entry, brand: detectBrand(name, entry.notes), category: categoryForProduct(name, entry, bundle), slug: slugifyProduct(name) }));
}

function summarize(rows) {
  const dates = rows.map(x => x.row.date).filter(Boolean).sort();
  const sales = rows.filter(x => Number.isFinite(x.row.sale) && x.row.sale >= 0 && Number.isFinite(x.row.regular) && x.row.regular > x.row.sale);
  const discounts = sales.map(x => Math.round((1 - x.row.sale / x.row.regular) * 100)).sort((a, b) => a - b);
  const mid = Math.floor(discounts.length / 2);
  return {
    checks: rows.length, sales: [...new Set(rows.map(x => x.product.slug))].reduce((count, slug) => count + listSaleEpisodes({ history: rows.filter(x => x.product.slug === slug).map(x => x.row) }).length, 0), first: dates[0] ?? null, last: dates.at(-1) ?? null,
    lastSale: sales.map(x => x.row.date).sort().at(-1) ?? null,
    maxDiscount: discounts.at(-1) ?? null,
    medianDiscount: discounts.length ? (discounts.length % 2 ? discounts[mid] : (discounts[mid - 1] + discounts[mid]) / 2) : null,
    stores: [...new Set(rows.map(x => storeName(x.row.store)))].sort(),
    sources: [...new Set(rows.map(x => x.row.source))].sort(),
  };
}

export function brandTrends(data) {
  const groups = new Map();
  for (const product of productsOf(data)) {
    if (!product.brand) continue;
    if (!groups.has(product.brand)) groups.set(product.brand, []);
    groups.get(product.brand).push(product);
  }
  return [...groups].map(([brand, products]) => {
    const rows = products.flatMap(product => (product.entry.history ?? []).map(row => ({ product, row })));
    const measured = summarize(rows.filter(x => sourceKind(x.row.source) === 'measured'));
    return {
      brand, slug: slugifyProduct(brand), products, measured,
      estimated: summarize(rows.filter(x => sourceKind(x.row.source) === 'estimated')),
      archived: summarize(rows.filter(x => sourceKind(x.row.source) === 'archived')),
      unverified: summarize(rows.filter(x => sourceKind(x.row.source) === 'unverified')),
      insufficient: measured.checks < MIN_CHECKS_FOR_NO_SALE_CLAIM,
    };
  }).sort((a, b) => a.brand.localeCompare(b.brand));
}

export function saleCalendar(data) {
  const months = new Map();
  for (const product of productsOf(data)) {
    for (const row of product.entry.history ?? []) {
      if (sourceKind(row.source) !== 'measured' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date ?? '') || !Number.isFinite(row.sale) || !Number.isFinite(row.regular) || !(row.regular > row.sale && row.sale >= 0)) continue;
      const month = row.date.slice(0, 7);
      if (!months.has(month)) months.set(month, { month, sales: 0, brands: new Map(), stores: new Set(), last: null });
      const item = months.get(month);
      item.sales++;
      if (product.brand) item.brands.set(product.brand, (item.brands.get(product.brand) ?? 0) + 1);
      item.stores.add(storeName(row.store));
      if (!item.last || row.date > item.last) item.last = row.date;
    }
  }
  return [...months.values()].map(x => ({ ...x, brands: [...x.brands].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])), stores: [...x.stores].sort() })).sort((a, b) => b.month.localeCompare(a.month));
}

export function weeklyPriceFacts(data, asOf = new Date(`${data.last_updated ?? '1970-01-01'}T00:00:00Z`)) {
  const end = asOf.toISOString().slice(0, 10);
  const start = new Date(`${end}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 6);
  const first = start.toISOString().slice(0, 10);
  let observedSales = 0;
  let newSales = 0;
  let endedSales = 0;
  const newLows = [];
  for (const product of productsOf(data)) {
    const rows = (product.entry.history ?? [])
      .filter(row => sourceKind(row.source) === 'measured' && /^\d{4}-\d{2}-\d{2}$/.test(row.date ?? ''))
      .sort((a, b) => a.date.localeCompare(b.date));
    let priorLow = Infinity;
    let wasSale = false;
    for (const row of rows) {
      const onSale = Number.isFinite(row.sale) && Number.isFinite(row.regular) && row.sale >= 0 && row.sale < row.regular;
      if (row.date >= first && row.date <= end) {
        if (onSale) observedSales++;
        if (onSale && !wasSale) newSales++;
        if (!onSale && wasSale) endedSales++;
        if (priorLow < Infinity && Number.isFinite(row.sale) && row.sale >= 0 && row.sale < priorLow) newLows.push({ name: product.name, slug: product.slug, price: row.sale, date: row.date });
      }
      for (const price of [row.regular, row.sale]) {
        if (Number.isFinite(price) && price >= 0) priorLow = Math.min(priorLow, price);
      }
      wasSale = onSale;
    }
  }
  return { first, end, observedSales, newSales, endedSales, newLows: newLows.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name)).slice(0, 5) };
}
