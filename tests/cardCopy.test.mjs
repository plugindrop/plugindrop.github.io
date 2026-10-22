import test from 'node:test';
import assert from 'node:assert/strict';
import { cardCopyLine } from '../src/lib/cardCopy.mjs';
test('tagline wins, maker is cited, and absent copy stays absent',()=>{
  const maker={quote:'A useful plate reverb for vocal tracks.',source_url:'https://example.com/product'};
  assert.deepEqual(cardCopyLine({tagline:'Plate reverb',makerQuote:maker}),{text:'Plate reverb',kind:'tagline'});
  assert.deepEqual(cardCopyLine({makerQuote:maker}),{text:maker.quote,kind:'maker',cite:maker.source_url,attribution:'example.com'});
  assert.deepEqual(cardCopyLine({}),{text:null,kind:null});
});
