// Shared image helpers — responsive sizes without an image CDN.
//
// Unsplash resizes server-side through its w= parameter, so a srcset
// can be built from the URL alone (no build-time work, no Cloudflare
// Image Transformations — deliberately NOT layered on top of the
// build pipeline). Any other remote URL returns undefined (it cannot
// be resized), and the caller falls back to a plain <img>.
export function unsplashSrcset(
	url: string | null | undefined,
	widths: number[],
): string | undefined {
	if (!url) return undefined;
	if (!url.includes("images.unsplash.com")) return undefined;
	if (!/w=\d+/.test(url)) return undefined;
	return widths
		.map(
			(w) =>
				`${url.replace(/w=\d+/, `w=${w}`).replace(/q=\d+/, "q=75")} ${w}w`,
		)
		.join(", ");
}
