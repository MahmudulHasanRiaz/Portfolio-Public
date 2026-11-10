// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import preact from "@astrojs/preact";

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
	// Prerender in Node, NOT in workerd (the adapter default).
	//
	// WHY (build c77c0055, 2026-11-09 — 30m 59s FAILED build): the
	// adapter's default `prerenderEnvironment: "workerd"` runs `astro
	// build` prerendering inside a workerd preview server, where
	// `navigator.userAgent === "Cloudflare-Workers"`. The live loader
	// gate in src/loaders/public-content.ts (isLiveFetchAllowed) uses
	// exactly that userAgent to tell "deployed Worker" from "build" —
	// so under workerd prerender the gate OPENED and every prerendered
	// page made its live API fetches (2–4 per page; the build machine
	// cannot reach admin.riaz.com.bd, so each hung for the full 8s
	// timeout: +16s/+24s/+32s per route, 29m 25s of Building). With
	// Node prerender, navigator.userAgent is "Node.js/24", the gate
	// stays closed, and the build is ~1 min with byte-identical
	// output (callers already fall back to build-time rows). DO NOT
	// flip this back to "workerd" without also reworking the loader
	// gate — there is no in-workerd signal that separates prerender
	// from a real request. Request-time behaviour is untouched: the
	// deployed Worker still runs in workerd and still fetches live.
	adapter: cloudflare({ prerenderEnvironment: "node" }),
	// Preact (not React) for the islands — the React 19 runtime was
	// 212KB raw / 64.7KiB transfer with ~95KB unused (PageSpeed +
	// SpeedVitals code coverage, 2026-11-10). Preact is ~3KB and covers
	// the same hooks API the islands use (useState/useEffect/useRef/
	// useCallback/useMemo) via preact/hooks; `compat: true` enables
	// preact/compat so React-component libraries (lucide-react) keep
	// working — their `react` imports resolve to preact/compat (see
	// package.json `overrides`). Island source imports preact directly
	// (preact/hooks + preact/compat for event types); no island uses
	// React 19-only APIs, portals, context or Suspense. No visual or
	// behavioural change — same islands, same client:* directives.
	integrations: [preact({ compat: true })],
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
