import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { discountCheck } from '../src/lib/discountCheck.mjs';
import { isPricePageIndexable } from '../src/lib/indexPolicy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function summarizeDiscountChecks(data, buildDate) {
  const entries = [...Object.entries(data.plugins ?? {}), ...Object.entries(data.bundles ?? {})];
  const lineCounts = { L1: 0, L2: 0, L3: 0 };
  let indexablePricePages = 0;
  let pricePagesWithBlock = 0;
  const flags = [];
  const blocks = [];
  const byText = new Map();
  for (const [name, entry] of entries) {
    const indexable = isPricePageIndexable(entry);
    if (indexable) indexablePricePages++;
    const result = discountCheck(entry, { buildDate });
    if (!result) continue;
    if (indexable) pricePagesWithBlock++;
    const text = result.lines.map((line) => line.text).join('\n');
    blocks.push({ name, lines: result.lines, flags: result.flags });
    byText.set(text, [...(byText.get(text) ?? []), name]);
    for (const line of result.lines) lineCounts[line.key]++;
    for (const flag of result.flags) flags.push({ name, flag });
  }
  const duplicateBlocks = [...byText.values()].filter((names) => names.length > 1);
  return { buildDate, source: 'inner origin/main working-tree src/data/price_history.json (Mac is canonical; this is a snapshot)',
    sourceLastUpdated: data.last_updated, productsChecked: entries.length, blocksShown: blocks.length,
    indexablePricePages, pricePagesWithBlock,
    lineCounts, flags, duplicateBlocks, uniqueBlocks: duplicateBlocks.length === 0, blocks };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(await readFile(resolve(root, 'src/data/price_history.json'), 'utf8'));
  const buildDate = process.argv[2] ?? '2026-11-02';
  const report = summarizeDiscountChecks(data, buildDate);
  const path = resolve(root, 'reports', `discount_check_dryrun_${buildDate}.json`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ path, productsChecked: report.productsChecked, blocksShown: report.blocksShown,
    indexablePricePages: report.indexablePricePages, pricePagesWithBlock: report.pricePagesWithBlock,
    lineCounts: report.lineCounts, flags: report.flags, duplicateBlocks: report.duplicateBlocks }));
  if (!report.uniqueBlocks) process.exitCode = 1;
}
