// Live loader — API client for the read-only Public Content API.
//
// The Cloudflare Worker cannot TCP to the VPS Postgres directly, so the
// ONLY way live content reaches this site is the HTTP API served by the
// Next.js backend (plan section 7). This loader never touches the DB.
//
// API contract:
//   GET {PUBLIC_CONTENT_API_URL}/api/public/content/:type        -> list
//   GET {PUBLIC_CONTENT_API_URL}/api/public/content/:type/:slug   -> one
// Response items carry: title, slug, content, meta, tags, dates, media
// URLs, SEO fields. Only `published` items are returned by the API.
//
// The base URL resolves at request time, Worker runtime env first
// (PUBLIC_CONTENT_API_URL set as a Worker Variable in the Cloudflare
// dashboard — no rebuild needed to change it), then build-time
// import.meta.env. Until it is set anywhere, the loader returns empty
// results — it never crashes the build or the page. Auth (read-only
// token) is wired from server-only Worker env when the API requires one —
// never hardcoded here.
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

interface ResolvedBase {
	value?: string | undefined;
	done: boolean;
}

/**
 * Resolve the API base URL at request time. Explicit option wins, then the
 * Worker runtime env (dashboard Variable — same pattern as the cache
 * invalidate secret), then build-time import.meta.env. Resolved once per
 * loader instance and cached. Returns undefined when unset everywhere.
 */
async function resolveApiBase(
	options: LoaderOptions,
	cached: ResolvedBase,
): Promise<string | undefined> {
	if (cached.done) return cached.value;
	let base: string | undefined;
	const explicit = (options.apiUrl ?? "").replace(/\/$/, "");
	if (explicit) {
		base = explicit;
	} else {
		try {
			// Worker runtime — dynamic import so the Node prerender build stays green.
			const { env } = await import("cloudflare:workers");
			const runtime = (env as Record<string, unknown>)
				.PUBLIC_CONTENT_API_URL;
			if (typeof runtime === "string" && runtime) {
				base = runtime.replace(/\/$/, "");
			}
		} catch {
			// Not running in a Worker (local dev / build) — fall through.
		}
		if (!base) {
			const fromEnv = import.meta.env.PUBLIC_CONTENT_API_URL as
				| string
				| undefined;
			base = (fromEnv ?? "").replace(/\/$/, "") || undefined;
		}
	}
	cached.value = base;
	cached.done = true;
	return base;
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
	const token = options.token;
	const cached: ResolvedBase = { done: false };

	return {
		name: `public-content-${type}`,
		loadCollection: async () => {
			const base = await resolveApiBase(options, cached);
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
			const base = await resolveApiBase(options, cached);
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
