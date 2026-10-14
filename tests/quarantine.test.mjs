import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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
