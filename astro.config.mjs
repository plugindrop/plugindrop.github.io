// @ts-check

import fs from 'node:fs';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeProductLinks from './src/lib/rehypeProductLinks.mjs';
import { noindexPricePagePaths } from './src/lib/indexPolicy.mjs';

const siteUrl = 'https://plugindrop.net';
const distUrl = new URL('./dist/', import.meta.url);

const expiredRedirectsPath = new URL('./src/data/expired_redirects.json', import.meta.url);
let expiredRedirects = {};
try {
	expiredRedirects = JSON.parse(fs.readFileSync(expiredRedirectsPath, 'utf8'));
} catch (error) {
	if (error?.code !== 'ENOENT') throw error;
}
const staticRedirects = {
	'/plugin-prices/arturia-v-collection-11/': '/plugin-prices/arturia-v-collection-11-pro/',
	'/plugin-prices/arturia-fx-collection-6/': '/plugin-prices/arturia-fx-collection-6-pro/',
	'/posts/best-compressor-plugins-mixing/': '/posts/best-compressor-plugins-2026/',
	'/posts/best-eq-plugins-mixing-mastering/': '/posts/best-eq-plugins-2026/',
	'/posts/best-free-orchestral-vst-plugins/': '/posts/best-free-strings-vst-plugins/',
};
const redirectUrls = new Set([
	...Object.keys(expiredRedirects).map((slug) => new URL(`/posts/${slug}/`, siteUrl).href),
	...Object.keys(staticRedirects).map((path) => new URL(path, siteUrl).href),
]);

const priceHistoryPath = new URL('./src/data/price_history.json', import.meta.url);
const priceData = JSON.parse(fs.readFileSync(priceHistoryPath, 'utf8'));
const noindexPriceUrls = new Set(
	noindexPricePagePaths(priceData).map((path) => new URL(path, siteUrl).href),
);

function outputHtmlUrl(pageUrl) {
	const pathname = decodeURIComponent(new URL(pageUrl).pathname);
	const relativePath = pathname === '/'
		? 'index.html'
		: `${pathname.replace(/^\//, '')}${pathname.endsWith('/') ? 'index.html' : '.html'}`;
	return new URL(relativePath, distUrl);
}

function generatedPageHasNoindex(pageUrl) {
	const htmlUrl = outputHtmlUrl(pageUrl);
	if (!fs.existsSync(htmlUrl)) return false;
	const html = fs.readFileSync(htmlUrl, 'utf8');
	return /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*noindex/i.test(html)
		|| /<meta\b[^>]*\bcontent=["'][^"']*noindex[^"']*["'][^>]*\bname=["']robots["']/i.test(html);
}

// https://astro.build/config
export default defineConfig({
	site: siteUrl,
	// 製品キーのリネームでスラッグが変わった価格ページの旧URL → 新URL。
	// (2026-07-12: PBのIntro/Pro分割に合わせArturia 2製品をPro明示にリネーム)
	redirects: {
		...Object.fromEntries(
			Object.entries(expiredRedirects).map(([slug, target]) => [`/posts/${slug}/`, target]),
		),
		...staticRedirects,
	},
	integrations: [mdx(), sitemap({
		filter(page) {
			return !redirectUrls.has(page)
				&& !noindexPriceUrls.has(page)
				&& !generatedPageHasNoindex(page);
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
