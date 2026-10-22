import test from 'node:test';
import assert from 'node:assert/strict';
import { taglineForProduct, makerQuoteForProduct } from '../src/lib/dealCopy.mjs';
import { composeHeadline } from '../src/lib/headline.mjs';
import { cardCopyLine } from '../src/lib/cardCopy.mjs';

test('only sourced validated tagline renders', () => {
  const records = { A: { status: 'ok', tagline: 'Plate reverb', tagline_source_url: 'https://example.com/a', tagline_source_quote: 'plate reverb', tagline_checked: '2026-10-17', machine_checks: { quote_in_source: true, grounded_noun: true, lint_pass: true } } };
  assert.equal(taglineForProduct('A', records), 'Plate reverb');
  assert.equal(taglineForProduct('B', records), null);
  assert.equal(taglineForProduct('A', { A: { ...records.A, tagline_source_quote: '' } }), null);
  assert.equal(taglineForProduct('A', { A: { ...records.A, machine_checks: { ...records.A.machine_checks, grounded_noun: false } } }), null);
  assert.equal(taglineForProduct('A', { A: { ...records.A, machine_checks: undefined } }), null);
});
test('maker quote requires a sourced dated product description without boilerplate or prices',()=>{
  const record={maker_quote:'A plate reverb with adjustable decay and pre-delay controls.',maker_quote_source_url:'https://example.com/product/plate',maker_quote_retrieved:'2026-10-17'};
  assert.deepEqual(makerQuoteForProduct('A',{A:record}),{quote:record.maker_quote,source_url:record.maker_quote_source_url});
  for (const change of [{maker_quote_source_url:'http://example.com/a'},{maker_quote_source_url:'https://pluginboutique.com/'},{maker_quote_retrieved:''},{maker_quote:'A $20 plate reverb with adjustable decay and pre-delay controls.'},{maker_quote:'Audio demo of a plate reverb with adjustable decay and pre-delay controls.'},{maker_quote:'Short'}]) assert.equal(makerQuoteForProduct('A',{A:{...record,...change}}),null);
  assert.equal(makerQuoteForProduct('A',{A:{...record,maker_quote_source_url:'https://example.com/product/plate; https://vendor.example/product'}}),null);
});

test('headline uses plain English product name and current state', () => {
  assert.equal(composeHeadline({ brand: 'Waves', product: 'Platinum Bundle', tagline: 'Plugin bundle', off: 80, state: 'live' }), 'Plugin bundle: Waves Platinum Bundle is 80% off');
  assert.equal(composeHeadline({ brand: 'Waves', product: 'Platinum Bundle', off: 80, state: 'ended' }), 'Waves Platinum Bundle: price history and last sale');
});
test('maker quote uses brand or vendor domain for attribution and never a PB domain',()=>{
  const quote={quote:'A plate reverb with adjustable decay and pre-delay controls.',source_url:'https://vendor.example/product/plate'};
  assert.equal(cardCopyLine({makerQuote:quote,brand:null}).attribution,'vendor.example');
  assert.equal(cardCopyLine({makerQuote:{...quote,source_url:'https://www.pluginboutique.com/product/1/2'},brand:null}).kind,null);
  assert.equal(cardCopyLine({makerQuote:quote,brand:'Acme'}).attribution,'Acme');
});
