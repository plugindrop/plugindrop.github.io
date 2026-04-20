import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_TITLE } from '../consts';

// スコアフィルタ閾値: この値以上の記事のみX投稿対象
const SCORE_THRESHOLD = 5.0;
// 最大件数（dlvr.itは最新N件を読む）
const MAX_ITEMS = 20;

export async function GET(context) {
	const allPosts = await getCollection('blog');

	const posts = allPosts
		.filter(p =>
			!p.data.draft &&
			(p.data.score ?? 0) >= SCORE_THRESHOLD &&
			// AI生成画像の記事は除外（品質担保）
			!p.data.aiImage
		)
		.sort((a, b) => {
			// 新着順（同日はスコア降順）
			const dateDiff = new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime();
			return dateDiff !== 0 ? dateDiff : (b.data.score ?? 0) - (a.data.score ?? 0);
		})
		.slice(0, MAX_ITEMS);

	return rss({
		title: `${SITE_TITLE} — Social Feed`,
		description: 'High-value music production deals for social sharing',
		site: context.site,
		items: posts.map((post) => {
			const d = post.data;
			// X投稿テキスト: xTextがあればそれを使用、なければ自動生成
			const xText = d.xText
				? d.xText
				: _buildFallbackText(d.title, d.dealPrice, d.originalPrice, d.discount);

			return {
				title: d.title,
				// descriptionがdlvr.itのツイート本文になる（URLは<link>で別途付加）
				description: xText,
				link: `/posts/${post.id}/`,
				pubDate: d.pubDate,
			};
		}),
	});
}

/**
 * xTextがない既存記事用のフォールバックX文章生成
 * 例: "🎛️ FabFilter Pro-Q 4 now $89 (was $149) — 40% off. One of the best EQs in the game."
 */
function _buildFallbackText(title, dealPrice, originalPrice, discount) {
	const parts = [];

	// 価格情報
	if (dealPrice && originalPrice) {
		parts.push(`${dealPrice} (was ${originalPrice})`);
	} else if (dealPrice && discount) {
		parts.push(`${dealPrice} — ${discount}`);
	} else if (dealPrice) {
		parts.push(dealPrice);
	}

	// タイトル（先頭に絵文字）
	const line = parts.length > 0
		? `🎛️ ${title}\n${parts.join(' ')}`
		: `🎛️ ${title}`;

	// 280字制限（URLの23字分を差し引いた257字）
	return line.length > 257 ? line.slice(0, 254) + '...' : line;
}
