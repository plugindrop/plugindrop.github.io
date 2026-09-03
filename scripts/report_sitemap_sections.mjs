import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { countSitemapSections } from '../src/lib/distAudit.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const sitemapPath = path.join(projectRoot, 'dist', 'sitemap-0.xml');
if (!fs.existsSync(sitemapPath)) {
  console.error(`Missing ${sitemapPath}. Run npm run build first.`); process.exitCode = 1;
} else {
  const counts = countSitemapSections(fs.readFileSync(sitemapPath, 'utf8'));
  const posts = counts.get('posts') ?? 0;
  const pluginPrices = counts.get('plugin-prices') ?? 0;
  const tags = counts.get('tags') ?? 0;
  const brands = counts.get('brands') ?? 0;
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const other = total - posts - pluginPrices - tags - brands;
  const nonPosts = total - posts;
  const ratio = (left, right) => right === 0 ? 'n/a' : (left / right).toFixed(3);
  console.log(`Sitemap sections: posts=${posts}, plugin-prices=${pluginPrices}, tags=${tags}, brands=${brands}, other=${other}, total=${total}`);
  console.log(`Ratios: posts vs plugin-prices=${ratio(posts, pluginPrices)}; posts vs non-posts=${ratio(posts, nonPosts)}`);
}
