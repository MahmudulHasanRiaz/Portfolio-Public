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
	| "releases"
	| "services";

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

/**
 * Build-prerender live-fetch gate (Run #16 build log, 2026-11-09).
 *
 * WHY: during `astro build` every prerendered page paid exactly +16.02s
 * (2 × the 8s timeout in fetchJson below) — the build machine cannot
 * reach the Public Content API within 8s, so every build-time fetch
 * timed out and every caller fell back to build-time .md data anyway.
 * The build took ~20 min for output that is already 100% build-time
 * data. Skipping the fetches at build time changes NOTHING in the
 * output — it only removes the wasted 8s waits per fetch.
 *
 * WHEN live fetching is ALLOWED (any one of these):
 *   - `astro dev` (import.meta.env.DEV) — a developer machine CAN
 *     reach the API, so local dev keeps live data;
 *   - running inside the deployed Cloudflare Worker — detected by
 *     navigator.userAgent === "Cloudflare-Workers" (see
 *     isLiveFetchAllowed below for why the old `cloudflare:workers`
 *     import check was WRONG: it also resolves during `astro build`,
 *     so the gate opened and Run #19 paid +8s/+16s/+24s/+32s per page
 *     in API timeouts, ~20 min total) — on-demand routes
 *     (/api/settings, /sitemap.xml, the twin SSR fallback) run in the
 *     Worker and MUST keep fetching live;
 *   - the PUBLIC_CONTENT_LIVE_BUILD escape hatch is set to "1" as a
 *     BUILD-time variable (Cloudflare dashboard build vars or .env) —
 *     for the day the build machine → API network path is fixed.
 * Otherwise we are in `astro build` prerender (Node, PROD, no Worker
 * runtime) and the fetch is skipped; every caller below already treats
 * "no live data" as "use build-time rows", so the output is identical.
 *
 * The decision is cached per module instance: the build shares one
 * module graph across page renders, so one decision covers the whole
 * build; in the Worker each isolate decides once. NOTE the settings
 * memo (60s TTL) is a different thing — it only dedupes calls WITHIN
 * a page render / TTL window; it cannot help the live-collection
 * fetches, which are unmemoised and were paid in full on every page.
 * Request-time behaviour is unchanged: the loader, the 8s timeout and
 * the build-time fallback all stay exactly as they are.
 */
let liveFetchDecision: boolean | undefined;

async function isLiveFetchAllowed(): Promise<boolean> {
	if (liveFetchDecision !== undefined) return liveFetchDecision;
	const forceLiveBuild = import.meta.env.PUBLIC_CONTENT_LIVE_BUILD as
		| string
		| undefined;
	if (forceLiveBuild === "1") {
		liveFetchDecision = true;
		return true;
	}
	if (import.meta.env.DEV) {
		liveFetchDecision = true;
		return true;
	}
	// Worker runtime detection — CORRECTED (Run #19 build log,
	// 2026-11-09). The old check, `await import("cloudflare:workers")`,
	// ALSO resolves during `astro build` (Vite / the Cloudflare adapter
	// provides the module at build time), so the gate opened and every
	// prerendered page paid +8s/+16s/+24s/+32s in API timeouts — the
	// build took ~20 min. Run #18 only looked fast because of the build
	// output cache. The reliable signal is navigator.userAgent: workerd
	// reports "Cloudflare-Workers", while Node (the build machine,
	// Node 24) reports "Node.js/24" (verified: node -e prints
	// "Node.js/24"). NOTE wrangler.jsonc enables nodejs_compat, so
	// `process` exists in the Worker too — a `process.versions.node`
	// check would wrongly skip live fetching at request time and break
	// the twin fallback / /api/settings. Anything that is not
	// verifiably the Worker (including an absent navigator) defaults
	// to SKIP: a skipped fetch costs nothing (callers fall back to
	// build-time data, which is the output anyway), while a
	// wrongly-allowed fetch costs 8s per call.
	const ua =
		(globalThis as { navigator?: { userAgent?: string } }).navigator
			?.userAgent ?? "";
	if (ua === "Cloudflare-Workers") {
		liveFetchDecision = true;
		return true;
	}
	liveFetchDecision = false;
	return false;
}

