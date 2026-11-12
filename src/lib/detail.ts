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

/**
 * Origin of the incoming request (protocol + host, no path, no
 * trailing slash) — the ONLY host source. Accepts a Request, a URL,
 * a URL string, or an Astro-like `{ url }` object. The origin comes
 * from the request URL itself (Astro.url / request.url), NEVER from
 * Host / X-Forwarded-Host headers: Cloudflare sets the request URL
 * from the host the request actually arrived on, while a forwarded
 * header is client-controlled and would let anyone spoof canonicals.
 * Only a valid http(s) origin with a dotted host counts; anything
 * else (relative URL, wrong scheme, bare hostname) returns
 * undefined so the caller falls through to the next source.
 */
export function requestOrigin(
	input?: Request | URL | string | { url?: string | URL } | undefined,
): string | undefined {
	let raw: string | undefined;
	if (typeof input === "string") raw = input;
	else if (input instanceof URL) raw = input.toString();
	else if (input instanceof Request) raw = input.url;
	else if (input && typeof input === "object" && "url" in input) {
		const u = input.url;
		raw = u instanceof URL ? u.toString() : u;
	}
	if (!raw) return undefined;
	try {
		const parsed = new URL(raw);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
			return undefined;
		// Dotted host (real domain) — or localhost for local dev
		// (astro dev runs on localhost:4321, which has no dot).
		const host = parsed.host;
		const okHost =
			/^[^/]+\.[^/]{2,}$/.test(host) ||
			host === "localhost" ||
			host.startsWith("localhost:");
		if (!okHost) return undefined;
		return parsed.origin;
	} catch {
		return undefined;
	}
}

/**
 * True only when the admin `site_url` setting is an explicit override:
 * a valid http(s) URL DIFFERENT from SITE_URL. The loader's fail-safe
 * default IS SITE_URL (public-content.ts DEFAULT_PUBLIC_SETTINGS), so
 * "admin never set site_url" and "admin set it to the fallback host"
 * arrive here as the same value — and the distinction does not matter:
 * in both cases the request host wins, which is the wanted behaviour.
 * Only a genuinely different admin value (e.g. the custom domain
 * mahmudulhasanriaz.com once it is connected) counts as an override.
 */
export function isAdminSiteUrl(siteUrl?: string | null): siteUrl is string {
	if (typeof siteUrl !== "string") return false;
	const cleaned = siteUrl.trim().replace(/\/$/, "");
	if (!/^https?:\/\/[^/]+\.[^/]{2,}/i.test(cleaned)) return false;
	return cleaned.toLowerCase() !== SITE_URL.toLowerCase();
}

/** The admin override when it is explicit, else undefined. */
function adminBase(siteUrl?: string | null): string | undefined {
	if (!isAdminSiteUrl(siteUrl)) return undefined;
	return siteUrl.trim().replace(/\/$/, "");
}

/**
 * Host-consistent base — for robots.txt + sitemap.xml. Precedence:
 *   request host → explicit admin site_url → SITE_URL fallback.
 * The request host MUST win here: the Sitemap line in robots.txt and
 * every <loc> in the sitemap have to live on the host the crawler
 * actually fetched, or search engines reject them as cross-host.
 */
export function resolveHostBase(
	siteUrl?: string | null,
	request?: Request | URL | string | { url?: string | URL } | undefined,
): string {
	return requestOrigin(request) ?? adminBase(siteUrl) ?? SITE_URL;
}

/**
 * Canonical base — for Layout canonical / hreflang / og:url / JSON-LD
 * and detail-page canonicals. Precedence:
 *   explicit admin site_url → request host → SITE_URL fallback.
 * The admin value wins when set so search engines see ONE canonical
 * no matter which host served the page; without an admin override the
 * page is self-consistent on whichever domain served it.
 *
 * NOTE on prerendered pages: at build time Astro.url.origin is
 * Astro.site (astro.config.mjs), so static pages bake that origin
 * into their canonicals; only on-demand renders (detail twin
 * fallback, robots, sitemap) see the live request host. That is
 * inherent to static prerendering — making pages host-aware at serve
 * time would need them on-demand, which is out of scope here.
 */
export function resolveCanonicalBase(
	siteUrl?: string | null,
	request?: Request | URL | string | { url?: string | URL } | undefined,
): string {
	return adminBase(siteUrl) ?? requestOrigin(request) ?? SITE_URL;
}

