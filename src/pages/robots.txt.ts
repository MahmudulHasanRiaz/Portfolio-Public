import type { APIRoute } from "astro";
import { getSiteSettings } from "../lib/settings";
import { resolveSiteUrl } from "../lib/detail";

// GET /robots.txt — on-demand (prerender = false), same pattern as
// sitemap.xml.ts, so it reads the live admin setting instead of a
// static file. This REPLACES public/robots.txt (deleted with this
// change): a static file can never honor the toggle, and its
// Sitemap URL pointed at a stale workers.dev subdomain.
//
// Search-indexing gate (admin toggle "search_indexing_enabled"):
//   OFF (default) → `Disallow: /` — crawlers stay out entirely.
//   ON → `Allow: /` + `Sitemap: <siteUrl>/sitemap.xml`.
export const prerender = false;

export const GET: APIRoute = async () => {
	const settings = await getSiteSettings();
	const siteUrl = resolveSiteUrl(settings.siteUrl);
	const body = settings.searchIndexingEnabled
		? ["User-agent: *", "Allow: /", "", `Sitemap: ${siteUrl}/sitemap.xml`, ""].join(
				"\n",
			)
		: ["User-agent: *", "Disallow: /", ""].join("\n");
	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			// Fresh enough to pick up a toggle flip quickly, but
			// cached at the edge so crawlers don't hammer the API.
			"Cache-Control": "public, max-age=3600",
		},
	});
};
