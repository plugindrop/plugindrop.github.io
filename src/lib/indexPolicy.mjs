export const MIN_TAG_POSTS = 3;
export const MIN_PRICE_OBS = 3;
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
 * @param {{ history?: unknown[] } | null | undefined} entry
 * @returns {boolean}
 */
export function isPricePageIndexable(entry) {
  return (entry?.history?.length ?? 0) >= MIN_PRICE_OBS;
}

/**
 * @param {{
 *   plugins?: Record<string, { history?: unknown[] }>,
 *   bundles?: Record<string, { history?: unknown[] }>
 * } | null | undefined} priceData
 * @returns {string[]}
 */
export function noindexPricePagePaths(priceData) {
  const paths = new Set();
  for (const entries of [priceData?.plugins ?? {}, priceData?.bundles ?? {}]) {
    for (const [name, entry] of Object.entries(entries)) {
      if (!isPricePageIndexable(entry)) {
        paths.add(`/plugin-prices/${slugifyProduct(name)}/`);
      }
    }
  }
  return [...paths];
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