/**
 * Resolve the site's canonical base URL from the admin setting
 * (settings key "site_url", parsed as PublicSettings.siteUrl).
 * Only a valid http(s) URL counts — anything else (absent,
 * empty, malformed, wrong scheme) falls back to SITE_URL, the
 * live workers.dev base, so a bad admin value can never poison
 * canonicals, sitemap or robots. Never returns a trailing slash.
 * The custom domain (mahmudulhasanriaz.com) stays disconnected
 * until dev finishes — it arrives here only via the admin setting.
 *
 * Kept for backward compatibility: this is the canonical (SEO)
 * precedence — explicit admin site_url → request host → SITE_URL.
 * Robots/sitemap must use resolveHostBase() instead (request host
 * first); canonical/OG/JSON-LD callers should prefer
 * resolveCanonicalBase() explicitly.
 */
export function resolveSiteUrl(
	siteUrl?: string | null,
	request?: Request | URL | string | { url?: string | URL } | undefined,
): string {
	return resolveCanonicalBase(siteUrl, request);
}

/**
 * Resolve a stored URL to an absolute URL against the given base
 * (default SITE_URL for callers that have no request context).
 * Pass the page's resolved base (resolveCanonicalBase / resolveHostBase)
 * so relative media never hardcodes the fallback host.
 */
