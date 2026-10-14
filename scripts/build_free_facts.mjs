import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const slugs = ['best-free-plugins-fl-studio', 'best-free-plugins-ableton', 'best-free-synth-plugins', 'best-free-guitar-amp-vst', 'best-free-tape-saturation-vst', 'spitfire-labs-free-sample-library', 'best-free-strings-vst-plugins', 'best-free-vst-plugins-2026', 'best-free-drum-plugins'];
const excluded = /pluginboutique|youtube|soundcloud|amazon|splice\.com|sweetwater|thomann|kvraudio|plugins4free|osirisguitar/i;
const officialOverrides = {
  'Vital': 'https://vital.audio/', 'TAL-NoiseMaker': 'https://tal-software.com/products/tal-noisemaker',
  'Surge XT': 'https://surge-synthesizer.github.io/', 'Dexed': 'https://asb2m10.github.io/dexed/',
  'Helm': 'https://tytel.org/helm/', 'Valhalla Supermassive': 'https://valhalladsp.com/shop/reverb/valhalla-supermassive/',
  'Spitfire LABS': 'https://labs.spitfireaudio.com/', 'LABS': 'https://labs.spitfireaudio.com/',
  'TDR Nova': 'https://www.tokyodawn.net/tdr-nova/', 'Sitala by Decomposer': 'https://decomposer.de/sitala/',
  'Native Instruments Komplete Start': 'https://www.native-instruments.com/en/products/komplete/bundles/komplete-start/',
  'iZotope Vinyl': 'https://www.izotope.com/en/products/vinyl.html',
  'TAL-Reverb-4': 'https://tal-software.com/products/tal-reverb-4',
  'Kilohearts Essentials': 'https://kilohearts.com/products/kilohearts_essentials',
  'OTT (Xfer Records)': 'https://xferrecords.com/freeware',
  'Youlean Loudness Meter 2': 'https://youlean.co/youlean-loudness-meter/',
  'Zebralette 3': 'https://u-he.com/products/zebralette/',
  'Steven Slate Drums SSD5.5 FREE': 'https://stevenslatedrums.com/ssd5/',
  'MT Power Drum Kit 2': 'https://www.powerdrumkit.com/',
  'Hydrogen': 'https://hydrogen-music.org/',
  'TX16Wx by CWITEC': 'https://www.tx16wx.com/',
  'Drumatic 4 by e-phonic': 'https://www.e-phonic.com/plugins/drumatic4/',
  'AVL Drumkits': 'https://x42-plugins.com/x42/x42-avldrums',
  'MiniSpillage by AudioSpillage': 'https://www.audiospillage.com/minispillage.html',
  'Ozone Imager 2': 'https://www.izotope.com/en/products/ozone-imager.html',
};
const identityAliases = {
  'Spitfire LABS': 'labs', 'LABS': 'labs',
  'Native Instruments Komplete Start': 'komplete start',
  'ProjectSAM Free Orchestra': 'free orchestra',
  'Youlean Loudness Meter 2': 'youlean loudness meter',
  'MT Power Drum Kit 2': 'mt power drum kit',
  'Steven Slate Drums SSD5.5 FREE': 'ssd5.5',
};
const paid = /^(serum(?: 2)?|harmor|sytrus|massive x|izotope neutron|neural dsp archetype|bias amp|rc-20|soundtoys decapitator|spitfire bbc symphony orchestra|eastwest hollywood strings|phase plant|u-he hive)/i;
const fields = ['license', 'os', 'formats', 'version_date', 'registration'];
export const verifiedCount = product => fields.filter(field => product.facts[field]).length;
export const tableEligible = products => products.length > 0 && products.filter(product => verifiedCount(product) >= 3).length / products.length >= 0.6;

