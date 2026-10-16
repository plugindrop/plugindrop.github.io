import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { isPostDealEnded } from '../src/lib/articleDeal.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const rules = JSON.parse(fs.readFileSync(new URL('../src/data/content_lint_rules.json', import.meta.url), 'utf8'));
const freePaid = JSON.parse(fs.readFileSync(new URL('../src/data/free_paid_product_links.json', import.meta.url), 'utf8'));
const todayLocal = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
if (!Array.isArray(rules.experience) || !Array.isArray(rules.expired_sale)) throw new Error('invalid content lint rules');

export function lintContent(text, today, { trackerEnded = false } = {}) {
  const body = text.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  let fenced = false;
  const clean = body.split(/\r?\n/).filter(line => {
    if (line.trimStart().startsWith('```')) { fenced = !fenced; return false; }
    return !fenced && !line.trimStart().startsWith('>') && !/["“].+["”]\s*[—-]\s*\w+/.test(line);
  }).join('\n');
  const hits = [];
  const experienceClean = clean.split('\n').filter(line => !rules.experience_exclude?.some(pattern => new RegExp(pattern, 'i').test(line.trim()))).join('\n');
  if (rules.experience.some(pattern => new RegExp(pattern, 'i').test(experienceClean))) hits.push('unsupported_experience');
  const expiry = text.match(/^saleExpiry:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
  const priceUntil = text.match(/priceValidUntil["']?\s*[:=]\s*["']?(\d{4}-\d{2}-\d{2})/)?.[1];
  const livePatterns = rules.expired_sale.filter(pattern => !pattern.includes('You Save') && !pattern.includes('Deal Price'));
  const tableClaim = /^\|[^\n]*\bDeal Price\b[^\n]*\bYou Save\b[^\n]*\|\s*\n\|[-| :]+\|\s*\n\|[^\n]*\$\s*\d+[^\n]*\|/im.test(clean);
  if ((trackerEnded || [expiry, priceUntil].some(value => value && value < today)) && (livePatterns.some(pattern => new RegExp(pattern, 'i').test(clean)) || tableClaim)) hits.push('expired_sale_live');
  for (const line of clean.split('\n')) for (const [, label, url] of line.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)) {
    const parsed = new URL(url);
    const pb = ['pluginboutique.com', 'www.pluginboutique.com'].includes(parsed.hostname.toLowerCase());
    if (label.toLowerCase().includes('plugin boutique') && !pb) hits.push('link_host_mismatch');
    if (pb && (new RegExp(rules.pb_search, 'i').test(url) || parsed.pathname === '/')) {
      const cells = line.trimStart().startsWith('|') ? line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()) : [];
      if (cells.some(cell => /^Free(?:\s*\([^|)]*\))?$/i.test(cell)) || /\b(?:Download|Get)\b[^\]]*\bFree\b/i.test(label)) hits.push('pb_search_cta');
      const title = text.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
      if (title && url.toLowerCase().includes(title.toLowerCase().replaceAll(' ', '+'))) hits.push('title_pb_search');
    }
  }
  if (clean.split('\n').some(line => /\bfree\b/i.test(line) && /pluginboutique\.com\/product\//i.test(line) && Object.entries(freePaid).some(([name, slug]) => line.toLowerCase().includes(name.toLowerCase()) && line.toLowerCase().includes(slug.toLowerCase())))) hits.push('free_paid_cta');
  return [...new Set(hits)];
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {

const checkOnly = process.argv.includes('--check');
const root = path.resolve(process.argv.find((arg, index) => index > 1 && arg !== '--check') ?? 'dist');
const blog = path.resolve('src/content/blog');
const limit = 5;
const findings = new Map();
const tracker = JSON.parse(fs.readFileSync('src/data/price_history.json', 'utf8'));
const trackerEntries = { ...tracker.plugins, ...tracker.bundles };
const add = (slug, reason) => findings.set(slug, [...(findings.get(slug) ?? []), reason]);
for (const file of fs.readdirSync(blog).filter(name => name.endsWith('.md'))) {
  const slug = file.slice(0, -3);
  const text = fs.readFileSync(path.join(blog, file), 'utf8');
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const data = front ? yaml.load(front[1]) : {};
  if (data?.draft === true) continue;
  const trackerEnded = isPostDealEnded({ data, body: text }, trackerEntries);
  for (const reason of lintContent(text, todayLocal(), { trackerEnded })) add(slug, reason);
  if (/installed and ready to use, enjoy!|郢ｧ|邵ｺ/.test(text)) add(slug, 'corrupt specification text');
  if (/\|\s*Ozone Imager 2\s*\|[^\n]*Ozone-12-Advanced/i.test(text)) add(slug, 'free item links to paid product');
}
const today = todayLocal();
for (const slug of fs.readdirSync(path.join(root, 'posts'))) {
  const htmlPath = path.join(root, 'posts', slug, 'index.html');
  if (!fs.existsSync(htmlPath)) continue;
  const html = fs.readFileSync(htmlPath, 'utf8');
  const ld = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  const expired = ld.some(match => [...match[1].matchAll(/"priceValidUntil"\s*:\s*"(\d{4}-\d{2}-\d{2})"/g)].some(date => date[1] < today));
  if (expired && /\b(?:sale live now|on sale now|deal is live|offer is live)\b/i.test(html)) add(slug, 'expired structured price date with live-sale claim');
}
for (const [slug, reasons] of [...findings]) {
  if (!fs.existsSync(path.join(root, 'posts', slug, 'index.html'))) findings.delete(slug);
}
if (findings.size > limit && !checkOnly) throw new Error(`${findings.size} content pages exceed quarantine limit ${limit}; notify maintainers before deployment`);
if (!checkOnly) fs.writeFileSync(path.join(root, 'quarantine-manifest.json'), JSON.stringify([...findings.keys()].sort()));
const sitemaps = fs.readdirSync(root).filter(name => /^sitemap.*\.xml$/.test(name));
for (const [slug, reasons] of findings) {
  if (checkOnly) { console.log(`::warning title=${slug} quarantine candidate::${reasons.join('; ')}`); continue; }
  const htmlPath = path.join(root, 'posts', slug, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace(/<meta\s+name="robots"[^>]*>/i, '').replace('</head>', '<meta name="robots" content="noindex, follow" /></head>');
  fs.writeFileSync(htmlPath, html);
  for (const sitemap of sitemaps) {
    const file = path.join(root, sitemap);
    const xml = fs.readFileSync(file, 'utf8').replace(new RegExp(`<url>\\s*<loc>[^<]*/posts/${slug}/</loc>[\\s\\S]*?</url>`, 'g'), '');
    fs.writeFileSync(file, xml);
  }
  console.log(`::warning title=${slug} quarantined::${reasons.join('; ')}`);
}
console.log(`${checkOnly ? 'Would quarantine' : 'Quarantined'} ${findings.size} content pages`);
}
