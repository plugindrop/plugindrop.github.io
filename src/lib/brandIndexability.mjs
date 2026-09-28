import { isPricePageIndexable } from './indexPolicy.mjs';

/** Count the products eligible for a brand page's indexability decision. */
export function countIndexableBrandProducts(products) {
  return products.filter((product) => isPricePageIndexable(product.entry)).length;
}
