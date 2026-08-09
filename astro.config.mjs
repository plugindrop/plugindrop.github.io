// @ts-check

import fs from 'node:fs';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeProductLinks from './src/lib/rehypeProductLinks.mjs';

const expiredRedirectsPath = new URL('./src/data/expired_redirects.json', import.meta.url);
let expiredRedirects = {};
try {
	expiredRedirects = JSON.parse(fs.readFileSync(expiredRedirectsPath, 'utf8'));
} catch (error) {
	if (error?.code !== 'ENOENT') throw error;
}
const expiredRedirectUrls = new Set(
	Object.keys(expiredRedirects).map((slug) => `https://plugindrop.net/posts/${slug}/`),
);

// https://astro.build/config
export default defineConfig({
	site: 'https://plugindrop.net',
	// 製品キーのリネームでスラッグが変わった価格ページの旧URL → 新URL。
	// (2026-07-12: PBのIntro/Pro分割に合わせArturia 2製品をPro明示にリネーム)
	redirects: {
		...Object.fromEntries(
			Object.entries(expiredRedirects).map(([slug, target]) => [`/posts/${slug}/`, target]),
		),
		'/plugin-prices/arturia-v-collection-11/': '/plugin-prices/arturia-v-collection-11-pro/',
		'/plugin-prices/arturia-fx-collection-6/': '/plugin-prices/arturia-fx-collection-6-pro/',
	},
	integrations: [mdx(), sitemap({
		filter(page) {
			return !expiredRedirectUrls.has(page);
		},
		serialize(item) {
			// トップページ・記事一覧は高優先度
			if (item.url === 'https://plugindrop.net/' || item.url === 'https://plugindrop.net/posts/') {
				item.priority = 1.0;
				item.changefreq = 'daily';
			} else if (item.url.includes('/posts/')) {
				item.priority = 0.8;
				item.changefreq = 'weekly';
			} else {
				item.priority = 0.5;
				item.changefreq = 'monthly';
			}
			// lastmod は設定しない: ビルド日固定にすると全ページが毎日更新に見えてクロール効率が下がる
			// Google は pubDate (Article schema の datePublished) から最終更新日を判断する
			return item;
		},
	})],
	markdown: {
		rehypePlugins: [
			// 内部リンク（追跡製品名→/plugin-prices/）を先に張り、後段で外部リンク属性を付与
			rehypeProductLinks,
			[rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
		],
	},
});
