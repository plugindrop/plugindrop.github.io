// @ts-check

import fs from 'node:fs';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeProductLinks from './src/lib/rehypeProductLinks.mjs';
import { staticRedirects } from './src/data/plugin_price_redirects.mjs';
import { noindexPricePagePaths } from './src/lib/indexPolicy.mjs';

// config.yaml の affiliate_links で "TEST" プレースホルダのドメイン（未承認・非収益）は含めない。
// generator.py の承認済み判定（TESTプレースホルダなし＝承認済み）と揃える。
const SPONSORED_HOSTS = [
	'pluginboutique.com', 'adsrsounds.com', 'loopmasters.com',
	'unison.audio', 'thomann.de', 'pluginfox.com', 'beatport.com',
	'djcity.com',
];

const siteUrl = 'https://plugindrop.net';
const distUrl = new URL('./dist/', import.meta.url);

const expiredRedirectsPath = new URL('./src/data/expired_redirects.json', import.meta.url);
let expiredRedirects = {};
try {
	expiredRedirects = JSON.parse(fs.readFileSync(expiredRedirectsPath, 'utf8'));
} catch (error) {
	if (error?.code !== 'ENOENT') throw error;
}

const blogDir = new URL('./src/content/blog/', import.meta.url);
// スラッグが再利用され記事が書き直されて再公開された場合、薄い記事アーカイブ時に
// 登録された古い転送ルールがそのまま残っていると新しい記事を永久に隠してしまう
// (2026-09-18: bx-console-amek-9099-3e0469 で実際に発生・発覚)。ビルド時に、
// 対応するslugの記事がdraft:falseで現存する場合はその転送を無効化する。
function isSlugLiveNonDraft(slug) {
	for (const ext of ['md', 'mdx']) {
		const filePath = new URL(`${slug}.${ext}`, blogDir);
		if (!fs.existsSync(filePath)) continue;
		const text = fs.readFileSync(filePath, 'utf8');
		const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
		if (!frontmatter) return false;
		return !/^draft:\s*true\s*$/m.test(frontmatter[1]);
	}
	return false;
}
const staleRedirectSlugs = Object.keys(expiredRedirects).filter(isSlugLiveNonDraft);
if (staleRedirectSlugs.length > 0) {
	console.warn(
		`[astro.config] expired_redirects.json shadows ${staleRedirectSlugs.length} live article(s), skipping redirect for: ${staleRedirectSlugs.join(', ')}`,
	);
}
const activeExpiredRedirects = Object.fromEntries(
	Object.entries(expiredRedirects).filter(([slug]) => !staleRedirectSlugs.includes(slug)),
);

const redirectUrls = new Set([
	...Object.keys(activeExpiredRedirects).map((slug) => new URL(`/posts/${slug}/`, siteUrl).href),
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
			Object.entries(activeExpiredRedirects).map(([slug, target]) => [`/posts/${slug}/`, target]),
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
			[rehypeExternalLinks, {
				target: '_blank',
				rel: (node) => {
					try {
						const href = (node.properties && node.properties.href) || '';
						const host = new URL(href, 'https://plugindrop.net').hostname.replace(/^www\./, '');
						if (SPONSORED_HOSTS.some((h) => host === h || host.endsWith('.' + h))) {
							return ['noopener', 'sponsored'];
						}
					} catch (e) { /* fall through */ }
					return ['noopener', 'nofollow'];
				},
			}],
		],
	},
});
