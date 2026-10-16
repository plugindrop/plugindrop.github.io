import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { lintContent } from '../scripts/quarantine_content.mjs';

test('mandatory disclaimer alone does not quarantine; a real test claim does', () => {
  const disclaimer = 'We have not tested these products hands-on. See our [editorial policy](/editorial-policy/) for how we assess sources.';
  assert.deepEqual(lintContent(disclaimer, '2026-10-15'), []);
  assert.ok(lintContent(`${disclaimer}\nWe tested this plugin.`, '2026-10-15').includes('unsupported_experience'));
  assert.ok(lintContent(`${disclaimer} We tested this plugin.`, '2026-10-15').includes('unsupported_experience'));
  assert.ok(lintContent("We found no published descriptions, but we loved its sound.", '2026-10-15').includes('unsupported_experience'));
});

test('a quarantined linked article is allowed but an ordinary noindex link still fails', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dtm-quarantine-'));
  try {
    const article = path.join(root, 'posts', 'fixture', 'index.html');
    fs.mkdirSync(path.dirname(article), { recursive: true });
    fs.writeFileSync(path.join(root, 'index.html'), '<a href="/posts/fixture/">Fixture</a>');
    fs.writeFileSync(article, '<meta name="robots" content="noindex, follow">');
    const check = () => spawnSync(process.execPath, ['scripts/check_internal_links.mjs'], { env: { ...process.env, DIST_DIR: root }, encoding: 'utf8' });
    assert.notEqual(check().status, 0);
    fs.writeFileSync(path.join(root, 'quarantine-manifest.json'), '["fixture"]');
    assert.equal(check().status, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
