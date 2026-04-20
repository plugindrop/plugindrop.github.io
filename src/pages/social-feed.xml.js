import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_TITLE } from '../consts';

// 研究ベース: 3-5投稿/日が最適、10超はマイナス効果
const SCORE_THRESHOLD = 7.0;   // 上位15%程度に絞る
const MAX_PER_DAY = 3;          // スパイク日も最大3件/日
const RECENT_DAYS = 7;
const MAX_ITEMS = 21;           // 7日 × 3件/日

export async function GET(context) {
	const allPosts = await getCollection('blog');

	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - RECENT_DAYS);

	// 日付ごとに上位MAX_PER_DAY件に絞ってからフラット化
	const byDay = new Map();
	for (const p of allPosts) {
		if (p.data.draft || (p.data.score ?? 0) < SCORE_THRESHOLD || p.data.aiImage) continue;
		const pub = new Date(p.data.pubDate);
		if (pub < cutoff) continue;
		const day = pub.toISOString().slice(0, 10);
		if (!byDay.has(day)) byDay.set(day, []);
		byDay.get(day).push(p);
	}

	const posts = [...byDay.entries()]
		.sort(([a], [b]) => b.localeCompare(a))   // 日付降順
		.flatMap(([, items]) =>
			items
				.sort((a, b) => (b.data.score ?? 0) - (a.data.score ?? 0))
				.slice(0, MAX_PER_DAY)              // 1日3件まで（スコア上位）
		)
		.slice(0, MAX_ITEMS);

	return rss({
		title: `${SITE_TITLE} — Social Feed`,
		description: 'High-value music production deals for social sharing',
		site: context.site,
		items: posts.map((post) => {
			const d = post.data;
			const xText = d.xText
				? d.xText
				: _buildFallbackText(d.title, d.dealPrice, d.originalPrice, d.discount);

			return {
				title: d.title,
				description: xText,
				link: `/posts/${post.id}/`,
				pubDate: d.pubDate,
			};
		}),
	});
}

/**
 * xTextがない記事用フォールバック
 * 研究ベース: リンク付き投稿はテキストより73%低エンゲージメント
 * → フックで補う: 価格情報より「なぜ買うべきか」を先に
 */
function _buildFallbackText(title, dealPrice, originalPrice, discount) {
	// 節約額を計算してフックに使う
	const dealNum = dealPrice ? parseFloat(dealPrice.replace(/[^0-9.]/g, '')) : 0;
	const origNum = originalPrice ? parseFloat(originalPrice.replace(/[^0-9.]/g, '')) : 0;
	const savings = origNum > dealNum ? Math.round(origNum - dealNum) : 0;
	const pct = discount ? discount.replace(/\s*off\s*/i, '').trim() : '';

	let hook = '';
	if (savings >= 50) {
		hook = `$${savings} off.`;
	} else if (pct) {
		hook = `${pct} off.`;
	}

	// "50% Off FabFilter Pro-Q 4 at Plugin Boutique" → "FabFilter Pro-Q 4"
	const cleanTitle = title
		.replace(/^[\d]+%?\s*off\s*/i, '')
		.replace(/\s+at\s+[\w\s]+$/i, '')
		.replace(/\s+on sale.*$/i, '')
		.trim();

	const line = hook
		? `${cleanTitle} — ${hook} ${dealPrice ? `now ${dealPrice}` : ''} ${originalPrice ? `(was ${originalPrice})` : ''}`.trim()
		: cleanTitle;

	return line.length > 257 ? line.slice(0, 254) + '...' : line;
}
