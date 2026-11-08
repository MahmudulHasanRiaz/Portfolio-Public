// Site settings (hero portrait + default profile) from the admin panel.
//
// Server-only: reads the admin-managed settings via the Public Content
// API (GET {PUBLIC_CONTENT_API_URL}/api/public/settings) through the
// loader's fetchPublicSettings(). Never throws — on any failure it
// returns the fail-safe defaults (repo portrait, Software Engineer
// profile) so the build and every page keep working when the API is
// unset or unreachable. The dashboard side owns the API; this side only
// consumes it.
//
// Hybrid live-then-static: pages await getSiteSettings() at build /
// request time (the static half); the client live-swap script in
// Hero.astro fetches /api/settings after load (the live half).

import {
	fetchPublicSettings,
	DEFAULT_PUBLIC_SETTINGS,
	type PublicSettings,
} from "../loaders/public-content";

export type { PublicSettings, PrimaryIdentity, DefaultLanguage, SettingsBn } from "../loaders/public-content";

export async function getSiteSettings(): Promise<PublicSettings> {
	try {
		return await fetchPublicSettings();
	} catch {
		return { ...DEFAULT_PUBLIC_SETTINGS };
	}
}
