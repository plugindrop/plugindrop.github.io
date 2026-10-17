import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildDealPool, resolveCardImage, toCardModel } from '../src/lib/homeDeals.mjs';
const now=Date.parse('2026-10-17T12:00:00Z');
const entry=(id,image)=>({pb_url:`/product/1/2/${id}-product`,image,history:[{date:'2026-10-16',source:'auto_check',sale:20,regular:100}]});
test('PB id dedupe and search URLs excluded',()=>{
  const entries={Platinum:entry(12345,'/images/p.jpg'),'Waves Platinum':entry(12345,null),Search:{...entry(99999),pb_url:'/search?q=foo'}};
  assert.equal(buildDealPool(entries,[],now).length,1);
});
test('image fallback prefers real article, entry and sibling; never AI art',()=>{
  const sibling=entry(12345,'/images/sibling.jpg');
  assert.equal(resolveCardImage({post:{data:{heroImage:'/images/hero.jpg',aiImage:true}},entry:entry(12345,null),siblings:[sibling]}).src,'/images/sibling.jpg');
  assert.equal(resolveCardImage({post:{data:{heroImage:'/images/hero.jpg'}},entry:sibling}).kind,'article');
  assert.equal(resolveCardImage({entry:entry(12345,null)}).kind,'typographic');
});
test('everyday sale and ended article are excluded',()=>{
  const stable={...entry(12345),history:['2026-08-01','2026-08-15','2026-09-01','2026-09-20','2026-10-16'].map(date=>({date,source:'auto_check',sale:20,regular:100}))};
  assert.equal(buildDealPool({Stable:stable},[],now).length,0);
  const post={id:'old',data:{affiliate:'/product/1/2/55555-old',dealPrice:'$20',originalPrice:'$100',discount:'80%',heroImage:'/images/old.jpg',saleExpiry:'2026-10-01'}};
  assert.equal(buildDealPool({},[post],now).length,0);
});
test('free article never enters deal pool or receives an affiliate CTA',()=>{
  const post={id:'free',data:{affiliate:'/product/1/2/55555-free',dealPrice:'FREE',originalPrice:'$100',discount:'100%',heroImage:'/images/free.jpg'}};
  assert.equal(buildDealPool({},[post],now).length,0);
});
test('card headline uses tracker discount, not stale article copy',()=>{
  const tracked=entry(12345,'/images/product.jpg');
  const deal=buildDealPool({'Waves Plate':tracked},[],now)[0];
  const model=toCardModel(deal,{entries:{'Waves Plate':tracked},priceData:{plugins:{'Waves Plate':tracked},bundles:{}},now});
  assert.match(model.headline,/80% off/);
  assert.match(model.ctaHref,/chan=home/);
});
