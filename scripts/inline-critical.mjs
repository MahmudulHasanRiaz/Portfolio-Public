// Post-build critical CSS (PageSpeed 2026-11-10).
// Runs AFTER `astro build` (see package.json "build").
// Uses critters (Google Chrome Labs) to inline the above-the-fold
// CSS of each prerendered page and load the full stylesheet
// non-blockingly (preload + JS loader + <noscript> fallback).
// No new runtime dependency: critters runs only at build time.
// Zero drift: the inlined CSS is EXTRACTED from the built CSS file
// on every build — there is no hand-maintained critical subset to
// go stale when glass.css changes.
//
// One gap critters leaves: @font-face rules are NOT inlined (it
// keeps the font-family references but drops the declarations), so
// text would render in the fallback font until the full stylesheet
// loads — a font swap that can shift layout (CLS). This script
// prepends the @font-face rules from the built CSS into the inlined
// <style> so the correct fonts apply on first paint. The font FILES
// are already preloaded by Layout.astro (<link rel="preload"
// as="font">), so no extra fetch is added.
import Critters from "critters";
import { glob } from "node:fs/promises";
import fs from "node:fs/promises";
import path from "node:path";

const DIST = "dist/client";

// Find the built stylesheet(s) Astro emitted (hashed filename).
const cssFiles = await Array.fromAsync(
	glob(path.join(DIST, "_astro", "*.css")),
);
if (cssFiles.length === 0) {
	console.error("[inline-critical] no built CSS found under dist/client/_astro");
	process.exit(1);
}

// Extract @font-face rules from the built CSS so first paint uses
// the real fonts (see header comment). Keep them verbatim.
let fontFace = "";
for (const f of cssFiles) {
	const css = await fs.readFile(f, "utf8");
	const rules = css.match(/@font-face\s*{[^}]*}/g) ?? [];
	fontFace += rules.join("\n");
}
if (!fontFace) {
	console.warn("[inline-critical] WARNING: no @font-face rules found in built CSS");
}

const critters = new Critters({
	path: DIST,
	publicPath: "/",
	preload: "js",
	inlineFonts: false,
	preloadFonts: false,
	compress: true,
});

const pages = await Array.fromAsync(glob(path.join(DIST, "**", "*.html")));
let totalInlined = 0;
for (const page of pages) {
	const html = await fs.readFile(page, "utf8");
	let out = await critters.process(html);
	// Prepend @font-face into the inlined <style> (first <style> tag
	// is the one critters created for the critical CSS).
	if (fontFace) {
		out = out.replace(/(<style[^>]*>)/, `$1${fontFace}`);
	}
	await fs.writeFile(page, out);
	const m = out.match(/<style[^>]*>([\s\S]*?)<\/style>/);
	totalInlined += m ? m[1].length : 0;
}
console.log(
	`[inline-critical] processed ${pages.length} pages, ` +
		`avg inlined <style> ${(totalInlined / pages.length / 1024).toFixed(1)} kB, ` +
		`@font-face ${fontFace.length} B prepended`,
);
