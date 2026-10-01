import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditOfflineSitemaps } from '../src/lib/sitemapLiveAudit.mjs';

test('offline sitemap rejects noindex, redirect, missing HTML and fixed lastmod', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-audit-'));
  try {
    fs.mkdirSync(path.join(dir, 'posts', 'a'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), '<html><head></head></html>');
    fs.writeFileSync(path.join(dir, 'posts', 'a', 'index.html'), '<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=/">');
    fs.writeFileSync(path.join(dir, 'sitemap-0.xml'), '<urlset><url><loc>https://plugindrop.net/</loc><lastmod>2026-05-01</lastmod></url><url><loc>https://plugindrop.net/posts/a/</loc><lastmod>2026-05-01</lastmod></url><url><loc>https://plugindrop.net/posts/missing/</loc><lastmod>2026-05-01</lastmod></url></urlset>');
    const { errors } = auditOfflineSitemaps(dir, new Date('2026-10-01'));
    assert.ok(errors.some((error) => error.includes('Nonindexable')));
    assert.ok(errors.some((error) => error.includes('Missing HTML')));
    assert.ok(errors.some((error) => error.includes('same lastmod')));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
