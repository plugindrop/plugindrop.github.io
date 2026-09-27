import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

test('AuthorBox uses fixed copy without replacement props', async () => {
	const source = await readFile(path.join(root, 'src/components/AuthorBox.astro'), 'utf8');
	assert.match(source, /PluginDrop is written and maintained by SignalDrop, an independent music producer\./);
	assert.match(source, /OPERATOR_SETUP\.map/);
	assert.doesNotMatch(source, /Astro\.props|define:vars|<slot|interface Props/);
	assert.match(source, /href="\/editorial-policy\/"/);
	assert.match(source, /href="\/contact\/"/);
});

test('built article renders fixed AuthorBox copy', async () => {
	const article = await readFile(path.join(root, 'dist/posts/serum-vst-review/index.html'), 'utf8');
	assert.match(article, /PluginDrop is written and maintained by SignalDrop, an independent music producer\./);
	assert.match(article, /aria-label="About the author"/);
});
