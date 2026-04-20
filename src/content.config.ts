import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.string().optional(),
			aiImage: z.boolean().optional(),
			tags: z.array(z.string()).default([]),
			affiliate: z.string().optional(),
			score: z.number().min(0).default(0),
			draft: z.boolean().default(false),
			dealPrice: z.string().optional(),
			originalPrice: z.string().optional(),
			discount: z.string().optional(),
			saleExpiry: z.string().optional(),
		}),
});

export const collections = { blog };
