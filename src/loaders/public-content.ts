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

/**
 * Human labels for known case-study / venture metric keys (the API
 * stores metrics as a JSON object keyed by a short camelCase id).
 * Unknown keys fall back to a readable Title Case label.
 */
const METRIC_LABELS: Record<string, string> = {
	stores: "Stores",
	fraudChecks: "Fraud checks",
	ordersPerDay: "Orders / day",
	pageLoad: "Page load",
	codConfirmation: "COD confirmation",
	conversionUplift: "Conversion uplift",
	fraudOrderReduction: "Fraud order reduction",
	orderTimeSaved: "Order time saved",
	branchesOnboarded: "Branches onboarded",
	stockOutReduction: "Stock-out reduction",
	expiryLossReduction: "Expiry loss reduction",
};

function metricLabel(key: string): string {
	const known = METRIC_LABELS[key];
	if (known) return known;
	return key
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/^./, (c) => c.toUpperCase());
}

/**
 * Normalize a metrics value into the Metric[] array the live
 * collections require ({value, label}).
 *
 * The API returns case-study metrics as a JSON OBJECT
 * ({stores, fraudChecks, ordersPerDay, ...}) but the live schema
 * requires an ARRAY — Zod rejected the whole live entry, so the page
 * fell back to build-time rows with no cover/gallery/research/metrics.
 * This transform is the safety net (the API now returns an array too):
 * an array passes through (cleaned), an object becomes [{value, label}]
 * pairs, anything else (null / missing / wrong type) becomes [].
 */
function normalizeMetrics(
	value: unknown,
): Array<{ value: string; label: string }> {
	if (Array.isArray(value)) {
		return value
			.filter(
				(m): m is { value: unknown; label: unknown } =>
					typeof m === "object" && m !== null,
			)
			.map((m) => ({
				value: String(m.value ?? ""),
				label: String(m.label ?? ""),
			}))
			.filter((m) => m.value !== "" && m.label !== "");
	}
	if (typeof value === "object" && value !== null) {
		return Object.entries(value as Record<string, unknown>)
			.filter(([, v]) => v !== null && v !== undefined && String(v) !== "")
			.map(([k, v]) => ({ value: String(v), label: metricLabel(k) }));
	}
	return [];
}

function toEntry(item: PublicContentItem, type: PublicContentType) {
	// Case studies + ventures carry metrics: normalize to the Metric[]
	// array the live schemas require (see normalizeMetrics).
	const data: Record<string, unknown> = { ...item, type };
	// Video-thumbnail autoplay: the API sends this as `autoplay`;
	// the schemas declare it as `thumbnailAutoplay` (zod strips
	// undeclared fields, so normalize before validation).
	if (
		data.thumbnailAutoplay === undefined &&
		typeof item.autoplay === "boolean"
	) {
		data.thumbnailAutoplay = item.autoplay;
	}
	if (type === "case-studies" || type === "ventures") {
		data.metrics = normalizeMetrics(item.metrics);
	}
	return {
		id: item.slug,
		data,
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
	// Bound the fetch: during `astro build` prerender this runs inside
	// workerd, and a hanging fetch (TLS/network stall to the API host)
	// used to stall the whole build for 7+ minutes until it failed.
	// Failing fast lets the caller fall back to build-time rows.
	const res = await fetch(url, {
		headers: token ? { Authorization: `Bearer ${token}` } : {},
		signal: AbortSignal.timeout(8000),
	});
	if (res.status === 404) return undefined;
	if (!res.ok) {
		throw new Error(`Public Content API ${res.status} for ${url}`);
	}
	return (await res.json()) as unknown;
}

/** API contract for GET {PUBLIC_CONTENT_API_URL}/api/public/settings. */
export type PrimaryIdentity = "developer" | "know-me";

/**
 * Admin-configured default language (en | bn | system), exactly like
 * the theme's light/dark/system. "system" = the visitor's browser
 * language (bn → Bangla, anything else → English). Never hardcoded
 * on the Astro side — the API owns it; absent = "en".
 */
export type DefaultLanguage = "en" | "bn" | "system";

/**
 * Optional Bangla settings copy from the admin panel (live shape,
 * verified against GET /api/public/settings 2026-11-08). `statsLabels`
 * is positional — [years, projects, clients, releases] — and `null`
 * means "no Bangla yet" for that slot (falls back to the build-time
 * label). EN stat labels are deliberately NOT emitted by the API (the
 * DB seed copy differs from the live Astro copy) — Stats.astro keeps
 * its labels from build-time and only overlays bn.statsLabels.
 */
export interface SettingsBn {
	heroHeadline?: string;
	heroDescription?: string;
	knowMeHeadline?: string;
	knowMeSub?: string;
	statsLabels?: (string | null)[];
}

export interface PublicSettings {
	portraitUrl: string | null;
	primaryIdentity: PrimaryIdentity;
	defaultLanguage: DefaultLanguage;
	/**
	 * Admin-managed English hero / Know Me copy (live shape, verified
	 * against GET /api/public/settings 2026-11-08). Hero.astro prefers
	 * these over the dictionary; the dictionary is the fail-safe
	 * fallback when the API is unset or unreachable.
	 */
	heroHeadline: string;
	heroDescription: string;
	knowMeHeadline: string;
	knowMeSub: string;
	/**
	 * Optional Bangla settings copy from the admin panel (same field
	 * names as the English settings copy, plus positional statsLabels).
	 * Absent = fall back to the English strings. Consumed via
	 * getSiteSettings().
	 */
	bn?: SettingsBn;
}

/** Fail-safe defaults: repo portrait + Software Engineer profile. */
export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
	portraitUrl: null,
	primaryIdentity: "developer",
	defaultLanguage: "en",
	heroHeadline: "I build products people rely on every day.",
	heroDescription:
		"ERP, e-commerce and SaaS systems for businesses in Bangladesh and beyond — designed to hold up at real-world scale.",
	knowMeHeadline:
		"Software engineer, entrepreneur and nasheed artist — one person, five callings.",
	knowMeSub:
		"Mahmudul Hasan Riaz — a Hafiz-Alem who builds ERP and e-commerce software, founded three ventures, and shares nasheed, tilawat and lectures with listeners around the world.",
};

