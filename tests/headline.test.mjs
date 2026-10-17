import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { composeHeadline, composeSeoTitle } from '../src/lib/headline.mjs';
const input={brand:'Waves',product:'Plate',category:'Reverb',tagline:null,off:80};
test('live, ended, free and tagline headlines follow state',()=>{
  assert.equal(composeHeadline({...input,state:'live'}),'Waves "Plate" is 80% off: reverb');
  assert.equal(composeHeadline({...input,state:'ended'}),'Waves "Plate": price history and last sale');
  assert.equal(composeHeadline({...input,state:'free'}),'Waves "Plate" is free');
  assert.equal(composeHeadline({...input,state:'live',tagline:'A plate reverb'}),'A plate reverb: Waves "Plate" is 80% off');
  assert.doesNotMatch(composeSeoTitle({...input,state:'ended'}),/%/);
});