export function absUrl(
	url: string | null | undefined,
	base: string = SITE_URL,
): string | undefined {
	if (!url) return undefined;
	if (/^https?:\/\//i.test(url)) return url;
	const cleanBase = base.replace(/\/$/, "");
	if (url.startsWith("/")) return `${cleanBase}${url}`;
	return `${cleanBase}/${url}`;
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

export interface InlineNode {
	text: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	strike?: boolean;
	/** Link target — http(s) or site-relative only (see isSafeUrl). */
	href?: string;
}

export interface BodyBlock {
	kind: "h2" | "h3" | "p" | "img" | "ul" | "ol" | "quote";
	text: string;
	/** Image URL — img blocks only. */
	src?: string;
	/** Image alt text — img blocks only. */
	alt?: string;
	/** Rich inline runs — HTML path only; legacy blocks omit it and
	 * render `text` as escaped plain text. */
	inline?: InlineNode[];
	/** List items — ul/ol blocks only; each item is its inline runs. */
	items?: InlineNode[][];
}

/**
 * The preview's content blocks: a '## ' line is an h2 section heading,
 * a line that is exactly a markdown image `![alt](url)` is an img
 * block, every other block is a paragraph. Single newlines inside a
 * block are line wraps, not new blocks.
 *
 * Inline images inside a paragraph (text before/after the `![...]`)
 * stay literal text — only a standalone image line becomes an <img>,
 * so body copy can never silently gain an image it did not ask for.
 * The img block renders through MarkdownBody with the same automatic
 * optimization as every other remote image (files.riaz.com.bd →
 * /api/image, Unsplash → w= rewrite, anything else unchanged).
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
			} else if (
				/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/.test(trimmed)
			) {
				const [, alt, src] =
					trimmed.match(
						/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/,
					) ?? [];
				blocks.push({ kind: "img", text: alt ?? "", src, alt });
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

/**
 * Dual-format body parsing (TipTap upgrade, 2026-11-12).
 *
 * The admin now edits long text in TipTap and stores HTML; older rows
 * are plain text in the `## ` + paragraph format above. `parseRichBody`
 * routes each row to the right parser, so both render and no stored
 * row is ever rewritten:
 * - HTML rows (a real allowlisted tag is present) -> parseHtmlBlocks,
 *   the allowlist sanitizer below.
 * - Everything else -> parseBodyBlocks, untouched legacy behaviour.
 *
 * Detection must see a REAL tag — `<` followed by a letter, i.e. a
 * tag-shaped fragment — not just a `<` character: prose like
 * "a < b" or a stray "<3" stays on the legacy path. Any tag-shaped
 * row (even a disallowed one like `<div>`) routes to the sanitizer,
 * which strips the tag and keeps its inner text; only tag-shaped
 * input ever leaves the legacy path.
 */
export function isHtmlBody(text: string | null | undefined): boolean {
	if (!text) return false;
	return /<[a-zA-Z][a-zA-Z0-9]*(\s[^>]*)?\/?>/.test(text);
}

/** Route a stored body to the legacy or the sanitized-HTML parser. */
export function parseRichBody(
	text: string | null | undefined,
): BodyBlock[] {
	if (!text) return [];
	return isHtmlBody(text) ? parseHtmlBlocks(text) : parseBodyBlocks(text);
}

/** Tags the HTML path may emit. Everything else is stripped. */
const ALLOWED_TAGS = new Set([
	"p",
	"h2",
	"h3",
	"strong",
	"em",
	"u",
	"s",
	"ul",
	"ol",
	"li",
	"blockquote",
	"a",
	"img",
]);

/** Disallowed tags whose CONTENT is dropped too (never rendered as text). */
const DROP_CONTENT_TAGS = new Set([
	"script",
	"style",
	"iframe",
	"object",
	"embed",
	"form",
	"noscript",
	"template",
	"svg",
	"math",
	"video",
	"audio",
]);

const BLOCK_TAGS = new Set(["p", "h2", "h3", "blockquote"]);

/** True for http(s) URLs and site-relative paths. `//host` is rejected:
 * it is protocol-relative, not site-relative. */
export function isSafeUrl(url: string | null | undefined): boolean {
	if (!url) return false;
	const u = url.trim();
	if (!u || /[\u0000-\u001f\u007f]/.test(u)) return false;
	if (/^https?:\/\//i.test(u)) return true;
	if (u.startsWith("//")) return false;
	return (
		u.startsWith("/") ||
		u.startsWith("./") ||
		u.startsWith("../") ||
		u.startsWith("#")
	);
}

function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&nbsp;/g, " ");
}

type Mark = {
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	strike?: boolean;
	href?: string;
};

function sameMarks(a: Mark, b: Mark): boolean {
	return (
		a.bold === b.bold &&
		a.italic === b.italic &&
		a.underline === b.underline &&
		a.strike === b.strike &&
		a.href === b.href
	);
}

/** Parse one tag's attributes into a name -> value map (quoted or bare). */
function parseAttrs(tagInner: string): Map<string, string> {
	const attrs = new Map<string, string>();
	const re =
		/([a-zA-Z][a-zA-Z0-9-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(tagInner)) !== null) {
		const name = (m[1] ?? "").toLowerCase();
		const value = m[2] ?? m[3] ?? m[4] ?? "";
		if (name && !attrs.has(name)) attrs.set(name, value);
	}
	return attrs;
}

/**
 * Tokenizer-based allowlist sanitizer: TipTap HTML -> typed BodyBlocks.
 *
 * Deny by default. Only allowlisted tags reach the page, only `a[href]`
 * and `img[src, alt]` attributes survive (both URL-allowlisted), and all
 * text is emitted as typed nodes that MarkdownBody renders through
 * Astro's escaping — there is NO raw-HTML passthrough anywhere, so
 * `<script>`, event handlers (`onerror=`), `javascript:` links and
 * `<style>` can never execute. `<script>`/`<style>`-family content is
 * dropped entirely; other disallowed tags are stripped but their inner
 * text is kept, so no content is silently lost.
 *
 * Nested lists are flattened into the outer list (items are never
 * dropped). Malformed `<` sequences that are not real tags stay text.
 */
export function parseHtmlBlocks(html: string): BodyBlock[] {
	const blocks: BodyBlock[] = [];
	// Current open block (p/h2/h3/quote) and its inline runs.
	let block: { kind: "p" | "h2" | "h3" | "quote"; inline: InlineNode[] } | null =
		null;
	// Open lists, outermost first; a nested list's items flatten into
	// its parent when the nested list closes. `item` is the in-progress
	// item of the innermost open list.
	const listStack: Array<{ kind: "ul" | "ol"; items: InlineNode[][] }> = [];
	let item: InlineNode[] | null = null;
	// Open inline marks (bold/italic/underline/strike/link), innermost last.
	const marks: Mark[] = [];
	// Depth inside a DROP_CONTENT_TAGS element; while > 0, skip everything.
	let dropDepth = 0;

	const plainText = (nodes: InlineNode[]): string =>
		nodes.map((n) => n.text).join("");

	const flushBlock = () => {
		if (!block) return;
		if (block.inline.some((n) => n.text.trim() !== "")) {
			blocks.push({
				kind: block.kind,
				text: plainText(block.inline),
				inline: block.inline,
			});
		}
		block = null;
	};

	const flushItem = () => {
		const top = listStack[listStack.length - 1];
		if (!top || !item) return;
		if (item.some((n) => n.text.trim() !== "")) top.items.push(item);
		item = null;
	};

	/** Close the innermost open list: merge its items into the parent
	 * list (flattened), or emit it as a block when it is outermost. */
	const closeList = () => {
		flushItem();
		const frame = listStack.pop();
		if (!frame || frame.items.length === 0) return;
		const parent = listStack[listStack.length - 1];
		if (parent) {
			parent.items.push(...frame.items);
		} else {
			blocks.push({
				kind: frame.kind,
				text: frame.items.map((it) => plainText(it)).join(" "),
				items: frame.items,
			});
		}
	};

	/** Close every open list (a block tag or image interrupts a list). */
	const flushAllLists = () => {
		while (listStack.length > 0) closeList();
	};

	const openBlock = (kind: "p" | "h2" | "h3" | "quote") => {
		flushBlock();
		flushAllLists();
		block = { kind, inline: [] };
	};

	const appendText = (raw: string) => {
		const text = decodeEntities(raw);
		if (!text) return;
		const mark: Mark = {};
		for (const m of marks) Object.assign(mark, m);
		const node: InlineNode = { text, ...mark };
		// Inside a list with no open item (e.g. text after a nested
		// list closed), resume a fresh item in the innermost list.
		const target =
			item ?? (listStack.length > 0 ? (item = []) : block?.inline);
		if (target) {
			const last = target[target.length - 1];
			if (last && sameMarks(last, mark)) {
				last.text += text;
			} else {
				target.push(node);
			}
		} else {
			// Bare text outside any block (lenient): wrap in a paragraph.
			block = { kind: "p", inline: [node] };
		}
	};

	const closeMark = (key: keyof Mark) => {
		for (let i = marks.length - 1; i >= 0; i -= 1) {
			if (marks[i]?.[key] !== undefined) {
				marks.splice(i, 1);
				return;
			}
		}
	};

	// Split into text runs and tag tokens. A `<` only starts a token when
	// it opens a comment or a letter-led tag; anything else stays text.
	const tokenRe = /<!--[\s\S]*?-->|<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?\/?>/g;
	let lastIndex = 0;
	let m: RegExpExecArray | null;
	const handleToken = (token: string) => {
		if (token.startsWith("<!--")) return; // comment: skip
		const isClose = token.startsWith("</");
		const inner = token.replace(/^<\/?|\/?>$/g, "").trim();
		const name = (inner.split(/\s+/)[0] ?? "").toLowerCase();
		if (!name) return;
		if (DROP_CONTENT_TAGS.has(name)) {
			if (!isClose) dropDepth += 1;
			else if (dropDepth > 0) dropDepth -= 1;
			return;
		}
		if (dropDepth > 0) return;
		if (!ALLOWED_TAGS.has(name)) return; // strip tag, keep inner text
		if (name === "img" && !isClose) {
			const attrs = parseAttrs(inner);
			const src = attrs.get("src") ?? "";
			if (!isSafeUrl(src)) return;
			flushBlock();
			flushAllLists();
			blocks.push({
				kind: "img",
				text: attrs.get("alt") ?? "",
				src,
				alt: attrs.get("alt") ?? "",
			});
			return;
		}
		if (name === "br" && !isClose) {
			appendText(" ");
			return;
		}
		if (BLOCK_TAGS.has(name)) {
			if (isClose) flushBlock();
			else
				openBlock(
					name === "blockquote"
						? "quote"
						: (name as "p" | "h2" | "h3"),
				);
			return;
		}
		if (name === "ul" || name === "ol") {
			if (isClose) {
				closeList();
			} else {
				flushBlock();
				// Flush the parent item first so its text stays ahead
				// of the nested items (order is preserved on flatten).
				flushItem();
				listStack.push({ kind: name, items: [] });
			}
			return;
		}
		if (name === "li") {
			if (isClose) {
				flushItem();
			} else {
				flushItem();
				if (listStack.length === 0)
					listStack.push({ kind: "ul", items: [] });
				item = [];
			}
			return;
		}
		// Inline marks.
		switch (name) {
			case "strong":
			case "b":
				if (isClose) closeMark("bold");
				else marks.push({ bold: true });
				break;
			case "em":
			case "i":
				if (isClose) closeMark("italic");
				else marks.push({ italic: true });
				break;
			case "u":
				if (isClose) closeMark("underline");
				else marks.push({ underline: true });
				break;
			case "s":
			case "strike":
				if (isClose) closeMark("strike");
				else marks.push({ strike: true });
				break;
			case "a": {
				if (isClose) {
					closeMark("href");
				} else {
					const href = parseAttrs(inner).get("href") ?? "";
					if (isSafeUrl(href)) marks.push({ href });
				}
				break;
			}
			default:
				break;
		}
	};

	while ((m = tokenRe.exec(html)) !== null) {
		const textRun = html.slice(lastIndex, m.index);
		if (textRun && dropDepth === 0) appendText(textRun);
		lastIndex = m.index + m[0].length;
		handleToken(m[0]); // dropDepth + DROP_CONTENT_TAGS handled inside
	}
	const tail = html.slice(lastIndex);
	if (tail && dropDepth === 0) appendText(tail);
	flushBlock();
	flushAllLists();
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