/**
 * Resolve the optional read-only token for the Public Content API.
 * Explicit argument wins, then Worker runtime env, then build-time env.
 * Unset = public-read (the API serves settings without auth).
 */
async function resolveSettingsToken(
	explicit?: string,
): Promise<string | undefined> {
	if (explicit) return explicit;
	try {
		const { env } = await import("cloudflare:workers");
		const runtime = (env as Record<string, unknown>)
			.PUBLIC_CONTENT_API_TOKEN;
		if (typeof runtime === "string" && runtime) return runtime;
	} catch {
		// Not running in a Worker (local dev / build) — fall through.
	}
	const fromEnv = import.meta.env.PUBLIC_CONTENT_API_TOKEN as
		| string
		| undefined;
	return fromEnv || undefined;
}

/**
 * Fetch the admin-managed site settings (hero portrait URL + default
 * profile) from the Public Content API. Never throws: on any failure —
 * unset base URL, unreachable API, non-200, malformed payload — it
 * returns the fail-safe defaults so the build and the page keep working
 * on the repo portrait and the Software Engineer profile.
 */
export async function fetchPublicSettings(
	base?: string,
	token?: string,
): Promise<PublicSettings> {
	try {
		const cached: ResolvedBase = { done: false };
		const apiBase = await resolveApiBase({ apiUrl: base }, cached);
		if (!apiBase) return { ...DEFAULT_PUBLIC_SETTINGS };
		const resolvedToken = token ?? (await resolveSettingsToken());
		const raw = await fetchJson(
			`${apiBase}/api/public/settings`,
			resolvedToken,
		);
		if (typeof raw !== "object" || raw === null) {
			return { ...DEFAULT_PUBLIC_SETTINGS };
		}
		const record = raw as Record<string, unknown>;
		const portraitUrl =
			typeof record.portraitUrl === "string" && record.portraitUrl
				? record.portraitUrl
				: null;
		const primaryIdentity: PrimaryIdentity =
			record.primaryIdentity === "know-me" ? "know-me" : "developer";
		const defaultLanguage: DefaultLanguage =
			record.defaultLanguage === "bn" ||
			record.defaultLanguage === "system"
				? record.defaultLanguage
				: "en";
		const strField = (v: unknown, fallback: string): string =>
			typeof v === "string" && v ? v : fallback;
		const heroHeadline = strField(
			record.heroHeadline,
			DEFAULT_PUBLIC_SETTINGS.heroHeadline,
		);
		const heroDescription = strField(
			record.heroDescription,
			DEFAULT_PUBLIC_SETTINGS.heroDescription,
		);
		const knowMeHeadline = strField(
			record.knowMeHeadline,
			DEFAULT_PUBLIC_SETTINGS.knowMeHeadline,
		);
		const knowMeSub = strField(
			record.knowMeSub,
			DEFAULT_PUBLIC_SETTINGS.knowMeSub,
		);
		// Optional `bn` object (omitted when nothing is set): same four
		// fields in Bangla, plus positional statsLabels. A present but
		// empty `bn` object carries nothing — drop it so consumers can
		// treat "no bn key" as "no Bangla yet".
		let bn: SettingsBn | undefined;
		if (typeof record.bn === "object" && record.bn !== null) {
			const raw = record.bn as Record<string, unknown>;
			const parsed: SettingsBn = {};
			if (typeof raw.heroHeadline === "string" && raw.heroHeadline)
				parsed.heroHeadline = raw.heroHeadline;
			if (typeof raw.heroDescription === "string" && raw.heroDescription)
				parsed.heroDescription = raw.heroDescription;
			if (typeof raw.knowMeHeadline === "string" && raw.knowMeHeadline)
				parsed.knowMeHeadline = raw.knowMeHeadline;
			if (typeof raw.knowMeSub === "string" && raw.knowMeSub)
				parsed.knowMeSub = raw.knowMeSub;
			if (Array.isArray(raw.statsLabels))
				parsed.statsLabels = raw.statsLabels.filter(
					(s): s is string | null =>
						typeof s === "string" || s === null,
				);
			if (Object.keys(parsed).length > 0) bn = parsed;
		}
		return {
			portraitUrl,
			primaryIdentity,
			defaultLanguage,
			heroHeadline,
			heroDescription,
			knowMeHeadline,
			knowMeSub,
			bn,
		};
	} catch {
		return { ...DEFAULT_PUBLIC_SETTINGS };
	}
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
