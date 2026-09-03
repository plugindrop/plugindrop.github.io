export const MIN_TAG_POSTS = 3;
export const MIN_PRICE_OBS = 3;
export const MIN_PRICE_SALE_OBS = 1;
export const MIN_PRICE_LEVELS = 2;
export const MIN_BRAND_PRODUCTS = 3;

/**
 * Keep product URLs byte-for-byte compatible with the former page-local
 * slugify implementations.
 *
 * @param {string} name
 * @returns {string}
 */
export function slugifyProduct(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * @param {string} tag
 * @returns {string}
 */
export function slugifyTag(tag) {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * @param {{ history?: Array<{ regular?: unknown, sale?: unknown }> } | null | undefined} entry
 * @returns {{ observations: number, saleObservations: number, priceLevels: number }}
 */
export function priceSubstance(entry) {
  const history = Array.isArray(entry?.history) ? entry.history : [];
  return {
    observations: history.length,
    saleObservations: history.filter((observation) => observation?.sale != null).length,
    priceLevels: new Set(
      history
        .map((observation) => observation?.sale ?? observation?.regular)
        .filter((value) => value != null),
    ).size,
  };
}

/**
 * @param {{ history?: Array<{ regular?: unknown, sale?: unknown }> } | null | undefined} entry
 * @returns {boolean}
 */
export function isPricePageIndexable(entry) {
  const { observations, saleObservations, priceLevels } = priceSubstance(entry);
  return observations >= MIN_PRICE_OBS
    && saleObservations >= MIN_PRICE_SALE_OBS
    && priceLevels >= MIN_PRICE_LEVELS;
}

/**
 * @param {{
 *   plugins?: Record<string, { history?: unknown[] }>,
 *   bundles?: Record<string, { history?: unknown[] }>
 * } | null | undefined} priceData
 * @returns {string[]}
 */
export function noindexPricePagePaths(priceData) {
  const paths = [];
  for (const entries of [priceData?.plugins ?? {}, priceData?.bundles ?? {}]) {
    for (const [name, entry] of Object.entries(entries)) {
      if (!isPricePageIndexable(entry)) {
        paths.push(`/plugin-prices/${slugifyProduct(name)}/`);
      }
    }
  }
  return paths;
}

/**
 * @param {{
 *   plugins?: Record<string, { history?: unknown[] }>,
 *   bundles?: Record<string, { history?: unknown[] }>
 * } | null | undefined} priceData
 * @returns {string[]}
 */
export function indexablePricePagePaths(priceData) {
  const paths = [];
  for (const entries of [priceData?.plugins ?? {}, priceData?.bundles ?? {}]) {
    for (const [name, entry] of Object.entries(entries)) {
      if (isPricePageIndexable(entry)) {
        paths.push(`/plugin-prices/${slugifyProduct(name)}/`);
      }
    }
  }
  return paths;
}

/**
 * @param {{ plugins?: Record<string, unknown>, bundles?: Record<string, unknown> } | null | undefined} priceData
 * @param {string} name
 * @returns {boolean}
 */
export function isProductNameIndexable(priceData, name) {
  const entry = priceData?.plugins?.[name] ?? priceData?.bundles?.[name];
  return entry !== undefined && isPricePageIndexable(entry);
}

/**
 * @param {number} publicPostCount
 * @returns {boolean}
 */
export function isTagPageIndexable(publicPostCount) {
  return publicPostCount >= MIN_TAG_POSTS;
}

/**
 * @param {number} productCount
 * @returns {boolean}
 */
export function isBrandPageIndexable(productCount) {
  return productCount >= MIN_BRAND_PRODUCTS;
}
