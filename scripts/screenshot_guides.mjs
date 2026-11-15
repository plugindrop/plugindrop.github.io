import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const slugs = (process.env.GUIDE_SCREENSHOT_SLUGS ?? 'best-free-compressor-vst-plugins,best-vst-plugins-under-100-dollars,best-mastering-plugins-2026,fabfilter-pro-c-2-review,serum-vs-vital-comparison,how-to-use-reverb-in-mixing').split(',');
const output = path.resolve('../../reports/_design');
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
let server;
let base = process.env.GUIDE_PREVIEW_URL;
if (!base) {
  server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const target = path.resolve('dist', relative, path.extname(relative) ? '' : 'index.html');
    if (!target.startsWith(path.resolve('dist') + path.sep)) { res.writeHead(403).end(); return; }
    try { res.setHeader('Content-Type', mime[path.extname(target)] ?? 'application/octet-stream'); res.end(await readFile(target)); }
    catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch({ headless: true });
let failures = 0;
let checked = 0;
try {
  for (const slug of slugs) for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const response = await page.goto(`${base}/posts/${slug}/`, { waitUntil: 'networkidle' });
    if (response?.status() === 404) { console.log(`${slug} ${width}: SKIP (no v4 fixture)`); await page.close(); continue; }
    const m = await page.evaluate(() => {
      const rect = selector => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r && { x: r.x, width: r.width, top: r.top, right: r.right }; };
      const jump = document.querySelector('.guide-v4 .jump');
      const videoPicks = [...document.querySelectorAll('.guide-v4 [data-pick]')].filter(el => el.querySelector('iframe'));
      if (jump) jump.scrollLeft = jump.scrollWidth;
      return { v4: !!document.querySelector('.guide-v4'), scroll: document.documentElement.scrollWidth,
        layout: rect('.guide-v4'), video: rect('.guide-v4 iframe'), table: rect('.guide-v4 [data-picks-table]'),
        rail: document.querySelectorAll('.toc-rail-wrap').length, videoPicks: videoPicks.length,
        jump: !jump || jump.scrollLeft + jump.clientWidth >= jump.scrollWidth - 1 };
    });
    if (!m.v4) { console.log(`${slug} ${width}: SKIP (legacy article)`); await page.close(); continue; }
    checked++;
    const errors = [];
    if (m.scroll > width) errors.push(`overflow ${m.scroll}px`);
    if (m.rail) errors.push('TOC rail');
    if (!m.table && page.url().includes('fixture')) errors.push('price table missing');
    if (m.videoPicks && !m.video) errors.push('video missing');
    if (width === 1440) {
      if (!m.layout || m.layout.width < 900 || m.layout.width > 961) errors.push('column width');
      if (m.layout && Math.abs(m.layout.x - (width - m.layout.right)) > 8) errors.push('column alignment');
      if (m.video && m.video.top > 1350) errors.push('video below 1.5 screens');
      if (m.table && m.table.width < 900) errors.push('narrow table');
    } else if (!m.jump) errors.push('jump bar unreachable');
    await page.screenshot({ path: path.join(output, `guide-${slug}-${width}.png`), fullPage: true });
    console.log(`${slug} ${width}: ${errors.length ? errors.join('; ') : 'PASS'}`);
    failures += Number(errors.length > 0);
    await page.close();
  }
} finally { await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); }
if (!checked) { console.error('No guide v4 pages rendered'); failures++; }
process.exitCode = failures ? 1 : 0;
