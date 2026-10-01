import fs from 'node:fs';
import path from 'node:path';
import { hasRobotsNoindex, isRedirectStub } from './distAudit.mjs';
import { validLastmod } from './sitemapLastmod.mjs';

export function sitemapEntries(xml) {
  return [...xml.matchAll(/<url>\s*([\s\S]*?)<\/url>/g)].map((match) => ({
    loc: match[1].match(/<loc>([^<]+)<\/loc>/)?.[1]?.replaceAll('&amp;', '&'),
    lastmod: match[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
  }));
}

export function auditOfflineSitemaps(distDir, now = new Date()) {
  const errors = [];
  const entries = fs.readdirSync(distDir).filter((name) => /^sitemap-\d+\.xml$/.test(name))
    .flatMap((name) => sitemapEntries(fs.readFileSync(path.join(distDir, name), 'utf8')));
  if (!entries.length) errors.push('No sitemap URL entries found');
  const dates = [];
  for (const entry of entries) {
    if (!entry.loc) { errors.push('Sitemap URL has no loc'); continue; }
    let pathname;
    try { pathname = new URL(entry.loc).pathname; } catch { errors.push(`Invalid loc: ${entry.loc}`); continue; }
    if (entry.lastmod) {
      if (!validLastmod(entry.lastmod, now)) errors.push(`Invalid or future lastmod: ${entry.loc} ${entry.lastmod}`);
      dates.push(entry.lastmod);
    }
    const htmlPath = pathname === '/' ? path.join(distDir, 'index.html') : path.join(distDir, ...pathname.split('/').filter(Boolean), 'index.html');
    if (!fs.existsSync(htmlPath)) { errors.push(`Missing HTML: ${entry.loc}`); continue; }
    const html = fs.readFileSync(htmlPath, 'utf8');
    if (hasRobotsNoindex(html) || isRedirectStub(html)) errors.push(`Nonindexable HTML: ${entry.loc}`);
  }
  if (entries.length > 1 && dates.length === entries.length && new Set(dates).size === 1) errors.push('All URLs have the same lastmod');
  return { entries, errors };
}

export async function auditLiveSitemaps(base, fetchImpl = fetch) {
  const errors = [];
  const origin = new URL(base).origin;
  async function get(url) {
    let failure;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
        if (response.status === 200) return response;
        failure = `HTTP ${response.status}`;
      } catch (error) { failure = error.message; }
    }
    throw new Error(`${url}: ${failure}`);
  }
  const index = await get(`${origin}/sitemap-index.xml`);
  const sitemapUrls = [...(await index.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1].replaceAll('&amp;', '&'), origin).href);
  const entries = (await Promise.all(sitemapUrls.map(async (url) => sitemapEntries(await (await get(url)).text())))).flat();
  let cursor = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (cursor < entries.length) {
      const entry = entries[cursor++];
      const url = new URL(entry.loc, origin);
      url.host = new URL(origin).host;
      url.protocol = new URL(origin).protocol;
      try {
        const response = await get(url.href);
        if (/\bnoindex\b/i.test(response.headers.get('x-robots-tag') ?? '') || hasRobotsNoindex(await response.text())) errors.push(url.href);
      } catch (error) { errors.push(error.message); }
    }
  }));
  return { entries, errors };
}
