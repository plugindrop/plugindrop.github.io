// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';

// https://astro.build/config
export default defineConfig({
	site: 'https://plugindrop.net',
	integrations: [mdx(), sitemap({
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
			item.lastmod = new Date().toISOString().split('T')[0];
			return item;
		},
	})],
	markdown: {
		rehypePlugins: [
			[rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
		],
	},
});
