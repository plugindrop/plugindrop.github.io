import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractInternalHrefs, hasRobotsNoindex, isRedirectStub, routeForHtmlPath } from '../src/lib/distAudit.mjs';
import { noindexPricePagePaths } from '../src/lib/indexPolicy.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distDir = path.join(projectRoot, 'dist');
function listHtmlFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listHtmlFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(entryPath);
  }
  return files;
}
function htmlPathForRoute(route) {
  return route === '/' ? path.join(distDir, 'index.html') : path.join(distDir, ...route.split('/').filter(Boolean), 'index.html');
}
function targetIsNoindex(route) {
  const htmlPath = htmlPathForRoute(route);
  return fs.existsSync(htmlPath) && hasRobotsNoindex(fs.readFileSync(htmlPath, 'utf8'));
}

if (!fs.existsSync(distDir)) {
  console.error(`FAIL: Missing ${distDir}. Run npm run build first.`); process.exitCode = 1;
} else {
  const priceData = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src', 'data', 'price_history.json'), 'utf8'));
  const policyNoindex = new Set(noindexPricePagePaths(priceData));
  const violations = [];
  let taxonomyWarnings = 0;
  for (const htmlPath of listHtmlFiles(distDir)) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    if (hasRobotsNoindex(html) || isRedirectStub(html)) continue;
    const from = routeForHtmlPath(path.relative(distDir, htmlPath).replaceAll(path.sep, '/'));
    for (const to of extractInternalHrefs(html)) {
      if (to.startsWith('/plugin-prices/') && to !== '/plugin-prices/' && (policyNoindex.has(to) || targetIsNoindex(to))) violations.push({ from, to });
      if ((to.startsWith('/tags/') || to.startsWith('/brands/')) && targetIsNoindex(to)) taxonomyWarnings += 1;
    }
  }
  for (const { from, to } of violations) console.error(`FAIL: indexable page links to noindex product page: ${from} -> ${to}`);
  console.log(`WARN: ${taxonomyWarnings} link(s) from indexable pages to noindex tag/brand pages.`);
  if (violations.length > 0) { console.error(`FAIL: ${violations.length} indexable-to-noindex product link(s) found.`); process.exitCode = 1; }
  else console.log('PASS: 0 indexable-to-noindex product links found.');
}
