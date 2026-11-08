// Live loader — API client for the read-only Public Content API.
//
// The Cloudflare Worker cannot TCP to the VPS Postgres directly, so the
// ONLY way live content reaches this site is the HTTP API served by the
// Next.js backend (plan section 7). This loader never touches the DB.
//
// API contract (to be built in the monorepo):
//   GET {PUBLIC_CONTENT_API_URL}/api/public/content/:type        -> list
//   GET {PUBLIC_CONTENT_API_URL}/api/public/content/:type/:slug   -> one
// Response items carry: title, slug, content, meta, tags, dates, media
// URLs, SEO fields. Only `published` items are returned by the API.
//
// Until PUBLIC_CONTENT_API_URL is set, the loader returns empty results —
// it never crashes the build or the page. Auth (read-only token) is wired
// when the API lands, from server-only Worker env — never hardcoded here.
//
// Note: Astro does not re-export the LiveLoader type from "astro:content",
// so the loader is typed structurally here; defineLiveCollection() in
// src/live.config.ts validates the shape against Astro's LiveLoader.

export type PublicContentType =
	| "posts"
	| "projects"
	| "case-studies"
	| "ventures"
	| "releases";

export interface PublicContentItem {
	slug: string;
	title: string;
	description?: string;
	content?: string;
	tags?: string[];
	publishedAt?: string;
	updatedAt?: string;
	thumbnail?: string;
	[key: string]: unknown;
}

interface LoaderOptions {
	/** Base URL of the Public Content API. Defaults to env. */
	apiUrl?: string;
	/** Read-only token, when the API requires one. Server-only. */
	token?: string;
}

function apiBase(options: LoaderOptions): string | undefined {
	const fromEnv = import.meta.env.PUBLIC_CONTENT_API_URL as string | undefined;
	const base = (options.apiUrl ?? fromEnv ?? "").replace(/\/$/, "");
	return base || undefined;
}

function isItem(value: unknown): value is PublicContentItem {
	if (typeof value !== "object" || value === null) return false;
	const item = value as Record<string, unknown>;
	return typeof item.slug === "string" && typeof item.title === "string";
}

function toEntry(item: PublicContentItem, type: PublicContentType) {
	return {
		id: item.slug,
		data: { ...item, type },
		cacheHint: {
			tags: [type, `${type}:${item.slug}`],
			lastModified: item.updatedAt ? new Date(item.updatedAt) : undefined,
		},
	};
}

async function fetchJson(
	url: string,
	token: string | undefined,
): Promise<unknown> {
	const res = await fetch(url, {
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	});
	if (res.status === 404) return undefined;
	if (!res.ok) {
		throw new Error(`Public Content API ${res.status} for ${url}`);
	}
	return (await res.json()) as unknown;
}

/** API-client live loader for one content type. */
export function createPublicContentLoader(
	type: PublicContentType,
	options: LoaderOptions = {},
) {
	const base = apiBase(options);
	const token = options.token;

	return {
		name: `public-content-${type}`,
		loadCollection: async () => {
			if (!base) return { entries: [] };
			const raw = await fetchJson(`${base}/api/public/content/${type}`, token);
			const items = Array.isArray(raw)
				? raw
				: Array.isArray((raw as { items?: unknown }).items)
					? (raw as { items: unknown[] }).items
					: [];
			return { entries: items.filter(isItem).map((item) => toEntry(item, type)) };
		},
		loadEntry: async ({
			filter,
		}: {
			filter: { id: string };
			collection: string;
		}) => {
			if (!base) return undefined;
			const raw = await fetchJson(
				`${base}/api/public/content/${type}/${encodeURIComponent(filter.id)}`,
				token,
			);
			if (raw === undefined) return undefined;
			const item = (raw as { item?: unknown }).item ?? raw;
			if (!isItem(item)) return undefined;
			return toEntry(item, type);
		},
	};
}
