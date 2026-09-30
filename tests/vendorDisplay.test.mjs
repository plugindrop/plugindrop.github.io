import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve('.');
const fact = (value, display = String(value), extra = {}) => ({ value, display, source_url: 'https://vendor.example/products/source?id=1&utm_source=test', quote: String(value), fetched_at: '2026-09-28', source_kind: 'vendor', ...extra });
const plan = (name, display, period = 'one_time') => ({ name, display, period, source_url: 'https://vendor.example/plans', quote: `${name} ${display}`, fetched_at: '2026-09-28', source_kind: 'vendor' });
const product = (name, kind = 'plugin', superseded_by = null) => ({ name, kind, superseded_by, status: 'verified', product_url: 'https://vendor.example/products/official?utm_source=test&a_aid=123' });

const products = {
  'vp-fixture-free': product('Fixture Free'),
  'vp-fixture-paid': product('Fixture Paid'),
  'vp-fixture-unpriced': product('Fixture Unpriced'),
  'vp-fixture-daw-a': product('Fixture DAW A', 'daw'),
  'vp-fixture-daw-b': product('Fixture DAW B', 'daw'),
  'vp-fixture-daw-unpriced': product('Fixture DAW Unpriced', 'daw'),
  'vp-fixture-service': product('Fixture Service', 'service'),
  'vp-fixture-service-one': product('Fixture Service One', 'service'),
  'vp-fixture-legacy': product('Fixture Legacy', 'plugin', 'Fixture New'),
};
const facts = {
  'FabFilter Pro-Q 4': { apple_silicon: fact(true, 'Yes') },
  'vp-fixture-free': { is_free: fact(true, 'Free'), formats: fact(['VST3', 'AU']) },
  'vp-fixture-paid': { price: fact(null, '€49', { quote: '€49' }), apple_silicon: fact(true, 'Yes') },
  'vp-fixture-unpriced': { formats: fact(['VST3']) },
  'vp-fixture-daw-a': { plans: [plan('Producer', '$199'), plan('Monthly', '$19', 'month')] },
  'vp-fixture-daw-b': { plans: [plan('Studio', '€149')] },
  'vp-fixture-daw-unpriced': { plans: [] },
  'vp-fixture-service': { plans: [plan('Basic', '$9', 'month'), plan('Plus', '$99', 'year')] },
  'vp-fixture-service-one': { plans: [plan('Basic', '$9', 'month')] },
  'vp-fixture-legacy': {
    formats: fact(['VST3', 'AU'], 'VST3, AU', { source_kind: 'wayback', archived_at: '2023-05-10', source_url: 'https://web.archive.org/web/20230510/https://vendor.example/legacy' }),
    macos_min: fact('macOS 11', 'macOS 11', { source_kind: 'vendor_docs' }),
    price: fact(99, '$99'),
  },
};
const map = {
  'best-eq-plugins-2026': ['vp-fixture-free'],
  'best-limiter-plugins-2026': ['vp-fixture-paid'],
  'best-acoustic-guitar-vst-plugins': ['vp-fixture-free', 'vp-fixture-unpriced'],
  'best-bass-guitar-vst-plugins': ['vp-fixture-free', 'vp-fixture-paid'],
  'valhalla-room-vs-vintageverb': ['vp-fixture-free'],
  'ableton-live-vs-fl-studio-2026': ['vp-fixture-daw-a', 'vp-fixture-daw-b'],
  'ableton-live-vs-logic-pro-2026': ['vp-fixture-daw-a', 'vp-fixture-daw-unpriced'],
  'fl-studio-21-review': ['vp-fixture-daw-a'],
  'splice-review-2026': ['vp-fixture-service'],
  'landr-mastering-worth-it-2026': ['vp-fixture-service-one'],
  'fabfilter-pro-c-2-review': ['vp-fixture-legacy'],
  'kontakt-7-review': ['vp-fixture-paid'],
  'izotope-rx-review': ['vp-fixture-paid'],
};

function fixtureSite(directory) {
  const link = (source, target) => fs.symlinkSync(path.join(root, source), path.join(directory, target), 'junction');
  fs.mkdirSync(path.join(directory, 'src'), { recursive: true });
  for (const item of ['node_modules', 'public']) link(item, item);
  for (const item of ['assets', 'content', 'lib', 'styles']) link(`src/${item}`, `src/${item}`);
  for (const item of ['components', 'layouts', 'pages']) fs.cpSync(path.join(root, 'src', item), path.join(directory, 'src', item), { recursive: true });
  for (const item of ['consts.ts', 'content.config.ts']) fs.copyFileSync(path.join(root, 'src', item), path.join(directory, 'src', item));
  for (const item of ['astro.config.mjs', 'package.json', 'tsconfig.json']) fs.copyFileSync(path.join(root, item), path.join(directory, item));
  const sourceData = path.join(root, 'src', 'data');
  const targetData = path.join(directory, 'src', 'data');
  fs.mkdirSync(targetData);
  for (const item of fs.readdirSync(sourceData)) {
    if (!/\.(json|mjs|ts)$/.test(item) || ['vendor_facts.json', 'post_vendor_map.json', 'vendor_products.json'].includes(item)) continue;
    fs.copyFileSync(path.join(sourceData, item), path.join(targetData, item));
  }
  for (const [file, value] of [['vendor_facts.json', facts], ['post_vendor_map.json', map], ['vendor_products.json', products]]) {
    fs.writeFileSync(path.join(targetData, file), JSON.stringify(value));
  }
}

