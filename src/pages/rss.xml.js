import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const now = Date.now();
	const posts = (await getCollection('blog'))
		.filter(p => !p.data.draft)
		.filter(p => p.data.pubDate.valueOf() <= now);
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/posts/${post.id}/`,
		})),
	});
}
