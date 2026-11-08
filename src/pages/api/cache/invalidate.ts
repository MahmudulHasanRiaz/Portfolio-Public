import type { APIRoute } from "astro";

// POST /api/cache/invalidate — purge cached pages by tag or path.
// Called by the admin backend on publish / update / delete (plan §6.1):
// only the affected tags are purged (e.g. ["post:123", "posts",
// "home:latest"]), never the whole site. The debounced rebuild trigger
// then makes the content static on the next deploy.
//
// Auth: Bearer token. The secret lives in Worker env (wrangler secret) or
// build-time env — never hardcoded, never in the repo. Until it is set,
// this endpoint answers 503 (refuses) rather than purging unauthenticated.
export const prerender = false;

async function getSecret(): Promise<string | undefined> {
	try {
		// Worker runtime — dynamic import so the Node prerender build stays green.
		const { env } = await import("cloudflare:workers");
		const value = (env as Record<string, unknown>).CACHE_INVALIDATE_SECRET;
		if (typeof value === "string" && value) return value;
	} catch {
		// Not running in a Worker (local dev) — fall through to build-time env.
	}
	const value = import.meta.env.CACHE_INVALIDATE_SECRET as string | undefined;
	return value || undefined;
}

export const POST: APIRoute = async ({ request, cache }) => {
	const secret = await getSecret();
	if (!secret) {
		return Response.json(
			{ ok: false, error: "cache invalidation not configured" },
			{ status: 503 },
		);
	}

	const auth = request.headers.get("authorization") ?? "";
	if (auth !== `Bearer ${secret}`) {
		return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ ok: false, error: "invalid JSON" }, { status: 400 });
	}

	const record = body as { tags?: unknown; path?: unknown };
	const tagList = Array.isArray(record.tags)
		? record.tags.filter((t): t is string => typeof t === "string")
		: [];
	const path = typeof record.path === "string" ? record.path : undefined;

	if (tagList.length === 0 && !path) {
		return Response.json(
			{ ok: false, error: "provide tags[] or path" },
			{ status: 400 },
		);
	}

	try {
		if (path) await cache.invalidate({ path });
		if (tagList.length > 0) await cache.invalidate({ tags: tagList });
	} catch (err) {
		return Response.json(
			{
				ok: false,
				error: err instanceof Error ? err.message : "invalidate failed",
			},
			{ status: 500 },
		);
	}

	return Response.json({ ok: true, purged: { tags: tagList, path: path ?? null } });
};