async function fetchJson(
	url: string,
	token: string | undefined,
): Promise<unknown> {
	// Bound the fetch: during `astro build` prerender this runs inside
	// workerd, and a hanging fetch (TLS/network stall to the API host)
	// used to stall the whole build for 7+ minutes until it failed.
	// Failing fast lets the caller fall back to build-time rows.
	// NOTE: build-time skipping happens at the loader entry points
	// (isLiveFetchAllowed above) — fetchJson itself still fetches live
	// whenever it is called, i.e. at request time in the Worker.
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

export interface AvailabilitySetting {
	available: boolean;
	badgeText: string;
}

export interface PublicSettings {
	portraitUrl: string | null;
	/**
	 * Admin-managed availability badge (settings key "availability",
	 * live shape verified against GET /api/public/settings). Absent /
	 * unset = not available (badge hidden). Consumed by the
	 * availability badge — not wired yet.
	 */
	availability: AvailabilitySetting;
	/**
	 * Search-indexing switch (settings key
	 * "search_indexing_enabled"). Only a real boolean true enables
	 * indexing; default false = noindex. Consumed by robots meta /
	 * sitemap — not wired yet.
	 */
	searchIndexingEnabled: boolean;
	/** Admin-managed favicon URL (settings key "favicon_url"). Null =
	    no admin favicon — the public site falls back to its repo
	    /favicon.svg. */
	faviconUrl: string | null;
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
	faviconUrl: null,
	primaryIdentity: "developer",
	defaultLanguage: "en",
	availability: { available: false, badgeText: "Available for projects" },
	searchIndexingEnabled: false,
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
 *
 * Shared by the settings fetch AND the content loader (and the
 * sitemap): since PR #90 the API 401s every endpoint without a Bearer
 * token, so every live fetch must resolve this at request time. Lazy
 * by design — callers behind the isLiveFetchAllowed() gate never pay
 * for it at build time.
 */
export async function resolvePublicContentToken(
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
 *
 * Memoised (Issue 7B): concurrent callers share one in-flight fetch and
 * the resolved value is reused for SETTINGS_FETCH_TTL_MS, keyed by the
 * explicit base URL + token (both usually unset — env resolution happens
 * inside). This is the same 60 s TTL as getSiteSettings() in
 * lib/settings.ts and covers the direct caller that bypasses it,
 * GET /api/settings. The key lives in module state only, never logged.
 */
const SETTINGS_FETCH_TTL_MS = 60_000;

const settingsFetchCache = new Map<
	string,
	{ promise: Promise<PublicSettings>; at: number }
>();

export async function fetchPublicSettings(
	base?: string,
	token?: string,
): Promise<PublicSettings> {
	const key = `${base ?? ""}\n${token ?? ""}`;
	const now = Date.now();
	const hit = settingsFetchCache.get(key);
	if (hit && now - hit.at < SETTINGS_FETCH_TTL_MS) {
		return hit.promise;
	}
	const promise = fetchPublicSettingsUncached(base, token);
	settingsFetchCache.set(key, { promise, at: now });
	return promise;
}

async function fetchPublicSettingsUncached(
	base?: string,
	token?: string,
): Promise<PublicSettings> {
	// Build-prerender skip (see isLiveFetchAllowed): the build machine
	// cannot reach the API, so return the fail-safe defaults at once
	// instead of waiting out the 8s timeout on every page.
	if (!(await isLiveFetchAllowed())) return { ...DEFAULT_PUBLIC_SETTINGS };
	try {
		const cached: ResolvedBase = { done: false };
		const apiBase = await resolveApiBase({ apiUrl: base }, cached);
		if (!apiBase) return { ...DEFAULT_PUBLIC_SETTINGS };
		const resolvedToken = token ?? (await resolvePublicContentToken());
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
		const faviconUrl =
			typeof record.faviconUrl === "string" && record.faviconUrl
				? record.faviconUrl
				: null;
		const primaryIdentity: PrimaryIdentity =
			record.primaryIdentity === "know-me" ? "know-me" : "developer";
		const defaultLanguage: DefaultLanguage =
			record.defaultLanguage === "bn" ||
			record.defaultLanguage === "system"
				? record.defaultLanguage
				: "en";
		// `availability` is an object ({ available, badgeText }) and
		// `searchIndexingEnabled` a boolean — both returned by the API
		// since PR #83 but dropped here until now. Fail-safe: not
		// available, indexing off. Never throws on a wrong shape.
		const availabilityRaw =
			typeof record.availability === "object" &&
			record.availability !== null
				? (record.availability as Record<string, unknown>)
				: undefined;
		const availability: AvailabilitySetting = {
			available: availabilityRaw?.available === true,
			badgeText:
				typeof availabilityRaw?.badgeText === "string" &&
				availabilityRaw.badgeText.trim()
					? availabilityRaw.badgeText
					: DEFAULT_PUBLIC_SETTINGS.availability.badgeText,
		};
		const searchIndexingEnabled =
			record.searchIndexingEnabled === true;
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
			faviconUrl,
			primaryIdentity,
			defaultLanguage,
			availability,
			searchIndexingEnabled,
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
	const cached: ResolvedBase = { done: false };

	return {
		name: `public-content-${type}`,
		loadCollection: async () => {
			// Build-prerender skip (see isLiveFetchAllowed): return the
			// empty result the callers already treat as "no live data"
			// instead of waiting out the 8s timeout on every page.
			if (!(await isLiveFetchAllowed())) return { entries: [] };
			const base = await resolveApiBase(options, cached);
			if (!base) return { entries: [] };
			// Request-time token (PR #90 made the API auth-required):
			// explicit option wins, else the Worker runtime env /
			// build-time env — the same resolver the settings fetch
			// uses. Never resolved at build time: the gate above
			// already skipped build-time fetches.
			const resolvedToken =
				options.token ?? (await resolvePublicContentToken());
			const raw = await fetchJson(
				`${base}/api/public/content/${type}`,
				resolvedToken,
			);
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
			// Build-prerender skip (see isLiveFetchAllowed): same as
			// loadCollection above — no live entry at build time.
			if (!(await isLiveFetchAllowed())) return undefined;
			const base = await resolveApiBase(options, cached);
			if (!base) return undefined;
			// Request-time token — same resolver as loadCollection
			// above (PR #90: the API 401s without a Bearer token).
			const resolvedToken =
				options.token ?? (await resolvePublicContentToken());
			const raw = await fetchJson(
				`${base}/api/public/content/${type}/${encodeURIComponent(filter.id)}`,
				resolvedToken,
			);
			if (raw === undefined) return undefined;
			const item = (raw as { item?: unknown }).item ?? raw;
			if (!isItem(item)) return undefined;
			return toEntry(item, type);
		},
	};
}
