// Shared detail-page helpers (Run 13 — detail-pages fix round).
//
// - SITE_URL is the site's ACTUAL live base URL. Canonical links,
//   JSON-LD URLs and OG images all use it — never riaz.com.bd (the old /
//   future domain) while the live site is on workers.dev.
// - Body rendering: live entries carry their body as a plain `content`
//   string. `parseBodyBlocks` turns it into the preview's content
//   blocks ('## ' lines become h2 section headings, the rest
//   paragraphs). Build-time entries render markdown natively.
// - `isNearDuplicate` / `dedupeBlocks` stop the same story rendering
//   twice (case-study body vs problem/fix/result; venture body vs
//   description): a block that restates a field already shown on the
//   page is dropped, never rendered a second time.
// - New backend fields (ventures media, release lyrics/videos,
//   case-study research/metrics, project longDescription) are consumed
//   when present and omitted gracefully when absent. Nothing here
//   invents content.

export const SITE_URL =
	"https://portfolio-public.riaaz.workers.dev";

/** Resolve a stored URL to an absolute URL against the live base. */
export function absUrl(url: string | null | undefined): string | undefined {
	if (!url) return undefined;
	if (/^https?:\/\//i.test(url)) return url;
	if (url.startsWith("/")) return `${SITE_URL}${url}`;
	return `${SITE_URL}/${url}`;
}

/** A stored website link is real only when it is a plain http(s) URL. */
export function isRealUrl(url: string | null | undefined): url is string {
	if (!url || typeof url !== "string") return false;
	if (!/^https?:\/\/[^/]+\.[^/]{2,}/i.test(url)) return false;
	if (/example\.(com|org|net)/i.test(url)) return false;
	return true;
}

/** Split a plain-text body into paragraphs (blank-line separated). */
export function splitParagraphs(text: string | null | undefined): string[] {
	if (!text) return [];
	return text
		.split(/\n\s*\n/)
		.map((s) => s.replace(/\s*\n\s*/g, " ").trim())
		.filter(Boolean);
}

export interface BodyBlock {
	kind: "h2" | "p";
	text: string;
}

/**
 * The preview's content blocks: a '## ' line is an h2 section heading,
 * every other block is a paragraph. Single newlines inside a block are
 * line wraps, not new blocks.
 */
export function parseBodyBlocks(
	text: string | null | undefined,
): BodyBlock[] {
	if (!text) return [];
	const blocks: BodyBlock[] = [];
	for (const raw of text.split(/\n\s*\n/)) {
		const chunk = raw.trim();
		if (!chunk) continue;
		for (const line of chunk.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			if (/^#{1,2}\s+/.test(trimmed)) {
				blocks.push({
					kind: "h2",
					text: trimmed.replace(/^#{1,2}\s+/, "").trim(),
				});
			} else if (blocks.length > 0 && blocks[blocks.length - 1].kind === "p") {
				// A wrapped line of the same paragraph.
				blocks[blocks.length - 1].text += ` ${trimmed}`;
			} else {
				blocks.push({ kind: "p", text: trimmed });
			}
		}
	}
	return blocks;
}

function wordSet(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, " ")
			.split(/\s+/)
			.filter((w) => w.length > 2),
	);
}

/**
 * True when two texts say the same thing: one contains the other, or
 * their word sets overlap by half or more. Used to drop a body block
 * that merely restates a field already rendered on the page.
 */
export function isNearDuplicate(a: string, b: string): boolean {
	const na = a.toLowerCase().replace(/\s+/g, " ").trim();
	const nb = b.toLowerCase().replace(/\s+/g, " ").trim();
	if (!na || !nb) return false;
	if (na === nb) return true;
	const shorter = na.length <= nb.length ? na : nb;
	const longer = na.length <= nb.length ? nb : na;
	if (shorter.length >= 40 && longer.includes(shorter)) return true;
	const sa = wordSet(na);
	const sb = wordSet(nb);
	if (sa.size === 0 || sb.size === 0) return false;
	let shared = 0;
	for (const w of sa) if (sb.has(w)) shared++;
	const jaccard = shared / (sa.size + sb.size - shared);
	return jaccard >= 0.5;
}

/** Drop body blocks that restate any of the given reference texts. */
export function dedupeBlocks(
	blocks: BodyBlock[],
	refs: Array<string | null | undefined>,
): BodyBlock[] {
	const references = refs.filter((r): r is string => Boolean(r?.trim()));
	if (references.length === 0) return blocks;
	return blocks.filter(
		(block) =>
			!references.some((ref) => isNearDuplicate(block.text, ref)),
	);
}

/**
 * Field-wise merge of a build-time row with its live API row: live wins
 * where it has a value; the build-time value is kept where the live row
 * is empty (null, "", or []). A detail page must never lose its
 * thumbnail, tags, gallery or techs just because the API row left them
 * blank — same rule as mergeWithLive for lists.
 */
export function mergeDetail<T extends Record<string, unknown>>(
	base: T | undefined,
	live: Record<string, unknown> | undefined,
): T | undefined {
	if (!base) return live as T | undefined;
	if (!live) return base;
	const out: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(live)) {
		if (key === "bn") {
			// Bangla variant merges field-wise (same rule as
			// mergeEntryData in lib/content.ts): live `bn` wins where
			// it has a value; build-time `bn` survives where empty.
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
				const empty =
					bv === undefined ||
					bv === null ||
					bv === "" ||
					(Array.isArray(bv) && bv.length === 0);
				if (!empty) merged[bk] = bv;
			}
			if (Object.keys(merged).length > 0) out["bn"] = merged;
			continue;
		}
		const empty =
			value === undefined ||
			value === null ||
			value === "" ||
			(Array.isArray(value) && value.length === 0);
		if (!empty) out[key] = value;
	}
	return out as T;
}

/** "2023" from an ISO date, or "" when there is none. */
export function yearOf(iso: string | null | undefined): string {
	if (!iso) return "";
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? "" : String(d.getFullYear());
}

/**
 * The service pre-selected in the shared contact modal for a project,
 * from the project's own tags. The modal's select uses service NAMES
 * (ContactForm), so the map returns names. Unknown tags → no
 * pre-selection (never guess a service).
 */
export function serviceForTags(tags: string[] | undefined): string | undefined {
	const list = (tags ?? []).map((t) => t.toLowerCase());
	if (list.some((t) => t.includes("erp") || t.includes("crm"))) {
		return "ERP/CRM Development";
	}
	if (
		list.some(
			(t) =>
				t.includes("wordpress") ||
				t.includes("plugin") ||
				t.includes("woocommerce"),
		)
	) {
		return "WordPress Website and Theme/Plugin Development";
	}
	if (list.some((t) => t.includes("shopify"))) {
		return "Shopify Development";
	}
	if (
		list.some(
			(t) =>
				t.includes("e-commerce") ||
				t.includes("ecommerce") ||
				t.includes("saas"),
		)
	) {
		return "Ecommerce Consultancy";
	}
	return undefined;
}

/** "Watch on YouTube" for video platforms, "Listen on …" elsewhere. */
export function platformActionLabel(name: string): string {
	return name.toLowerCase() === "youtube"
		? "Watch on YouTube"
		: `Listen on ${name}`;
}
