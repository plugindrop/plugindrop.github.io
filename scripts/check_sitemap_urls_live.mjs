import { fileURLToPath } from 'node:url';
import { auditOfflineSitemaps, auditLiveSitemaps } from '../src/lib/sitemapLiveAudit.mjs';

const liveArg = process.argv.indexOf('--live');
try {
  const result = liveArg < 0
    ? auditOfflineSitemaps(fileURLToPath(new URL('../dist/', import.meta.url)))
    : await auditLiveSitemaps(process.argv[liveArg + 1]);
  for (const error of result.errors) console.error(`FAIL: ${error}`);
  if (result.errors.length) process.exitCode = 1;
  else console.log(`PASS: ${result.entries.length} sitemap URLs are live and indexable (${liveArg < 0 ? 'offline' : 'HTTP'}).`);
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
