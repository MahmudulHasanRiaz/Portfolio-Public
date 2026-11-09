// Edge-cache backstop for on-demand detail pages (Issue 7B).
//
// DIAGNOSIS (2026-11-09, measured from this VM): the `routeRules` in
// astro.config.mjs ARE correct and complete (all 10 EN + BN detail
// routes, maxAge 300 / swr 60 — verified in the fresh build manifest),
// and the currently deployed Worker DOES serve repeats from the edge
// (cold MISS TTFB 3.25–3.6 s → immediate repeat HIT TTFB ~0.35 s).
// But the caching has two silent single points of failure, both
// invisible in the response headers:
//
//   1. The cache provider only emits `Cloudflare-CDN-Cache-Control`
//      when a route rule matched (or Astro.cache.set carried a maxAge —
//      it cannot: CacheHint is tags + lastModified only). When NO rule
//      matches, the Cloudflare adapter injects
//      `Cloudflare-CDN-Cache-Control: no-store` (see
//      @astrojs/cloudflare/dist/utils/response.js) and the edge NEVER
//      caches the page — every visit pays the full Worker render
//      (~2–3.5 s: slow VPS API + settings fetch). A stale deploy, a
//      renamed route, or a rule dropped from the manifest fails exactly
//      this way, with nothing in the headers to tell you.
//   2. The provider never sets a plain `Cache-Control`, so Astro's
//      fallback stamps `Cache-Control: no-cache` on every detail page
//      (Last-Modified is present from the live entry's cacheHint).
//      The edge still caches (the CDN header governs it), but browsers
//      must revalidate on EVERY navigation — a wasted round trip on
//      every back/forward and repeat visit.
//
// This middleware closes both gaps for the 10 detail routes, and only
// for them: it sets an explicit plain `Cache-Control` (same 300 s fresh
// / 60 s stale-while-revalidate as the edge policy, so browser and edge
// staleness agree and tag purges still bound staleness) and, as a
// belt-and-braces, a `Cloudflare-CDN-Cache-Control` with the same
// values. It runs BEFORE Astro's cache-header step, so when a route
// rule did match, the provider overwrites the CDN header with its own
// identical 300/60 directive; when no rule matched, this value stands
// instead of the adapter's no-store.
//
// Deliberately NOT applied to: prerendered pages (static assets bypass
// the Worker entirely), /api/* (settings must stay no-store — the
// client live-swap needs fresh settings), non-GET, non-200, non-HTML,
// or responses carrying Set-Cookie. After 7A lands getStaticPaths the
// detail pages become static files and this middleware stops seeing
// them — it is a bridge for the live-then-static interim, and harmless
// once that lands.

import { defineMiddleware } from "astro:middleware";

const DETAIL_ROUTE_RE =
	/^\/(bn\/)?(posts|projects|case-studies|ventures|releases)\/[^/]+\/?$/;

// Keep in sync with the detail routeRules in astro.config.mjs.
const DETAIL_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=60";

export const onRequest = defineMiddleware(async (context, next) => {
	const response = await next();
	if (context.request.method !== "GET") return response;
	if (!DETAIL_ROUTE_RE.test(new URL(context.request.url).pathname)) {
		return response;
	}
	if (response.status !== 200) return response;
	if (!(response.headers.get("content-type") ?? "").includes("text/html")) {
		return response;
	}
	if (response.headers.has("set-cookie")) return response;
	// Plain Cache-Control for browsers (kills the `no-cache` fallback).
	if (!response.headers.has("cache-control")) {
		response.headers.set("Cache-Control", DETAIL_CACHE_CONTROL);
	}
	// Edge directive backstop (see header comment). The cache provider
	// overwrites this with the same values when a route rule matched.
	if (!response.headers.has("cloudflare-cdn-cache-control")) {
		response.headers.set(
			"Cloudflare-CDN-Cache-Control",
			DETAIL_CACHE_CONTROL,
		);
	}
	return response;
});
