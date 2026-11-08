// Build-time collections.
// These are the static counterparts of the live collections: at build time
// Astro pulls the same DB content (via the Public Content API) and bakes it
// into static HTML. The local src/content/* directories hold the real,
// verified content rows (the same rows seeded in the Portfolio-V2 DB) so
// the build ships real content — never dummy/preview rows. Dummy rows
// (StyleNest, PharmaTrack, HisabKit, CloudDesk, SkillBridge) are NOT here;
// sections with no real rows yet (ventures) render the honest empty state.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const platformSchema = z.object({
	name: z.string(),
	url: z.string(),
});

const videoSchema = z.object({
	url: z.string(),
	title: z.string().optional(),
});

const baseSchema = z.object({
	title: z.string(),
	slug: z.string(),
	description: z.string().optional(),
	tags: z.array(z.string()).default([]),
	publishedAt: z.string().optional(),
	updatedAt: z.string().optional(),
	// Thumbnail: image URL, or a video URL when thumbnailType is "video".
	thumbnail: z.string().optional(),
	thumbnailType: z.enum(["image", "video"]).optional(),
});

export const collections = {
	posts: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
		schema: baseSchema.extend({
			excerpt: z.string().optional(),
			readingTime: z.number().optional(),
			gallery: z.array(z.string()).default([]),
			videos: z.array(videoSchema).default([]),
		}),
	}),
	projects: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
		schema: baseSchema.extend({
			techs: z.array(z.string()).default([]),
			gallery: z.array(z.string()).default([]),
			videos: z.array(videoSchema).default([]),
			featured: z.boolean().optional(),
		}),
	}),
	caseStudies: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/case-studies" }),
		schema: baseSchema.extend({
			problem: z.string().optional(),
			fix: z.string().optional(),
			result: z.string().optional(),
			projectSlug: z.string().optional(),
			gallery: z.array(z.string()).default([]),
			videos: z.array(videoSchema).default([]),
		}),
	}),
	ventures: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/ventures" }),
		schema: baseSchema.extend({
			website: z.string().nullable().optional(),
			gallery: z.array(z.string()).default([]),
			videos: z.array(videoSchema).default([]),
		}),
	}),
	releases: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/releases" }),
		schema: baseSchema.extend({
			releaseType: z.string().optional(),
			platforms: z.array(platformSchema).default([]),
			youtubeId: z.string().optional(),
			tune: z.string().optional(),
			lyricist: z.string().optional(),
		}),
	}),
};
