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
	'/plugin-prices/diva/': '/plugin-prices/u-he-diva/',
	'/plugin-prices/repro/': '/plugin-prices/u-he-repro/',
	'/plugin-prices/smart-eq-4/': '/plugin-prices/sonible-smart-eq-4/',
	'/plugin-prices/rc-20-retro-color/': '/plugin-prices/xln-audio-rc-20-retro-color/',
	'/plugin-prices/crystalline/': '/plugin-prices/baby-audio-crystalline/',
	'/plugin-prices/portal/': '/plugin-prices/output-portal/',
	'/plugin-prices/hive-2/': '/plugin-prices/u-he-hive-2/',
	'/plugin-prices/spire/': '/plugin-prices/reveal-sound-spire/',
	'/plugin-prices/massive/': '/plugin-prices/native-instruments-massive/',
	'/plugin-prices/trackspacer/': '/plugin-prices/wavesfactory-trackspacer/',
	'/plugin-prices/blackhole/': '/plugin-prices/eventide-blackhole/',
	'/plugin-prices/satin/': '/plugin-prices/u-he-satin/',
	'/plugin-prices/oxford-limiter/': '/plugin-prices/sonnox-oxford-limiter/',
	'/plugin-prices/presswerk/': '/plugin-prices/u-he-presswerk/',
	'/plugin-prices/fm8/': '/plugin-prices/native-instruments-fm8/',
	'/plugin-prices/decapitator/': '/plugin-prices/soundtoys-decapitator/',
	'/plugin-prices/little-alterboy/': '/plugin-prices/soundtoys-little-alterboy/',
	'/plugin-prices/crystallizer/': '/plugin-prices/soundtoys-crystallizer/',
	'/plugin-prices/shadow-hills-mastering-compressor/': '/plugin-prices/plugin-alliance-shadow-hills-mastering-compressor/',
	'/plugin-prices/movement/': '/plugin-prices/output-movement/',
	'/plugin-prices/super-vhs/': '/plugin-prices/baby-audio-super-vhs/',
	'/plugin-prices/transit-2/': '/plugin-prices/baby-audio-transit-2/',
	'/plugin-prices/xo/': '/plugin-prices/xln-audio-xo/',
	'/plugin-prices/life/': '/plugin-prices/xln-audio-life/',
	'/plugin-prices/oxford-inflator/': '/plugin-prices/sonnox-oxford-inflator/',
	'/plugin-prices/spectre/': '/plugin-prices/wavesfactory-spectre/',
	'/plugin-prices/punch/': '/plugin-prices/denise-audio-punch/',
	'/plugin-prices/rift-2-0/': '/plugin-prices/minimal-audio-rift-2-0/',
	'/plugin-prices/bloom-drum-machine/': '/plugin-prices/excite-audio-bloom-drum-machine/',
	'/plugin-prices/uhbik-2/': '/plugin-prices/u-he-uhbik-2/',
	'/plugin-prices/filterscape/': '/plugin-prices/u-he-filterscape/',
	'/plugin-prices/ampex-atr-102-mastering-tape-recorder/': '/plugin-prices/uad-ampex-atr-102-mastering-tape-recorder/',
	'/plugin-prices/a-type-multiband-dynamic-enhancer/': '/plugin-prices/uad-a-type-multiband-dynamic-enhancer/',
	'/plugin-prices/manley-massive-passive/': '/plugin-prices/uad-manley-massive-passive/',
	'/plugin-prices/ssl-4000-g-bus-compressor/': '/plugin-prices/uad-ssl-4000-g-bus-compressor/',
	'/plugin-prices/grainferno/': '/plugin-prices/baby-audio-grainferno/',
	'/plugin-prices/tekno/': '/plugin-prices/baby-audio-tekno/',
	'/plugin-prices/smooth-operator-pro/': '/plugin-prices/baby-audio-smooth-operator-pro/',
	'/plugin-prices/h3000-factory-mk-ii/': '/plugin-prices/eventide-h3000-factory-mk-ii/',
	'/plugin-prices/spliteq/': '/plugin-prices/eventide-spliteq/',
	'/plugin-prices/evoke/': '/plugin-prices/minimal-audio-evoke/',
	'/plugin-prices/anthem-analog-synthesizer/': '/plugin-prices/uad-anthem-analog-synthesizer/',
	'/plugin-prices/crumar-spirit/': '/plugin-prices/cherry-audio-crumar-spirit/',
	'/plugin-prices/lucid/': '/plugin-prices/minimal-audio-lucid/',
	'/plugin-prices/39-off-transit-2/': '/plugin-prices/baby-audio-transit-2/',
	'/plugin-prices/50-off-jupiter-8/': '/plugin-prices/jupiter-8/',
	'/posts/best-compressor-plugins-mixing/': '/posts/best-compressor-plugins-2026/',
	'/posts/best-eq-plugins-mixing-mastering/': '/posts/best-eq-plugins-2026/',
	'/posts/best-free-orchestral-vst-plugins/': '/posts/best-free-strings-vst-plugins/',
	'/posts/best-synth-plugins-2026/': '/posts/best-synth-vst-plugins-2026/',
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
