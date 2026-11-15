import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import('playwright');
const base = process.env.V4_PREVIEW_URL ?? 'http://localhost:4321';
const output = path.resolve('reports/_design');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const slugs = ['rc-20-retro-color-v2-cbb4c6', 'ssl-blitzer-4287ec'];
try {
  for (const slug of slugs) for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(`${base.replace(/\/$/, '')}/posts/${slug}/`, { waitUntil: 'networkidle' });
    const metrics = await page.evaluate(() => {
      const box = selector => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r ? { x: r.x, width: r.width, y: r.y, bottom: r.bottom } : null; };
      return { scrollWidth: document.documentElement.scrollWidth, rail: document.querySelectorAll('.toc-rail-wrap').length,
        read: box('.v4-read'), card: box('.summary'), evidence: box('.evidence'), video: box('.v4-read iframe'),
        h1: box('h1'), price: box('.summary .price'), cta: box('.summary .buy'),
        table: box('[data-cheaper-table]'), jump: box('.jump'),
        jumpReachable: (() => { const el = document.querySelector('.jump'); if (!el) return false; el.scrollLeft = el.scrollWidth; return el.scrollLeft + el.clientWidth >= el.scrollWidth - 1; })() };
    });
    const failures = [];
    if (metrics.rail) failures.push('TOC rail present');
    if (!metrics.h1 || !metrics.price || !metrics.cta) failures.push('first screen content missing');
    if (metrics.cta?.bottom > 900) failures.push('first CTA below fold');
    if (width === 1440) {
      if (metrics.read && Math.abs(metrics.read.x - (width - metrics.read.x - metrics.read.width)) > 8) failures.push('reading column off center');
      if ((metrics.card?.width ?? 0) < 1000 || (metrics.evidence?.width ?? 0) < 1000) failures.push('wide block too narrow');
      if (metrics.video && metrics.video.width < 700) failures.push('video too narrow');
    } else {
      if (metrics.scrollWidth > 390) failures.push(`horizontal overflow: ${metrics.scrollWidth}`);
      if (!metrics.jumpReachable) failures.push('jump bar not reachable');
      if (metrics.table && metrics.table.x + metrics.table.width > 390) failures.push('table clipped');
    }
    const target = path.join(output, `v4-${slug}-${width}.png`);
    await page.screenshot({ path: target, fullPage: true });
    console.log(`${slug} ${width}px: ${failures.length ? failures.join('; ') : 'PASS'} (${target})`);
    await page.close();
    if (failures.length) process.exitCode = 1;
  }
  const legacy = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await legacy.goto(`${base.replace(/\/$/, '')}/posts/native-instruments-massive-xl-4ddac0/`, { waitUntil: 'networkidle' });
  const legacyRail = await legacy.locator('.toc-rail-wrap').count();
  if (legacyRail !== 1) { console.error(`Legacy article rail count: ${legacyRail}`); process.exitCode = 1; }
  await legacy.screenshot({ path: path.join(output, 'v4-legacy-massive-xl-1440.png'), fullPage: true });
  await legacy.close();
} finally { await browser.close(); }
