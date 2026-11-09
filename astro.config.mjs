// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

// Public site for riaz.com.bd — Astro + Cloudflare Workers (static assets).
// Hybrid live-then-static (plan ASTRO_HYBRID_PLAN.md §§2–6):
//   - Static-first: homepage, Know Me and archives build to static HTML.
//   - Detail routes are on-demand (prerender = false): a new/updated slug
//     shows live instantly via the Worker fallback, then becomes static
//     after the next scheduled rebuild.
//   - Live content comes from the read-only Public Content API (HTTP) via
//     the live loader in src/loaders/ — the Worker cannot TCP to Postgres.
//   - Route caching below keeps live pages fast; publish events purge by
//     tag (POST /api/cache/invalidate) and trigger a debounced rebuild.
export default defineConfig({
	output: "static",
	adapter: cloudflare(),
	integrations: [react()],
	site: "https://portfolio-public.riaaz.workers.dev",

	// Cloudflare edge cache provider — emits Cloudflare-CDN-Cache-Control
	// + Cache-Tag headers so the edge caches live pages and purges by tag.
	cache: {
		provider: {
			name: "cloudflare",
			entrypoint: "@astrojs/cloudflare/cache/provider",
		},
	},

	// Route caching (plan §5). Detail pages: fresh 5 min, then serve stale
	// while revalidating for 60s. Archives: fresh 60s so new content shows
	// in lists quickly, then stale-while-revalidate for 5 min.
	routeRules: {
		"/posts/[slug]": { maxAge: 300, swr: 60, tags: ["posts"] },
		"/projects/[slug]": { maxAge: 300, swr: 60, tags: ["projects"] },
		"/case-studies/[slug]": { maxAge: 300, swr: 60, tags: ["case-studies"] },
		"/ventures/[slug]": { maxAge: 300, swr: 60, tags: ["ventures"] },
		"/releases/[slug]": { maxAge: 300, swr: 60, tags: ["releases"] },
		"/bn/posts/[slug]": { maxAge: 300, swr: 60, tags: ["posts"] },
		"/bn/projects/[slug]": { maxAge: 300, swr: 60, tags: ["projects"] },
		"/bn/case-studies/[slug]": { maxAge: 300, swr: 60, tags: ["case-studies"] },
		"/bn/ventures/[slug]": { maxAge: 300, swr: 60, tags: ["ventures"] },
		"/bn/releases/[slug]": { maxAge: 300, swr: 60, tags: ["releases"] },
		"/posts": { maxAge: 60, swr: 300, tags: ["posts"] },
		"/projects": { maxAge: 60, swr: 300, tags: ["projects"] },
		"/case-studies": { maxAge: 60, swr: 300, tags: ["case-studies"] },
		"/ventures": { maxAge: 60, swr: 300, tags: ["ventures"] },
		"/releases": { maxAge: 60, swr: 300, tags: ["releases"] },
		"/bn/posts": { maxAge: 60, swr: 300, tags: ["posts"] },
		"/bn/projects": { maxAge: 60, swr: 300, tags: ["projects"] },
		"/bn/case-studies": { maxAge: 60, swr: 300, tags: ["case-studies"] },
		"/bn/ventures": { maxAge: 60, swr: 300, tags: ["ventures"] },
		"/bn/releases": { maxAge: 60, swr: 300, tags: ["releases"] },
	},
});
