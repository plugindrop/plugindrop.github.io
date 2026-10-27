import { getCollection } from 'astro:content';
import priceData from '../../data/price_history.json';
import videos from '../../data/product_videos.json';
import copy from '../../data/deal_copy.json';
import facts from '../../data/plugin_facts.json';
import { buildDealPool, toCardModel } from '../../lib/homeDeals.mjs';
import { buildEmailDealSignals } from '../../lib/emailDealSignals.mjs';

export async function GET() {
  const now = Date.now();
  const entries = { ...priceData.bundles, ...priceData.plugins };
  const posts = (await getCollection('blog')).filter(p => !p.data.draft && p.data.pubDate.valueOf() <= now);
  const pool = buildDealPool(entries, posts, now);
  const models = pool.map(deal => toCardModel(deal, { entries, priceData, now, videos, copy, facts, source: 'home' }));
  return new Response(JSON.stringify(buildEmailDealSignals(pool, models, priceData, new Date(now).toISOString())), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