const post = (directory, slug) => fs.readFileSync(path.join(directory, 'dist', 'posts', slug, 'index.html'), 'utf8');
const block = (html) => html.match(/<section id="compare-table"[^>]*>[\s\S]*?<\/section>/)?.[0] ?? '';

test('empty vendor data preserves every compare-table block', { skip: !process.env.G3_EMPTY_BASELINE, timeout: 180_000 }, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g3-3-vendor-display-'));
  try {
    fixtureSite(directory);
    for (const file of ['vendor_facts.json', 'post_vendor_map.json']) {
      fs.writeFileSync(path.join(directory, 'src', 'data', file), '{}');
    }
    execFileSync(process.execPath, [path.join(directory, 'node_modules', 'astro', 'bin', 'astro.mjs'), 'build'], { cwd: directory, timeout: 150_000, stdio: 'pipe' });
    const baseline = path.resolve(process.env.G3_EMPTY_BASELINE);
    const slugs = fs.readdirSync(path.join(baseline, 'posts'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    const changed = slugs.filter((slug) => block(fs.readFileSync(path.join(baseline, 'posts', slug, 'index.html'), 'utf8')) !== block(post(directory, slug)));
    assert.deepEqual(changed, []);
    assert.equal(slugs.length, 490);
  } finally {
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.match(path.basename(directory), /^g3-3-vendor-display-/);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('vendor display fixture renders only verified comparison, plan and legacy blocks', { timeout: 180_000 }, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g3-3-vendor-display-'));
  try {
    fixtureSite(directory);
    execFileSync(process.execPath, [path.join(directory, 'node_modules', 'astro', 'bin', 'astro.mjs'), 'build'], { cwd: directory, timeout: 150_000, stdio: 'pipe' });
    const mixed = block(post(directory, 'best-eq-plugins-2026'));
    assert.match(mixed, /data-facts-table/);
    assert.match(mixed, /Vendor price/);
    assert.match(mixed, /Free/);
    assert.match(mixed, /not tracked/);
    assert.match(mixed, /href="https:\/\/vendor\.example\/products\/source\?id=1"/);
    assert.match(mixed, /FabFilter Pro-Q 4[\s\S]*?href="https:\/\/vendor\.example\/products\/source\?id=1"/);
    assert.match(mixed, /as listed on the vendor site on 2026-09-28/);
    assert.doesNotMatch(mixed, /vendor\.example[^" ]*(?:utm_|a_aid=)/);
    assert.match(mixed, /href="https:\/\/vendor\.example\/products\/official"[^>]*rel="noopener"/);
    assert.doesNotMatch(mixed.match(/<a href="https:\/\/vendor\.example\/products\/official"[^>]*>/)?.[0] ?? '', /sponsored/);
    const freeRow = [...mixed.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(([row]) => row).find((row) => row.includes('Fixture Free'));
    assert.equal(freeRow?.match(/not tracked/g)?.length, 5);
    assert.doesNotMatch(block(post(directory, 'best-limiter-plugins-2026')), /data-facts-table/);
    assert.doesNotMatch(block(post(directory, 'best-acoustic-guitar-vst-plugins')), /data-facts-table/);
    const vendorsOnly = block(post(directory, 'best-bass-guitar-vst-plugins'));
    assert.match(vendorsOnly, /data-facts-table/);
    const vpRows = [...vendorsOnly.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(([row]) => row).filter((row) => /Fixture (Free|Paid)/.test(row));
    assert.equal(vpRows.length, 2);
    assert.match(vendorsOnly, /€49/);
    for (const row of vpRows) assert.doesNotMatch(row, /pluginboutique\.com|\/plugin-prices\/|sponsored|utm_|a_aid=/);
    assert.doesNotMatch(vendorsOnly, /Fixture (Free|Paid): now versus typical sale/);
    const valhalla = block(post(directory, 'valhalla-room-vs-vintageverb'));
    for (const name of ['Valhalla Room', 'Valhalla VintageVerb']) {
      const row = [...valhalla.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(([html]) => html).find((html) => html.includes(name));
      assert.ok(row);
      assert.doesNotMatch(row, /View at PB|pluginboutique\.com|sponsored/);
    }
    assert.match(block(post(directory, 'ableton-live-vs-fl-studio-2026')), /data-plan-table/);
    assert.doesNotMatch(block(post(directory, 'ableton-live-vs-logic-pro-2026')), /data-plan-table/);
    assert.match(block(post(directory, 'fl-studio-21-review')), /FL Studio editions and prices today[\s\S]*data-plan-table/);
    assert.match(block(post(directory, 'splice-review-2026')), /data-plan-table/);
    assert.doesNotMatch(block(post(directory, 'landr-mastering-worth-it-2026')), /data-plan-table/);
    const legacy = block(post(directory, 'fabfilter-pro-c-2-review'));
    assert.match(legacy, /data-fact-card data-legacy/);
    assert.match(legacy, /Archived vendor page, captured 2023-05-10 \(Internet Archive\)/);
    assert.doesNotMatch(legacy, /\$99|Vendor price/);
    assert.doesNotMatch(block(post(directory, 'kontakt-7-review')), /data-fact-card/);
    assert.match(block(post(directory, 'izotope-rx-review')), /data-fact-card[\s\S]*€49/);
  } finally {
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.match(path.basename(directory), /^g3-3-vendor-display-/);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
