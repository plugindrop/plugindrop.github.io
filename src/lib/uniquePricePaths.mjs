import { slugifyProduct } from './indexPolicy.mjs';

export function uniquePricePaths(rows) {
  const seen = new Set();
  return [...rows].sort((a, b) => Number(/[A-Za-z]-\d/.test(b.name)) - Number(/[A-Za-z]-\d/.test(a.name))).filter(({ name }) => {
    const slug = slugifyProduct(name);
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}
