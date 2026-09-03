const SITE_URL = 'https://plugindrop.net';

function attributeValue(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? '';
}

export function hasRobotsNoindex(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  return metaTags.some((tag) =>
    attributeValue(tag, 'name').toLowerCase() === 'robots'
    && attributeValue(tag, 'content').toLowerCase().split(',').some((token) => token.trim() === 'noindex')
  );
}

export function isRedirectStub(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  return metaTags.some((tag) => attributeValue(tag, 'http-equiv').toLowerCase() === 'refresh');
}

function normalizeInternalHref(href) {
  if (!href || href.startsWith('#') || /^(?:mailto|tel):/i.test(href)) return null;
  let url;
  try {
    url = new URL(href, SITE_URL);
  } catch {
    return null;
  }
  if (url.origin !== SITE_URL) return null;
  let pathname = url.pathname;
  if (pathname.endsWith('.html')) pathname = pathname.slice(0, -'.html'.length);
  if (!pathname.endsWith('/')) pathname += '/';
  return pathname;
}

export function extractInternalHrefs(html) {
  const hrefs = [];
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const normalized = normalizeInternalHref(attributeValue(match[0], 'href'));
    if (normalized) hrefs.push(normalized);
  }
  return hrefs;
}

export function routeForHtmlPath(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/');
  if (normalized === 'index.html') return '/';
  if (normalized.endsWith('/index.html')) return `/${normalized.slice(0, -'index.html'.length)}`;
  return `/${normalized.slice(0, -'.html'.length)}/`;
}

function xmlDecode(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

export function countSitemapSections(xml) {
  const counts = new Map();
  for (const match of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
    let section;
    try {
      const pathname = new URL(xmlDecode(match[1]), SITE_URL).pathname;
      section = pathname.split('/').filter(Boolean)[0] ?? '(root)';
    } catch {
      continue;
    }
    counts.set(section, (counts.get(section) ?? 0) + 1);
  }
  return counts;
}
