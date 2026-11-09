// Content helpers — build-time content collections (src/content/) merged
// with the live collections when the Public Content API exists.
// Until the API exists, the live loader returns empty, so the build-time
// rows are the source. Real rows only; empty arrays render empty states.
//
// Why two collection names: Astro 7.4.7 allows a collection name in EITHER
// content.config.ts (getCollection/getEntry) OR live.config.ts
// (getLiveCollection/getLiveEntry) — never both. So the live collections
// are named livePosts/liveProjects/... and merged here by slug, live wins.
// In prerendered pages getLiveCollection may throw (live is on-demand
// only) — the catch falls back to build-time rows, which is exactly the
// hybrid: archives are static until the scheduled rebuild, detail pages
// are on-demand and show live instantly.
import { getCollection, getLiveCollection, type CollectionEntry } from "astro:content";
import { SERVICES, type Service } from "../data/site";

// Text helpers (truncateShort, SHORT_DESC_MAX) live in lib/text.ts —
// this module re-exports them so .astro pages keep importing from
// lib/content, while client islands import from lib/text directly
// (lib/content imports astro:content, which is server-only).
export { SHORT_DESC_MAX, truncateShort } from "./text";

export type Project = CollectionEntry<"projects">;
export type CaseStudy = CollectionEntry<"caseStudies">;
export type Post = CollectionEntry<"posts">;
export type Venture = CollectionEntry<"ventures">;
export type Release = CollectionEntry<"releases">;

type LiveCollectionName =
	| "livePosts"
	| "liveProjects"
	| "liveCaseStudies"
	| "liveVentures"
	| "liveReleases"
	| "liveServices";

function byDateDesc<T extends { data: { publishedAt?: string } }>(a: T, b: T) {
	return (b.data.publishedAt ?? "").localeCompare(a.data.publishedAt ?? "");
}

// A live row is "empty" for a field when the API returned nothing for it
// (null, undefined, "", or []). The API only returns what the DB holds, so
// an empty field means the DB row was never filled — NOT that the field
// should be blank. In that case the build-time value is kept, so an
// incomplete API row can never strip data the design relies on (thumbnail,
// tags, platforms, gallery, videos). Live wins whenever it has a value.
function isEmptyValue(v: unknown): boolean {
	return (
		v === undefined ||
		v === null ||
		v === "" ||
		(Array.isArray(v) && v.length === 0)
	);
}

function mergeEntryData<T extends Record<string, unknown>>(
	base: T,
	live: Record<string, unknown>,
): T {
	const out: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(live)) {
		if (key === "bn") {
			// Bangla variant merges field-wise like the English fields:
			// live `bn` wins where it has a value; build-time `bn` is
			// kept where the live row is empty — so a half-filled live
			// bn object can never strip a build-time Bangla field.
			const baseBn =
				base["bn"] && typeof base["bn"] === "object"
					? (base["bn"] as Record<string, unknown>)
					: {};
			const liveBn =
				value && typeof value === "object"
					? (value as Record<string, unknown>)
					: {};
			const merged: Record<string, unknown> = { ...baseBn };
			for (const [bk, bv] of Object.entries(liveBn)) {
				if (!isEmptyValue(bv)) merged[bk] = bv;
			}
			if (Object.keys(merged).length > 0) out["bn"] = merged;
			continue;
		}
		if (!isEmptyValue(value)) {
			out[key] = value;
		}
	}
	return out as T;
}

async function mergeWithLive<
	T extends { data: { slug: string; publishedAt?: string } },
>(buildTime: T[], liveName: LiveCollectionName): Promise<T[]> {
	let live: Array<{ data: { slug: string } }> = [];
	try {
		const result = await getLiveCollection(liveName);
		live = (result?.entries ?? []) as Array<{ data: { slug: string } }>;
	} catch {
		live = [];
	}
	const bySlug = new Map<string, T>();
	for (const item of buildTime) bySlug.set(item.data.slug, item);
	for (const item of live) {
		// Field-wise merge, not a full-row replace: live wins where it has
		// a value; build-time is kept where the live row is empty.
		const existing = bySlug.get(item.data.slug);
		if (existing) {
			bySlug.set(item.data.slug, {
				...existing,
				data: mergeEntryData(
					existing.data as Record<string, unknown>,
					item.data as Record<string, unknown>,
				),
			} as T);
		} else {
			bySlug.set(item.data.slug, item as unknown as T);
		}
	}
	return [...bySlug.values()].sort(byDateDesc);
}

export async function getProjects(): Promise<Project[]> {
	return mergeWithLive(await getCollection("projects"), "liveProjects");
}

