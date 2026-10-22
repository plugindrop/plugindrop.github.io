import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildDealPool, toCardModel } from '../src/lib/homeDeals.mjs';
import { dealState, hasTrustedExpiry } from '../src/lib/articleDeal.mjs';
import { validatedTagline } from '../src/lib/dealCopy.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const now = Date.parse('2026-10-18T17:00:00Z');
test('an ended latest check cannot fall back to an older sale in card pools', () => {
  const entry = { pb_url: '/product/1/2/999-test', history: [
    { date: '2026-10-15', source: 'auto_check', sale: 49, regular: 199, until: '2026-10-15' },
    { date: '2026-10-16', source: 'auto_check', sale: null, regular: null },
  ] };
  assert.equal(buildDealPool({ Test: entry }, [], now).length, 0);
});

test('expired store deadline and untracked posts never produce percentage cards', () => {
  const entry = { pb_url: '/product/1/2/999-test', history: [
    { date: '2026-10-17', source: 'auto_check', sale: 20, regular: 100, until: '2026-10-15' },
  ] };
  const post = { id: 'untracked', data: { affiliate: '/product/1/2/888-unknown', dealPrice: '$20', originalPrice: '$100', discount: '80%', heroImage: '/images/test.jpg' } };
  assert.equal(buildDealPool({ Test: entry }, [post], now).length, 0);
});

test('above-usual price keeps a muted percent badge, drops urgency and cannot be spotlighted', () => {
  const entry = { pb_url: '/product/1/2/999-test', typical_sale: 80, history: [
    { date: '2026-06-01', source: 'auto_check', sale: 80, regular: 1999 },
    { date: '2026-07-01', source: 'auto_check', sale: null, regular: 1999 },
    { date: '2026-10-18', source: 'auto_check', sale: 199, regular: 1999, until: '2026-10-19' },
  ] };
  const deal = buildDealPool({ 'Waves Platinum': entry }, [], now)[0];
  assert.ok(deal);
  const card = toCardModel(deal, { entries: { 'Waves Platinum': entry }, priceData: { plugins: {}, bundles: {} }, now });
  assert.ok(card.off > 0);
  assert.equal(card.offTone, 'muted');
  assert.equal(card.urgency, null);
  assert.equal(card.chips[0], 'Was $80 on sale in Jun 2026');
});

test('unconfirmed expiry over 60 days after publication is rejected', () => {
  assert.equal(hasTrustedExpiry({ pubDate: '2026-10-18', saleExpiry: '2027-10-12' }), false);
});

test('render guard drops boilerplate and evaluative copy', () => {
  const record = { status: 'ok', source_url: 'https://www.pluginboutique.com/product/1/2/3-test', tagline_source_quote: 'example', retrieved: '2026-10-18', machine_checks: { quote_in_source: true, grounded_noun: true, lint_pass: true } };
  assert.equal(validatedTagline({ ...record, tagline: 'Pristine pads with huge analogue warmth' }), null);
  assert.equal(validatedTagline({ ...record, tagline: 'Breathe life into your mix bus' }), null);
});

test('built live article has no expired buy box and uses tracker deadline', () => {
  const html = readFileSync(join('dist', 'posts', 'ssl-native-x-echo-de47c7', 'index.html'), 'utf8');
  assert.match(html, /data-deal-state="live"/);
  assert.doesNotMatch(html, /class="deal-cta-box sale-expired/);
  assert.doesNotMatch(html, /Our estimated sale window for this deal has passed/);
  assert.match(html, /priceValidUntil/);
});

test('free tag page has its own title and h1, distinct from the free hub', () => {
  const tag = readFileSync(join('dist', 'tags', 'free', 'index.html'), 'utf8');
  const hub = readFileSync(join('dist', 'free', 'index.html'), 'utf8');
  const h1 = (h) => h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, '').trim();
  assert.notEqual(h1(tag), h1(hub));
  assert.notEqual(tag.match(/<title>([^<]*)/)?.[1], hub.match(/<title>([^<]*)/)?.[1]);
});

test('every percentage card on the built home page has a live tracker entry', () => {
  const html = readFileSync(join('dist', 'index.html'), 'utf8');
  const history = JSON.parse(readFileSync(join('src', 'data', 'price_history.json'), 'utf8'));
  const entries = { ...history.bundles, ...history.plugins };
  const cards = [...html.matchAll(/<article\b[^>]*data-deal-card[^>]*>[\s\S]*?<\/article>/g)];
  for (const [card] of cards) {
    if (!card.includes('class="off-tag"')) continue;
    const key = card.match(/data-product-key="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
    assert.ok(key && entries[key], `untracked percentage card: ${key}`);
    assert.equal(dealState(entries[key], Date.now()), 'live', `expired percentage card: ${key}`);
  }
});

test('ended article sticky titles and breadcrumbs carry no discount claim', () => {
  const violations = [];
  for (const slug of readdirSync(join('dist', 'posts'))) {
    let html;
    try { html = readFileSync(join('dist', 'posts', slug, 'index.html'), 'utf8'); } catch { continue; }
    if (!html.includes('data-deal-state="ended"')) continue;
    const sticky = html.match(/class="sticky-cta"[\s\S]*?class="sticky-title"[^>]*>([^<]*)</)?.[1] ?? '';
    const breadcrumb = html.match(/class="breadcrumb"[\s\S]*?<\/nav>/)?.[0] ?? '';
    if (/\d+%\s*Off/i.test(sticky)) violations.push(`${slug}: sticky`);
    if (/\d+%\s*Off/i.test(breadcrumb)) violations.push(`${slug}: breadcrumb`);
    for (const iframe of html.matchAll(/<iframe\b[^>]*>/g)) {
      if (/\d+%\s*Off/i.test(iframe[0].match(/\btitle="([^"]*)"/)?.[1] ?? '')) violations.push(`${slug}: iframe`);
    }
  }
  assert.deepEqual(violations, []);
});
