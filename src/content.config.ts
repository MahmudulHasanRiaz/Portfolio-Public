// Build-time collections.
// These are the static counterparts of the live collections: at build time
// Astro pulls the same DB content (via the Public Content API) and bakes it
// into static HTML. The local src/content/* directories are the seed for
// that — empty until the content port lands, so the build ships no content
// rather than fake content.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const baseSchema = z.object({
	title: z.string(),
	slug: z.string(),
	description: z.string().optional(),
	tags: z.array(z.string()).default([]),
	publishedAt: z.string().optional(),
	updatedAt: z.string().optional(),
	thumbnail: z.string().optional(),
});

export const collections = {
	posts: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
		schema: baseSchema,
	}),
	projects: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
		schema: baseSchema,
	}),
	caseStudies: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/case-studies" }),
		schema: baseSchema,
	}),
	ventures: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/ventures" }),
		schema: baseSchema,
	}),
	releases: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/releases" }),
		schema: baseSchema.extend({
			releaseType: z.string().optional(),
		}),
	}),
};
