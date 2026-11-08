// i18n helpers — bilingual (English + Bangla) routing + content
// localisation. URL separation only: English at /<page>, Bangla at
// /bn/<page>. Language is determined by the URL; there is NO
// auto-redirect on load for SEO (the first-visit default-language
// script in Layout.astro is client-side only and never fires for a
// /bn/* URL). This module imports nothing from astro:content, so
// client islands (React .tsx) can safely import from it.

export type Lang = "en" | "bn";

export type DefaultLanguage = "en" | "bn" | "system";

/** localStorage key for the visitor's explicit language choice. */
export const SITE_LANG_KEY = "site-lang";

import { en } from "../i18n/en";
import { bn, type Dict } from "../i18n/bn";

export type { Dict };

/** The fixed-UI dictionary for a page language. */
export function getDict(lang: Lang): Dict {
	return lang === "bn" ? bn : en;
}

/** "bn" when the pathname is a Bangla URL, otherwise "en". */
export function langFromPath(pathname: string): Lang {
	return pathname === "/bn" || pathname.startsWith("/bn/")
		? "bn"
		: "en";
}

/**
 * Language-aware internal URL. `path` is always the ENGLISH path
 * ("/projects/x", "/know-me", "/#contact"); the Bangla version is
 * "/bn" + path ("/bn/projects/x", "/bn/know-me", "/bn/#contact").
 * External URLs, mailto: and tel: pass through untouched.
 */
export function langUrl(path: string, lang: Lang): string {
	if (
		!path.startsWith("/") ||
		path.startsWith("//") ||
		/^(mailto|tel):/i.test(path)
	) {
		return path;
	}
	if (lang === "en") return path;
	if (path === "/") return "/bn/";
	return `/bn${path}`;
}

/** The same page in the other language (header switcher target). */
export function otherLangUrl(pathname: string, lang: Lang): string {
	if (lang === "bn") {
		if (pathname === "/bn" || pathname === "/bn/") return "/";
		return pathname.replace(/^\/bn/, "") || "/";
	}
	if (pathname === "/") return "/bn/";
	return `/bn${pathname}`;
}

/** Strip "/bn" from a pathname to get the canonical English path. */
export function enPath(pathname: string): string {
	if (pathname === "/bn" || pathname === "/bn/") return "/";
	return pathname.replace(/^\/bn/, "") || "/";
}

/**
 * Localised content: when rendering a /bn/ page, a content item's
 * optional nested `bn` object overlays the English top-level fields
 * with the SAME names (title, description, content, lyrics, ...).
 * A Bangla field is used only when present and non-empty; otherwise
 * the English value is kept — a /bn/ page never renders a blank.
 * `bn` may itself be nested (live bn wins over build-time bn — the
 * merge helpers in lib/content.ts + lib/detail.ts merge the `bn`
 * objects field-wise the same way they merge English fields).
 */
export function localizeData<T extends Record<string, unknown>>(
	data: T,
	lang: Lang,
): T {
	if (lang !== "bn") return data;
	const bn = (data as Record<string, unknown>)["bn"];
	if (!bn || typeof bn !== "object") return data;
	const out: Record<string, unknown> = { ...data };
	for (const [key, value] of Object.entries(
		bn as Record<string, unknown>,
	)) {
		const empty =
			value === undefined ||
			value === null ||
			value === "" ||
			(Array.isArray(value) && value.length === 0);
		if (!empty) out[key] = value;
	}
	return out as T;
}

/**
 * Case-study `bn` uses DB field names while the English top level uses
 * API names — map before overlaying (live shape, PR #76):
 *   bn.challenge → problem, bn.strategy → fix, bn.results → result,
 *   bn.research → research.
 * An explicit API-named key in `bn` (e.g. older build-time frontmatter
 * with `problem`) wins over the mapped DB name, so both shapes work.
 * All other types use identical field names in `bn` and need no map.
 */
const CASE_STUDY_BN_MAP: Record<string, string> = {
	challenge: "problem",
	strategy: "fix",
	results: "result",
	research: "research",
};

export function localizeCaseStudy<T extends Record<string, unknown>>(
	data: T,
	lang: Lang,
): T {
	if (lang !== "bn") return data;
	const bn = (data as Record<string, unknown>)["bn"];
	if (!bn || typeof bn !== "object") return data;
	const remapped: Record<string, unknown> = {
		...(bn as Record<string, unknown>),
	};
	for (const [dbKey, apiKey] of Object.entries(CASE_STUDY_BN_MAP)) {
		if (apiKey in remapped) continue;
		if (dbKey in remapped) remapped[apiKey] = remapped[dbKey];
	}
	return localizeData({ ...data, bn: remapped }, lang);
}

/** Date in the page language (Bangla → bn-BD, Bangla digits). */
export function formatDateLang(
	iso: string | undefined | null,
	lang: Lang,
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

/** "3 min read" / "৩ মিনিট পড়া" (Bangla digits on /bn/). */
export function readingTimeLabel(
	minutes: number | undefined | null,
	lang: Lang,
): string {
	if (!minutes) return "";
	if (lang === "bn") {
		return `${minutes.toLocaleString("bn-BD")} মিনিট পড়া`;
	}
	return `${minutes} min read`;
}

/**
 * "Showing X of Y projects" / "মোট Yটি প্রকল্পের মধ্যে Xটি দেখানো
 * হচ্ছে" — `template` comes from the dictionary with {shown} and
 * {total} placeholders, so the client-side filter scripts can reuse
 * the same string (see the data-count-template attribute).
 */
export function showingLabel(
	template: string,
	shown: number,
	total: number,
): string {
	const fmt = (n: number) =>
		template.includes("টি") ? n.toLocaleString("bn-BD") : String(n);
	return template
		.replace("{shown}", fmt(shown))
		.replace("{total}", fmt(total));
}

/** "Watch on YouTube" / "ইউটিউবে দেখুন", "Listen on X" / "X-এ শুনুন". */
export function platformActionLabelLang(
	name: string,
	lang: Lang,
): string {
	if (lang === "bn") {
		return name.toLowerCase() === "youtube"
			? "ইউটিউবে দেখুন"
			: `${name}-এ শুনুন`;
	}
	return name.toLowerCase() === "youtube"
		? "Watch on YouTube"
		: `Listen on ${name}`;
}
