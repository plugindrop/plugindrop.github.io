import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { isV4Article } from '../src/lib/articleTemplate.mjs';
import { splitV4Article } from '../src/lib/v4Article.mjs';

test('detects only role marked articles', () => {
  assert.equal(isV4Article('<!-- role:product -->'), true);
  assert.equal(isV4Article('ordinary article'), false);
});
test('splits role sections and removes generated price blocks', () => {
  const html = '<p>Intro</p><h2 id="what">What</h2>\n<!-- role:product --><p>Product</p><h2 id="sound">Sound</h2>\n<!-- role:sound --><!-- deal-context-video:start --><div>VIDEO</div><!-- deal-context-video:end --><p>Sound copy</p><h2 id="faq">FAQ</h2>\n<!-- role:faq --><p>Q: One?</p><p>A: First.</p><!-- deal-context-sale-windows:start -->OLD<!-- deal-context-sale-windows:end -->';
  const result = splitV4Article(html);
  assert.equal(result.sections.length, 3);
  assert.match(result.videoHtml, /VIDEO/);
  assert.doesNotMatch(JSON.stringify(result), /OLD/);
  assert.equal(result.faqItems[0].q, 'One?');
  assert.equal(splitV4Article('<h2>Broken</h2>'), null);
});
