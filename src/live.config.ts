// Live collections — opt-in, NOT automatic.
// These only resolve at request time (on-demand routes) via the loader in
// src/loaders/public-content.ts. Static builds never call them.
import { defineLiveCollection } from "astro:content";
import { z } from "astro/zod";
import { createPublicContentLoader } from "./loaders/public-content";

const baseSchema = z.object({
	title: z.string(),
	slug: z.string(),
	description: z.string().optional(),
	content: z.string().optional(),
	tags: z.array(z.string()).default([]),
	publishedAt: z.string().optional(),
	updatedAt: z.string().optional(),
	thumbnail: z.string().optional(),
});

const posts = defineLiveCollection({
	loader: createPublicContentLoader("posts"),
	schema: baseSchema.extend({
		excerpt: z.string().optional(),
		readingTime: z.number().optional(),
	}),
});

const projects = defineLiveCollection({
	loader: createPublicContentLoader("projects"),
	schema: baseSchema.extend({
		techs: z.array(z.string()).default([]),
	}),
});

const caseStudies = defineLiveCollection({
	loader: createPublicContentLoader("case-studies"),
	schema: baseSchema,
});

const ventures = defineLiveCollection({
	loader: createPublicContentLoader("ventures"),
	schema: baseSchema.extend({
		website: z.string().nullable().optional(),
	}),
});

const releases = defineLiveCollection({
	loader: createPublicContentLoader("releases"),
	schema: baseSchema.extend({
		// nasheed | tilawat | podcast | lecture | other
		releaseType: z.string().optional(),
		platforms: z
			.array(z.object({ name: z.string(), url: z.string() }))
			.default([]),
	}),
});

export const collections = { posts, projects, caseStudies, ventures, releases };
