import fs from 'node:fs';
import path from 'node:path';
let badPbQueries = 0, notPublished = 0, publishedPages = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (entry.name !== 'index.html') continue;
    const html = fs.readFileSync(file, 'utf8');
    if (file.includes(path.join('dist', 'posts')) && !/<meta[^>]+name="robots"[^>]+noindex/i.test(html)) {
      publishedPages++;
      notPublished += (html.match(/not published/gi) ?? []).length;
    }
    for (const match of html.matchAll(/https?:\/\/(?:www\.)?pluginboutique\.com\/search\?[^"<>\s]*/g)) {
      const q = new URL(match[0].replaceAll('&amp;', '&')).searchParams.get('q') ?? '';
      if (/^(?:→|Get\s+)/i.test(q)) badPbQueries++;
    }
  }
}
walk('dist');
console.log({ badPbQueries, notPublished, publishedPages });
