import assert from 'node:assert/strict';
import test from 'node:test';
import { lintContent } from '../scripts/quarantine_content.mjs';

test('rejects CTA fragments and short Plugin Boutique search queries', () => {
  for (const q of ['%E2%86%92%20Get%20Auto', 'Get%20Waves', 'u']) {
    const body = `[Get product](https://www.pluginboutique.com/search?q=${q}&chan=art&data1=test)`;
    assert.ok(lintContent(body, '2026-10-23').includes('pb_search_bad_query'), q);
  }
  assert.ok(!lintContent('[Get product](https://www.pluginboutique.com/search?q=Auto-Tune+Pro&chan=art&data1=test)', '2026-10-23').includes('pb_search_bad_query'));
  assert.ok(!lintContent('[Browse products](https://www.pluginboutique.com/search?search=valhalla&chan=art&data1=test)', '2026-10-23').includes('pb_search_bad_query'));
});

test('a disclaimer saying not a hands-on test is not an experience claim', () => {
  assert.ok(!lintContent('This section is a practical reading of the listed specs, not a hands-on test.', '2026-10-23').includes('unsupported_experience'));
});
