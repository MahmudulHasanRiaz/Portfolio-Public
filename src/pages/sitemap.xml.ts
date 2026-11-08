import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSiteSettings } from "../lib/settings";
import { SITE_URL } from "../lib/detail";

// GET /sitemap.xml — on-demand (prerender = false) so detail pages
// are included: they are on-demand routes, not in the static build,
// so a build-time-only sitemap would miss them. Static pages + live
// slugs from the Public Content API (build-time collections as the
// fallback when the API is unset/unreachable), every URL in BOTH
// languages with hreflang alternates (en + bn + x-default, reciprocal
// with the <link> tags on the pages themselves).
//
// x-default = the admin-configured default language version (read live
// via getSiteSettings()): default "bn" → Bangla URL; "en"/"system" →
// English URL. Absolute URLs from the live base (workers.dev for now;
// the custom domain later) — never hardcoded.
export const prerender = false;

const STATIC_PATHS = [
	"/",
	"/know-me",
	"/platforms",
	"/projects",
	"/ventures",
	"/releases",
	"/posts",
	"/case-studies",
];

const DETAIL_TYPES = [
	{ api: "posts", path: "posts", collection: "posts" },
	{ api: "projects", path: "projects", collection: "projects" },
	{ api: "case-studies", path: "case-studies", collection: "caseStudies" },
	{ api: "ventures", path: "ventures", collection: "ventures" },
	{ api: "releases", path: "releases", collection: "releases" },
] as const;

function escXml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function apiBase(): string | undefined {
	try {
		const fromEnv = (import.meta.env.PUBLIC_CONTENT_API_URL as
			| string
			| undefined) ?? "";
		return fromEnv.replace(/\/$/, "") || undefined;
	} catch {
		return undefined;
	}
}

async function liveSlugs(
	base: string,
	type: string,
): Promise<string[] | undefined> {
	try {
		const res = await fetch(`${base}/api/public/content/${type}`, {
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) return undefined;
		const raw: unknown = await res.json();
		const items = Array.isArray(raw)
			? raw
			: Array.isArray((raw as { items?: unknown }).items)
				? (raw as { items: unknown[] }).items
				: [];
		return items
			.filter(
				(i): i is { slug: string } =>
					typeof i === "object" &&
					i !== null &&
					typeof (i as { slug?: unknown }).slug === "string",
			)
			.map((i) => i.slug);
	} catch {
		return undefined;
	}
}

export const GET: APIRoute = async () => {
	const settings = await getSiteSettings();
	const base = apiBase();

	const paths = [...STATIC_PATHS];
	for (const t of DETAIL_TYPES) {
		let slugs: string[] = [];
		if (base) {
			const live = await liveSlugs(base, t.api);
			if (live) slugs = live;
		}
		if (!slugs.length) {
			try {
				const rows = await getCollection(t.collection);
				slugs = rows.map((r: { data: { slug: string } }) => r.data.slug);
			} catch {
				slugs = [];
			}
		}
		for (const slug of slugs) paths.push(`/${t.path}/${slug}`);
	}

	const urlEntries = paths
		.map((p) => {
			const en = p === "/" ? `${SITE_URL}/` : `${SITE_URL}${p}`;
			const bn = p === "/" ? `${SITE_URL}/bn/` : `${SITE_URL}/bn${p}`;
			const xDefault =
				settings.defaultLanguage === "bn" ? bn : en;
			return [
				"  <url>",
				`    <loc>${escXml(en)}</loc>`,
				`    <xhtml:link rel="alternate" hreflang="en" href="${escXml(en)}" />`,
				`    <xhtml:link rel="alternate" hreflang="bn" href="${escXml(bn)}" />`,
				`    <xhtml:link rel="alternate" hreflang="x-default" href="${escXml(xDefault)}" />`,
				"  </url>",
			].join("\n");
		})
		.join("\n");

	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
		urlEntries,
		"</urlset>",
		"",
	].join("\n");

	return new Response(xml, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			// Fresh enough to pick up new content quickly, but cached
			// at the edge so crawlers don't hammer the API.
			"Cache-Control": "public, max-age=3600",
		},
	});
};
