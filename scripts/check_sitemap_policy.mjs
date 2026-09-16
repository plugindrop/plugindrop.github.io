import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { countSitemapSections, hasRobotsNoindex, isRedirectStub, routeForHtmlPath } from '../src/lib/distAudit.mjs';
import { noindexPricePagePaths } from '../src/lib/indexPolicy.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distDir = path.join(projectRoot, 'dist');
const sitemapPath = path.join(distDir, 'sitemap-0.xml');
const siteUrl = 'https://plugindrop.net';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

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

if (!fs.existsSync(sitemapPath)) {
  fail(`Missing ${sitemapPath}. Run npm run build first.`);
} else {
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  const sitemapRoutes = new Set(
    [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1], siteUrl).pathname),
  );
  const priceData = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src', 'data', 'price_history.json'), 'utf8'));
  const policyNoindexPaths = noindexPricePagePaths(priceData);
  let violations = 0;

  for (const route of policyNoindexPaths) {
    const htmlPath = htmlPathForRoute(route);
    if (!fs.existsSync(htmlPath) || !hasRobotsNoindex(fs.readFileSync(htmlPath, 'utf8'))) {
      fail(`policy noindex not rendered: ${route}`);
      violations += 1;
    }
  }

  for (const htmlPath of listHtmlFiles(distDir)) {
    const relative = path.relative(distDir, htmlPath).replaceAll(path.sep, '/');
    if (relative === '404.html') continue;
    const route = routeForHtmlPath(relative);
    const html = fs.readFileSync(htmlPath, 'utf8');
    if (!sitemapRoutes.has(route) && !hasRobotsNoindex(html) && !isRedirectStub(html)) {
      fail(`orphan policy: ${route}`);
      violations += 1;
    }
  }

  const sections = [...countSitemapSections(sitemapXml)].map(([section, count]) => `${section}=${count}`).join(', ');
  console.log(`Sitemap sections: ${sections}`);
  if (violations === 0) {
    console.log(`PASS: ${sitemapRoutes.size} sitemap URLs checked; ${policyNoindexPaths.length} policy noindex pages rendered and all HTML classified.`);
  } else {
    console.error(`FAIL: ${violations} sitemap policy violation(s) found.`);
  }
}
