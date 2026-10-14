import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'dist');
const blog = path.resolve('src/content/blog');
const limit = 5;
const findings = new Map();
const add = (slug, reason) => findings.set(slug, [...(findings.get(slug) ?? []), reason]);
for (const file of fs.readdirSync(blog).filter(name => name.endsWith('.md'))) {
  const slug = file.slice(0, -3);
  const text = fs.readFileSync(path.join(blog, file), 'utf8');
  if (/\[(?:Plugin Boutique|(?:Get|View|Download|Free|Search)[^\]]*Plugin Boutique)\]\((?!https?:\/\/(?:www\.)?pluginboutique\.com\/)[^)]+\)/i.test(text)) add(slug, 'link label and host differ');
  if (/installed and ready to use, enjoy!|郢ｧ|邵ｺ/.test(text)) add(slug, 'corrupt specification text');
  if (/\|\s*Ozone Imager 2\s*\|[^\n]*Ozone-12-Advanced/i.test(text)) add(slug, 'free item links to paid product');
}
const today = new Date().toISOString().slice(0, 10);
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
if (findings.size > limit) throw new Error(`${findings.size} content pages exceed quarantine limit ${limit}; notify maintainers before deployment`);
fs.writeFileSync(path.join(root, 'quarantine-manifest.json'), JSON.stringify([...findings.keys()].sort()));
const sitemaps = fs.readdirSync(root).filter(name => /^sitemap.*\.xml$/.test(name));
for (const [slug, reasons] of findings) {
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
console.log(`Quarantined ${findings.size} content pages`);
