// Live collections — opt-in, NOT automatic.
// These only resolve at request time (on-demand routes) via the loader in
// src/loaders/public-content.ts. Static builds never call them.
// Schemas mirror src/content.config.ts so live entries carry the same
// fields (gallery, videos, platforms, credits) when the API exists.
import { defineLiveCollection } from "astro:content";
import { z } from "astro/zod";
import { createPublicContentLoader } from "./loaders/public-content";

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
	content: z.string().optional(),
	tags: z.array(z.string()).default([]),
	publishedAt: z.string().optional(),
	updatedAt: z.string().optional(),
	thumbnail: z.string().optional(),
	thumbnailType: z.enum(["image", "video"]).optional(),
});

const livePosts = defineLiveCollection({
	loader: createPublicContentLoader("posts"),
	schema: baseSchema.extend({
		excerpt: z.string().optional(),
		readingTime: z.number().optional(),
		gallery: z.array(z.string()).default([]),
		videos: z.array(videoSchema).default([]),
	}),
});

const liveProjects = defineLiveCollection({
	loader: createPublicContentLoader("projects"),
	schema: baseSchema.extend({
		techs: z.array(z.string()).default([]),
		gallery: z.array(z.string()).default([]),
		videos: z.array(videoSchema).default([]),
		featured: z.boolean().optional(),
	}),
});

const liveCaseStudies = defineLiveCollection({
	loader: createPublicContentLoader("case-studies"),
	schema: baseSchema.extend({
		problem: z.string().optional(),
		fix: z.string().optional(),
		result: z.string().optional(),
		projectSlug: z.string().optional(),
		gallery: z.array(z.string()).default([]),
		videos: z.array(videoSchema).default([]),
	}),
});

const liveVentures = defineLiveCollection({
	loader: createPublicContentLoader("ventures"),
	schema: baseSchema.extend({
		website: z.string().nullable().optional(),
		gallery: z.array(z.string()).default([]),
		videos: z.array(videoSchema).default([]),
	}),
});

const liveReleases = defineLiveCollection({
	loader: createPublicContentLoader("releases"),
	schema: baseSchema.extend({
		// nasheed | tilawat | podcast | lecture | other
		releaseType: z.string().optional(),
		platforms: z.array(platformSchema).default([]),
		youtubeId: z.string().optional(),
		tune: z.string().optional(),
		lyricist: z.string().optional(),
	}),
});

export const collections = { livePosts, liveProjects, liveCaseStudies, liveVentures, liveReleases };
