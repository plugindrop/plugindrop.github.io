import { readFileSync } from 'node:fs';

const files = [
  'src/pages/plugin-prices/[slug].astro',
  'src/components/ProductOverview.astro',
  'src/components/BeforeYouBuy.astro',
];
const banned = [/How\s+[^\n<]*\s+describes?/i, /What the maker says/i, /features listed by/i];
for (const file of files) {
  const content = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  for (const pattern of banned) {
    if (pattern.test(content)) throw new Error(`${file}: forbidden price-page attribution: ${pattern}`);
  }
}
console.log('Price-page voice policy: OK');
