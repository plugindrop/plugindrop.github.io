import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../src/lib/rehypeIframeTitle.mjs';

test('strips stale discount claim from iframe titles only', () => {
  const tree = { type: 'root', children: [
    { type: 'element', tagName: 'iframe', properties: { title: '17% Off Prophet 5 — Analog Poly Synth ($99) — sound demo' }, children: [] },
    { type: 'element', tagName: 'a', properties: { title: '17% Off keep' }, children: [] },
  ] };
  plugin()(tree);
  assert.equal(tree.children[0].properties.title, 'Prophet 5 — Analog Poly Synth — sound demo');
  assert.equal(tree.children[1].properties.title, '17% Off keep');
});

test('handles raw html nodes', () => {
  const tree = { type: 'root', children: [{ type: 'raw', value: '<iframe src="x" title="60% Off Analog Polysynth ($199) — audio demo"></iframe>' }] };
  plugin()(tree);
  assert.equal(tree.children[0].value, '<iframe src="x" title="Analog Polysynth — audio demo"></iframe>');
});
