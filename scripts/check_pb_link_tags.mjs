import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OWN_AID = '69cb95abe1763';
const REQUIRED = ['chan', 'data1', 'utm_source', 'utm_medium', 'utm_campaign'];

function decodeEntities(value) {
  return value.replace(/&(?:amp|#38|#x26);/gi, '&');
}

export async function checkPbLinkTags(distDir) {
  let files;
  try { files = await readdir(distDir); } catch {
    throw new Error(`dist directory not found: ${distDir}`);
  }
  const examples = [];
  const counts = Object.fromEntries(REQUIRED.map((key) => [key, 0]));
  let checked = 0;
  async function scan(dir, entries) {
    for (const entry of entries) {
      const filename = path.join(dir, entry);
      const info = await stat(filename);
      if (info.isDirectory()) { await scan(filename, await readdir(filename)); continue; }
      if (!entry.endsWith('.html')) continue;
      const html = await readFile(filename, 'utf8');
      for (const anchor of html.matchAll(/<a\b[^>]*>/gi)) {
        const href = anchor[0].match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
        if (!href) continue;
        let url;
        try { url = new URL(decodeEntities(href)); } catch { continue; }
        if (!/(^|\.)pluginboutique\.com$/i.test(url.hostname) || url.searchParams.get('a_aid') !== OWN_AID) continue;
        checked++;
        const missing = REQUIRED.filter((key) => !url.searchParams.has(key));
        for (const key of missing) counts[key]++;
        if (missing.length && examples.length < 20) examples.push({ file: filename, href: decodeEntities(href), missing });
      }
    }
  }
  await scan(distDir, files);
  return { checked, counts, examples, failures: Object.values(counts).reduce((a, b) => a + b, 0) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const distDir = path.resolve(process.argv[2] ?? 'dist');
    const result = await checkPbLinkTags(distDir);
    console.log(`PB affiliate links checked: ${result.checked}`);
    if (result.failures) {
      console.error(`Missing tags: ${JSON.stringify(result.counts)}`);
      for (const example of result.examples) console.error(`${example.file}: ${example.missing.join(', ')} ${example.href}`);
      process.exitCode = 1;
    } else console.log('PB affiliate tags: pass');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