export async function getCaseStudies(): Promise<CaseStudy[]> {
	return mergeWithLive(
		await getCollection("caseStudies"),
		"liveCaseStudies",
	);
}

export async function getPosts(): Promise<Post[]> {
	return mergeWithLive(await getCollection("posts"), "livePosts");
}

export async function getVentures(): Promise<Venture[]> {
	return mergeWithLive(await getCollection("ventures"), "liveVentures");
}

export async function getReleases(): Promise<Release[]> {
	return mergeWithLive(await getCollection("releases"), "liveReleases");
}

/**
 * Resolve a live `icon` value onto a Service. The DB icon is either a
 * Lucide name (PascalCase: Database, Code, TrendingUp, ...) or a Simple
 * Icons slug (lowercase: wordpress, shopify). A Lucide name clears
 * `icon`; a slug clears `lucide` — explicit, NOT via mergeEntryData,
 * which skips empty values and would leave a stale icon behind.
 */
function resolveServiceIcon(service: Service, liveIcon: unknown): void {
	if (typeof liveIcon !== "string" || !liveIcon) return;
	if (/^[A-Z]/.test(liveIcon)) {
		service.icon = null;
		service.lucide = liveIcon;
	} else {
		service.icon = liveIcon;
		service.lucide = undefined;
	}
}

/** Field-wise Bangla overlay for a service (live wins where non-empty). */
function mergeServiceBn(
	service: Service,
	liveBn: unknown,
): void {
	if (!liveBn || typeof liveBn !== "object") return;
	const merged: Record<string, unknown> = { ...(service.bn ?? {}) };
	for (const [k, v] of Object.entries(liveBn as Record<string, unknown>)) {
		if (!isEmptyValue(v)) merged[k] = v;
	}
	if (Object.keys(merged).length > 0) {
		service.bn = merged as Service["bn"];
	}
}

/**
 * Services, merged live over build-time SERVICES by slug.
 *
 * Services are NOT a content collection (no detail page, no .md files)
 * — the build-time rows live in src/data/site.ts. The live rows come
 * from the Public Content API (`services` type, PR #91 dashboard side).
 * The API calls the name `title` and sends both `description` and
 * `summary`; the Service shape calls it `name` and keeps one
 * `description` (live description wins, else live summary, else the
 * build-time description). Ordering is by `sortOrder` from the API
 * (build-time rows keep their seed order 0–4); live-only rows without
 * one sort last. In prerendered pages getLiveCollection may throw —
 * the catch falls back to build-time SERVICES, same as the other
 * getters.
 */
export async function getServices(): Promise<Service[]> {
	let live: Array<{ data: Record<string, unknown> }> = [];
	try {
		const result = await getLiveCollection("liveServices");
		live = (result?.entries ?? []) as Array<{
			data: Record<string, unknown>;
		}>;
	} catch {
		live = [];
	}
	const bySlug = new Map<string, { service: Service; sortOrder: number }>();
	SERVICES.forEach((s, i) =>
		bySlug.set(s.slug, { service: { ...s }, sortOrder: i }),
	);
	for (const item of live) {
		const d = item.data;
		const slug = typeof d.slug === "string" ? d.slug : "";
		if (!slug) continue;
		const sortOrder =
			typeof d.sortOrder === "number"
				? d.sortOrder
				: (bySlug.get(slug)?.sortOrder ?? 99);
		const existing = bySlug.get(slug);
		if (existing) {
			const s = existing.service;
			if (typeof d.title === "string" && d.title) s.name = d.title;
			if (typeof d.description === "string" && d.description) {
				s.description = d.description;
			} else if (typeof d.summary === "string" && d.summary) {
				s.description = d.summary;
			}
			mergeServiceBn(s, d.bn);
			resolveServiceIcon(s, d.icon);
			bySlug.set(slug, { service: s, sortOrder });
		} else {
			// Live-only service (published after the last static build).
			const svc: Service = {
				name:
					typeof d.title === "string" && d.title ? d.title : slug,
				slug,
				description:
					typeof d.description === "string" && d.description
						? d.description
						: typeof d.summary === "string" && d.summary
							? d.summary
							: "",
				icon: null,
			};
			mergeServiceBn(svc, d.bn);
			resolveServiceIcon(svc, d.icon);
			bySlug.set(slug, { service: svc, sortOrder });
		}
	}
	return [...bySlug.values()]
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((x) => x.service);
}

export function formatDate(
	iso: string | undefined,
	lang: "en" | "bn" = "en",
): string {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

export function readingTimeFromText(text: string | undefined): number | null {
	if (!text) return null;
	const words = text.trim().split(/\s+/).length;
	return Math.max(1, Math.round(words / 200));
}
