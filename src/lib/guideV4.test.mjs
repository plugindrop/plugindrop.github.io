import test from 'node:test';
import assert from 'node:assert/strict';
import { isGuideV4, splitGuideV4, resolvePick, priceTableRow } from './guideV4.mjs';

test('marker and roles parse only guide v4', () => {
  const raw = '<!-- guide:v4 kind=roundup -->\n## Pick\n<!-- role:pick -->\n<!-- pick:Plugin A -->';
  const html = '<p>Summary</p><h2 id="pick">Pick</h2><!-- role:pick --><!-- pick:Plugin A --><p>Text</p>';
  assert.equal(isGuideV4(raw), true);
  assert.equal(isGuideV4('## Pick'), false);
  assert.equal(splitGuideV4(html, raw).sections[0].pick, 'Plugin A');
  assert.equal(splitGuideV4('<p>No heading</p>', raw), null);
});

test('price row comes from tracked data and unresolved pick returns null', () => {
  const data = { priceHistory: { plugins: { 'Plugin A': { typical_regular: 100, history: [
    { date: '2026-01-01', regular: 100, source: 'plugin_boutique', store: 'plugin_boutique', cur: 'USD' },
    { date: '2026-01-02', regular: 100, sale: 50, source: 'plugin_boutique', store: 'plugin_boutique', cur: 'USD' },
  ] } } }, productContent: { 'Plugin B': { prose: { intro: 'A useful tool.' } } } };
  assert.equal(resolvePick('Missing', data), null);
  const a = resolvePick('Plugin A', data);
  assert.equal(priceTableRow(a).regular, '$100');
  assert.equal(priceTableRow(resolvePick('Plugin B', data)).current, 'Not tracked');
});