export function articleProducts(markdown) {
  const headings = [...markdown.matchAll(/^###\s+(.+)$/gm)];
  return headings.flatMap((match, i) => {
    const title = match[1].replace(/^\d+\.\s*/, '').split(/\s+[—–-]\s+/)[0].trim();
    if (!title || paid.test(title) || /when available/i.test(match[1])) return [];
    const section = markdown.slice(match.index + match[0].length, headings[i + 1]?.index ?? markdown.length);
    const links = [...section.matchAll(/\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/g)].map(m => m[1]);
    const url = officialOverrides[title] ?? links.find(u => !excluded.test(u) && !/\?a_aid=/.test(u)) ?? null;
    return [{ name: title, url }];
  });
}

function fact(value, quote, source_url, fetched_at) {
  return { value, source_url, quote, source_kind: 'vendor', fetched_at };
}
function matched(text, regex, value, url, date) {
  const match = text.match(regex);
  return match ? fact(typeof value === 'function' ? value(match) : value, match[0], url, date) : null;
}
export function supported(item, text) {
  return !!item && typeof item.source_url === 'string' && item.source_url.startsWith('https://') &&
    typeof item.quote === 'string' && item.quote.length > 0 && text.includes(item.quote) && (!item.date_quote || text.includes(item.date_quote)) &&
    typeof item.fetched_at === 'string';
}
export function extractFacts(text, url, date) {
  const demo = matched(text, /\b(?:demo version|trial version)\b/i, 'Demo', url, date);
  const license = demo ?? matched(text, /\b(?:free download|download for free|completely free|free and open.source|free plugin|free instrument)\b/i, 'Free', url, date);
  const os = matched(text, /\b(?:Windows|macOS|Mac OS|Linux)\s+\d+(?:\.\d+)*(?:\.x)?\b/i, m => m[0], url, date);
  const formats = matched(text, /\b(?:VST3|AU|AAX|CLAP)(?:\s*(?:,|\/|and)\s*(?:VST3|AU|AAX|CLAP))+/i, m => m[0], url, date)
    ?? matched(text, /\b(?:VST3|AAX|CLAP)\b/i, m => m[0], url, date);
  const apple_silicon = matched(text, /\b(?:Native Apple Silicon|Apple Silicon|Universal|native)\b/i, m => m[0], url, date);
  const latest_version = matched(text, /\b(?:latest version|version|v)\s*\d+(?:\.\d+){1,3}\b/i, m => m[0], url, date);
  const release_date = matched(text, /\b(?:released?|updated?)\s+(?:on\s+)?(?:\d{4}-\d{2}-\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/i, m => m[0], url, date);
  const registration = matched(text, /\b(?:no (?:account|registration|sign.?up) required|(?:account|registration|sign.?up) required(?: to download)?|create (?:an? )?account to download)\b/i, m => m[0], url, date);
  const size = matched(text, /\b(?:download size|installer size|file size)\s*:?\s*\d+(?:\.\d+)?\s*(?:MB|GB)\b/i, m => m[0], url, date);
  const version_date = latest_version && release_date ? { ...fact(`${latest_version.value} · ${release_date.value}`, latest_version.quote, url, date), date_quote: release_date.quote } : null;
  return { license, os, formats, apple_silicon, latest_version, release_date, version_date, registration, size };
}

function visible(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
}
async function fetchVendor(url) {
  if (!url || !url.startsWith('https://')) return { text: '', reason: 'no_official_https_url' };
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PluginDropFacts/1.0)' } });
    if (!response.ok) return { text: '', reason: `HTTP_${response.status}` };
    const html = await response.text();
    const text = visible(html);
    return { text, reason: text.length < 100 ? 'js_or_empty_page' : null, url: response.url };
  } catch (error) { return { text: '', reason: error.cause?.code ?? error.name ?? 'fetch_failed' }; }
}
function cell(item) {
  if (!item) return '<td>—</td>';
  const value = String(item.value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<td><a href="${item.source_url.replaceAll('&', '&amp;')}" rel="noopener" target="_blank" title="Source: ${item.quote.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">${value}</a></td>`;
}
export function renderFacts(products, checkedAt) {
  const rows = products.map(p => `<tr data-free="${p.facts.license?.value === 'Free'}"><th scope="row">${p.name.replaceAll('&', '&amp;')}</th>${fields.map(f => cell(p.facts[f])).join('')}</tr>`).join('\n');
  return `<!-- free-facts:start -->\n<section id="free-facts" class="free-facts" aria-label="Verified free plugin comparison"><h2>Developer facts</h2><p>Only cited developer details are shown. Checked ${checkedAt}.</p><div style="overflow-x:auto"><table><thead><tr><th>Plugin</th><th>License</th><th>OS</th><th>Formats</th><th>Latest version and published date</th><th>Registration</th></tr></thead><tbody>${rows}</tbody></table></div></section>\n<!-- free-facts:end -->`;
}
async function main() {
  const date = new Date().toISOString();
  const articles = {};
  for (const slug of slugs) {
    const filename = path.join(root, 'src/content/blog', `${slug}.md`);
    const bytes = await readFile(filename);
    const markdown = bytes.toString('utf8');
    articles[slug] = { filename, bytes, markdown, products: slug === 'spitfire-labs-free-sample-library' ? [{ name: 'Spitfire LABS', url: 'https://labs.spitfireaudio.com/' }] : articleProducts(markdown) };
  }
  const urls = [...new Set(Object.values(articles).flatMap(a => a.products.map(p => p.url).filter(Boolean)))];
  const fetched = new Map();
  for (let i = 0; i < urls.length; i += 8) {
    await Promise.all(urls.slice(i, i + 8).map(async url => fetched.set(url, await fetchVendor(url))));
  }
  const output = { fetched_at: date, articles: {}, sources: {} };
  for (const [url, result] of fetched) output.sources[url] = { fetched_at: date, final_url: result.url ?? null, reason: result.reason };
  for (const [slug, article] of Object.entries(articles)) {
    const products = article.products.map(p => {
      const source = fetched.get(p.url);
      const identity = identityAliases[p.name] ?? p.name.replace(/\s+by\s+.+$/i, '').replace(/\s+v\d+(?:\.\d+)*$/i, '').toLowerCase();
      const knownIdentity = source?.text?.toLowerCase().includes(identity);
      const officialHost = source?.url && new URL(source.url).hostname.replace(/^www\./, '') === new URL(p.url).hostname.replace(/^www\./, '');
      const facts = source?.text && !source.reason && officialHost && knownIdentity && !/^(?:Sitala|OB-Xd)\b/i.test(p.name) ? extractFacts(source.text, source.url, date) : Object.fromEntries(fields.map(f => [f, null]));
      for (const [field, item] of Object.entries(facts)) if (item && !supported(item, source.text)) throw new Error(`${slug}: ${p.name}: ${field} quote mismatch`);
      return { name: p.name, official_url: p.url, reason: /^(?:Sitala|OB-Xd)\b/i.test(p.name) ? 'paid_page_cannot_verify_free_edition' : source ? source.reason ?? (!officialHost ? 'redirected_off_official_domain' : !knownIdentity ? 'identity_not_in_page' : Object.values(facts).some(Boolean) ? null : 'no_matching_quote') : 'no_official_https_url', facts };
    });
    output.articles[slug] = products;
    const addition = tableEligible(products) ? renderFacts(products, date.slice(0, 10)) : '';
    const newline = article.bytes.includes(Buffer.from('\r\n')) ? '\r\n' : '\n';
    const clean = article.markdown.replace(/<!-- free-facts:start -->[\s\S]*?<!-- free-facts:end -->\r?\n?/g, '');
    const tldr = /\*\*TL;DR:\*\*[^\r\n]*/.exec(clean);
    const insertAt = tldr ? tldr.index + tldr[0].length : 0;
    let revised = clean;
    if (addition) {
      revised = clean.slice(0, insertAt) + newline + newline + addition.replaceAll('\n', newline) + clean.slice(insertAt);
      revised = revised.replace(/## Full Comparison Table[\s\S]*?(?=\r?\n## |$)/, '');
    } else {
      for (const product of products) {
        const verified = fields.filter(field => product.facts[field]);
        if (!verified.length) continue;
        const heading = [...revised.matchAll(/^###\s+(.+)$/gm)].find(match => match[1].includes(product.name));
        if (!heading) continue;
        const at = heading.index + heading[0].length;
        const line = `**Developer facts:** ${verified.map(field => `${field.replace('_', ' ')}: [${product.facts[field].value}](${product.facts[field].source_url})`).join('; ')}.`;
        revised = revised.slice(0, at) + newline + newline + line + revised.slice(at);
      }
    }
    await writeFile(article.filename, Buffer.from(revised));
  }
  await mkdir(path.join(root, 'src/data'), { recursive: true });
  await writeFile(path.join(root, 'src/data/free_plugin_facts.json'), JSON.stringify(output, null, 2) + '\n');
  const totals = Object.fromEntries(fields.map(f => [f, Object.values(output.articles).flat().filter(p => p.facts[f]).length]));
  console.log(JSON.stringify({ article_count: slugs.length, placements: Object.values(output.articles).flat().length, unique_urls: urls.length, totals }, null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
