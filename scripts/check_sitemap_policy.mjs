import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { countSitemapSections, hasRobotsNoindex, isRedirectStub, routeForHtmlPath } from '../src/lib/distAudit.mjs';
import { noindexPricePagePaths } from '../src/lib/indexPolicy.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distDir = path.join(projectRoot, 'dist');
const sitemapPath = path.join(distDir, 'sitemap-0.xml');
const siteUrl = 'https://plugindrop.net';

function fail(message) { console.error(`FAIL: ${message}`); process.exitCode = 1; }
function listHtmlFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listHtmlFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(entryPath);
  }
  return files;
}
function normalizeRoute(value) {
  const pathname = new URL(value, siteUrl).pathname;
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}
function htmlPathForRoute(route) {
  return path.join(distDir, ...route.split('/').filter(Boolean), 'index.html');
}

if (!fs.existsSync(sitemapPath)) {
  fail(`Missing ${sitemapPath}. Run npm run build first.`);
} else {
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  const sitemapRoutes = new Set([...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => normalizeRoute(match[1])));
  const priceData = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src', 'data', 'price_history.json'), 'utf8'));
  const policyNoindexPaths = noindexPricePagePaths(priceData);
  const violations = [];

  for (const route of policyNoindexPaths) {
    const htmlPath = htmlPathForRoute(route);
    if (!fs.existsSync(htmlPath) || !hasRobotsNoindex(fs.readFileSync(htmlPath, 'utf8'))) {
      violations.push(`policy noindex not rendered: ${route}`);
    }
  }
  for (const htmlPath of listHtmlFiles(distDir)) {
    const relativePath = path.relative(distDir, htmlPath).replaceAll(path.sep, '/');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const route = routeForHtmlPath(relativePath);
    if (sitemapRoutes.has(route) && hasRobotsNoindex(html)) violations.push(`noindex URL present: ${route}`);
    if (sitemapRoutes.has(route) && isRedirectStub(html)) violations.push(`redirect URL present: ${route}`);
    if (!(sitemapRoutes.has(route) || hasRobotsNoindex(html) || isRedirectStub(html) || relativePath === '404.html')) {
      violations.push(`orphan policy: ${route}`);
    }
  }
  for (const violation of violations) fail(violation);
  if (violations.length === 0) {
    console.log(`PASS: ${sitemapRoutes.size} sitemap URLs checked; all dist HTML classified and ${policyNoindexPaths.length} policy noindex pages rendered.`);
  }
  console.log(`Sitemap sections: ${[...countSitemapSections(sitemapXml)].map(([section, count]) => `${section}=${count}`).join(', ')}`);
}
