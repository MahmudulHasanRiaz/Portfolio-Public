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
	| "liveReleases";

function byDateDesc<T extends { data: { publishedAt?: string } }>(a: T, b: T) {
	return (b.data.publishedAt ?? "").localeCompare(a.data.publishedAt ?? "");
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
		// Live entries carry the same data fields as the build-time rows
		// (schemas mirror each other); present them in the build-time shape
		// so list/detail consumers work unchanged.
		bySlug.set(item.data.slug, item as unknown as T);
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

export function formatDate(iso: string | undefined): string {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleDateString("en-GB", {
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
