import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { noindexPricePagePaths } from '../src/lib/indexPolicy.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distDir = path.join(projectRoot, 'dist');
const sitemapPath = path.join(distDir, 'sitemap-0.xml');
const siteUrl = 'https://plugindrop.net';

const staticRedirectPaths = [
  '/plugin-prices/arturia-v-collection-11/',
  '/plugin-prices/arturia-fx-collection-6/',
  '/posts/best-compressor-plugins-mixing/',
  '/posts/best-eq-plugins-mixing-mastering/',
  '/posts/best-free-orchestral-vst-plugins/',
];

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function xmlDecode(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function normalizeUrl(value) {
  return new URL(value, siteUrl).href;
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

function routeForHtml(filePath) {
  const relative = path.relative(distDir, filePath).replaceAll(path.sep, '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative.slice(0, -'.html'.length)}`;
}

function attributeValue(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? '';
}

function pagePolicies(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  return {
    noindex: metaTags.some((tag) =>
      attributeValue(tag, 'name').toLowerCase() === 'robots'
      && attributeValue(tag, 'content').toLowerCase().includes('noindex')
    ),
    redirect: metaTags.some((tag) => attributeValue(tag, 'http-equiv').toLowerCase() === 'refresh'),
  };
}

if (!fs.existsSync(sitemapPath)) {
  fail(`Missing ${sitemapPath}. Run npm run build first.`);
} else {
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  const sitemapUrls = new Set(
    [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => normalizeUrl(xmlDecode(match[1]))),
  );

  const priceDataPath = path.join(projectRoot, 'src', 'data', 'price_history.json');
  const priceData = JSON.parse(fs.readFileSync(priceDataPath, 'utf8'));
  const noindexUrls = new Set(noindexPricePagePaths(priceData).map(normalizeUrl));
  const redirectUrls = new Set(staticRedirectPaths.map(normalizeUrl));

  const expiredRedirectsPath = path.join(projectRoot, 'src', 'data', 'expired_redirects.json');
  if (fs.existsSync(expiredRedirectsPath)) {
    const expiredRedirects = JSON.parse(fs.readFileSync(expiredRedirectsPath, 'utf8'));
    for (const slug of Object.keys(expiredRedirects)) {
      redirectUrls.add(normalizeUrl(`/posts/${slug}/`));
    }
  }

  for (const htmlPath of listHtmlFiles(distDir)) {
    const policies = pagePolicies(htmlPath);
    const pageUrl = normalizeUrl(routeForHtml(htmlPath));
    if (policies.noindex) noindexUrls.add(pageUrl);
    if (policies.redirect) redirectUrls.add(pageUrl);
  }

  const violations = [];
  for (const url of noindexUrls) {
    if (sitemapUrls.has(url)) violations.push(`noindex URL present: ${url}`);
  }
  for (const url of redirectUrls) {
    if (sitemapUrls.has(url)) violations.push(`redirect URL present: ${url}`);
  }

  if (violations.length > 0) {
    for (const violation of violations) console.error(`- ${violation}`);
    fail(`${violations.length} sitemap policy violation(s) found.`);
  } else {
    console.log(
      `PASS: ${sitemapUrls.size} sitemap URLs checked; `
      + `${noindexUrls.size} noindex and ${redirectUrls.size} redirect URLs excluded.`,
    );
  }
}
