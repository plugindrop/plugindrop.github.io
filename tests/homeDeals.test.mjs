import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildDealPool, resolveCardImage, toCardModel, cardTarget, orderForVariety, aboveUsualState, pickSpotlight, endingSoon, brandSaleClusters, allocateSections, clusterSummary } from '../src/lib/homeDeals.mjs';
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
test('variety order keeps tagline groups and stable order when no brand run needs breaking',()=>{
  const cards=[{key:'a',brand:'A',tagline:'one'},{key:'b',brand:'B',tagline:''},{key:'c',brand:'A',tagline:'two'},{key:'d',brand:'B',tagline:' '}];
  assert.deepEqual(orderForVariety(cards).map(c=>c.key),['a','c','b','d']);
  assert.deepEqual(cards.map(c=>c.key),['a','b','c','d']);
});
test('variety order breaks brand runs where possible and retains every card',()=>{
  const cards=[{key:'a1',brand:'A',tagline:'yes'},{key:'a2',brand:'A',tagline:'yes'},{key:'a3',brand:'A',tagline:'yes'},{key:'b1',brand:'B',tagline:'yes'},{key:'a4',brand:'A',tagline:'yes'},{key:'c1',brand:'C',tagline:''},{key:'c2',brand:'C',tagline:''},{key:'c3',brand:'C',tagline:''}];
  const result=orderForVariety(cards);
  assert.deepEqual(result.map(c=>c.key),['a1','a2','b1','a3','a4','c1','c2','c3']);
  assert.equal(result.length,cards.length);
  assert.deepEqual(new Set(result),new Set(cards));
});
test('variety order handles an empty list',()=>{
  assert.deepEqual(orderForVariety([]),[]);
});
test('maker copy participates in variety ordering and spotlight selection',()=>{
  const bare={key:'bare',brand:'A',tier:'S',score:100,off:70,image:{kind:'product'}};
  const quoted={...bare,key:'quoted',copyLine:{kind:'maker',text:'A maker description'},score:100};
  assert.deepEqual(orderForVariety([bare,quoted]).map(c=>c.key),['quoted','bare']);
  assert.equal(pickSpotlight([bare,quoted]).key,'quoted');
  assert.equal(pickSpotlight([bare,{...quoted,tier:'A'}]).key,'bare');
});
test('lower current price than own prior low stays strong even if typical sale is lower',()=>{
  const tracked={...entry(12345,'/images/product.jpg'),typical_sale:5,history:[{date:'2026-06-01',source:'auto_check',sale:30,regular:100},{date:'2026-07-01',source:'auto_check',sale:null,regular:100},{date:'2026-10-16',source:'auto_check',sale:20,regular:100}]};
  const deal=buildDealPool({'Waves Plate':tracked},[],now)[0];
  const model=toCardModel(deal,{entries:{'Waves Plate':tracked},priceData:{plugins:{'Waves Plate':tracked},bundles:{}},now});
  assert.equal(model.aboveUsual,false); assert.equal(model.offTone,'strong');
});
test('above usual needs a prior own sale, retains discount and mutes signals',()=>{
  const tracked={...entry(12345,'/images/product.jpg'),typical_sale:5,history:[{date:'2026-06-01',source:'auto_check',sale:10,regular:100},{date:'2026-07-01',source:'auto_check',sale:null,regular:100},{date:'2026-10-16',source:'auto_check',sale:20,regular:100,until:'2026-10-18'}]};
  assert.deepEqual(aboveUsualState(tracked,20,now),{above:true,low:10,month:'Jun 2026'});
  const deal=buildDealPool({'Waves Plate':tracked},[],now)[0];
  const model=toCardModel(deal,{entries:{'Waves Plate':tracked},priceData:{plugins:{'Waves Plate':tracked},bundles:{}},now});
  assert.equal(model.off,80); assert.equal(model.offTone,'muted'); assert.equal(model.urgency,null); assert.equal(model.rarity,null);
  assert.deepEqual(model.chips,['Was $10 on sale in Jun 2026']);
  assert.match(model.headline, /above its previous low$/);
  assert.equal(pickSpotlight([model]),null);
  assert.deepEqual(endingSoon([model]),[]);
  assert.deepEqual(brandSaleClusters([model,model,model]),[]);
  assert.equal(aboveUsualState({...tracked,history:[tracked.history[2]]},20,now),null);
});
test('cluster summary uses every member, including cards beyond the displayed four',()=>{
  assert.deepEqual(clusterSummary([{off:30},{off:55},{off:60},{off:70},{off:85}]),{count:5,min:30,max:85});
});
test('section budget trims grid, soon, then the second brand row',()=>{
  const items=n=>Array.from({length:n},(_,i)=>({key:String(i),brand:`B${i}`}));
  const input={spotlight:items(1)[0],hot:items(4),clusters:[{cards:items(4)},{cards:items(4)}],soon:items(4),grid:items(72)};
  const at28=allocateSections(input);
  assert.equal(1+at28.hot.length+at28.clusters.reduce((n,c)=>n+c.cards.length,0)+at28.soon.length+at28.gridInitial.length,28);
  assert.equal(at28.gridInitial.length,11);
  assert.equal(at28.gridExtra.length,61);
  const at17=allocateSections(input,17);
  assert.equal(at17.gridInitial.length,8);
  assert.equal(at17.soon.length,0);
  assert.equal(at17.clusters.length,1);
  assert.deepEqual(allocateSections({spotlight:null,hot:[],clusters:[],soon:[],grid:[]}),{spotlight:null,hot:[],clusters:[],soon:[],gridInitial:[],gridExtra:[]});
});

test('alternative cards use their page channel and home keeps home channel', () => {
  const tracked=entry(12345,'/images/product.jpg');
  const deal={name:'Waves Plate',entry:tracked,kind:'tracker',post:null,current:20,regular:100,off:80,score:1};
  const base={entries:{'Waves Plate':tracked},priceData:{plugins:{},bundles:{}},now};
  for (const [source,chan] of [[undefined,'home'],['tracker','trk'],['article','art']]) {
    const card=toCardModel(deal,{...base,source});
    assert.equal(new URL(card.ctaHref).searchParams.get('chan'),chan);
    assert.equal(new URL(card.href).searchParams.get('chan'),chan);
  }
});

test('home PB links carry the section in data1 and retain chan=home', () => {
  const tracked=entry(12345,'/images/product.jpg');
  const deal={name:'Waves Plate',entry:tracked,kind:'tracker',post:null,current:20,regular:100,off:80,score:1};
  const priceData={plugins:{},bundles:{}};
  for (const section of ['spotlight','hot','cluster','soon','grid']) {
    const card=toCardModel(deal,{entries:{'Waves Plate':tracked},priceData,now,section});
    for (const href of [card.href,card.ctaHref,cardTarget(deal,priceData,'home',section)]) {
      const params=new URL(href).searchParams;
      assert.equal(params.get('chan'),'home');
      assert.equal(params.get('data1'),`waves-plate--${section}`);
    }
  }
});
