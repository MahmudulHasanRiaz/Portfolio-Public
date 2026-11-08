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

// Optional metric card (case studies, ventures): a real measured
// figure + its label. Zod strips unknown live fields, so these must be
// declared here or the backend's new fields never reach the page.
const metricSchema = z.object({
	value: z.string(),
	label: z.string(),
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
	// Optional Bangla variant from the API (same field names as the
	// English top level). Zod strips undeclared live fields, so this
	// must be declared here or live `bn` never reaches the page.
	bn: z.record(z.string(), z.unknown()).optional(),
});

const livePosts = defineLiveCollection({
	loader: createPublicContentLoader("posts"),
	schema: baseSchema.extend({
		excerpt: z.string().optional(),
		readingTime: z.number().optional(),
		gallery: z.array(z.string()).default([]),
		videos: z.array(videoSchema).default([]),
		thumbnailVideoUrl: z.string().optional(),
	}),
});

const liveProjects = defineLiveCollection({
	loader: createPublicContentLoader("projects"),
	schema: baseSchema.extend({
		techs: z.array(z.string()).default([]),
		gallery: z.array(z.string()).default([]),
		videos: z.array(videoSchema).default([]),
		featured: z.boolean().optional(),
		longDescription: z.string().optional(),
		client: z.string().optional(),
		role: z.string().optional(),
		year: z.string().optional(),
		status: z.string().optional(),
		liveUrl: z.string().optional(),
		thumbnailVideoUrl: z.string().optional(),
	}),
});

const liveCaseStudies = defineLiveCollection({
	loader: createPublicContentLoader("case-studies"),
	schema: baseSchema.extend({
		problem: z.string().optional(),
		fix: z.string().optional(),
		result: z.string().optional(),
		fixPoints: z.array(z.string()).default([]),
		metrics: z.array(metricSchema).default([]),
		research: z.string().optional(),
		techs: z.array(z.string()).default([]),
		projectSlug: z.string().optional(),
		gallery: z.array(z.string()).default([]),
		videos: z.array(videoSchema).default([]),
		thumbnailVideoUrl: z.string().optional(),
	}),
});

const liveVentures = defineLiveCollection({
	loader: createPublicContentLoader("ventures"),
	schema: baseSchema.extend({
		website: z.string().nullable().optional(),
		gallery: z.array(z.string()).default([]),
		videos: z.array(videoSchema).default([]),
		stage: z.string().optional(),
		location: z.string().optional(),
		teamSize: z.string().optional(),
		foundedDate: z.string().optional(),
		metrics: z.array(metricSchema).default([]),
		thumbnailVideoUrl: z.string().optional(),
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
		lyrics: z.string().optional(),
		videos: z.array(videoSchema).default([]),
		thumbnailVideoUrl: z.string().optional(),
	}),
});

export const collections = { livePosts, liveProjects, liveCaseStudies, liveVentures, liveReleases };
