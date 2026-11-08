import { useCallback, useEffect, useRef, useState } from "react";
import {
	Check,
	ChevronDown,
	Code,
	Menu,
	Moon,
	Play,
	Sun,
	User,
} from "lucide-react";

export type ProfileId = "se" | "knowme";

const PROFILES: Array<{
	id: ProfileId;
	label: string;
	href: string;
	icon: typeof Code;
}> = [
	{ id: "se", label: "Software Engineer", href: "/", icon: Code },
	{ id: "knowme", label: "Know Me", href: "/know-me", icon: User },
];

const NAV_LINKS = [
	{ label: "Work", href: "/#projects" },
	{ label: "Ventures", href: "/#beyond" },
	{ label: "Nasheed", href: "/releases" },
	{ label: "About", href: "/know-me" },
	{ label: "Contact", href: "/#contact" },
];

// Label animation (preview, CORRECTED 2026-11-08 ~18:42): the pill LABEL
// only ANIMATES — it cycles between the two profile names with a smooth
// vertical slide + fade (~2.8s each, ~450ms transition). Text animation
// ONLY; the page NEVER navigates by itself. There is NO auto-rotation
// timer and NO navigation: the two profiles were "just animating there".
// (An earlier round misread this as a 2.8s NAVIGATION timer — that timer
// bounced visitors off every page, including post/release detail pages,
// after 2.8s. It is removed entirely; do not re-add it.)
// Tapping a profile in the picker PAUSES the label animation on that
// profile (the tap itself navigates to that profile's route — the
// visitor's deliberate choice). The play/resume button in the pill is
// ONLY visible while paused; while the animation runs (the default) it
// is HIDDEN. "Resume auto-rotation" restarts the label animation; the
// current/default profile stays as it is.
const LABEL_CYCLE_MS = 2800;
const ROTATION_PAUSED_KEY = "profile-rotation-paused";

/**
 * Site header — a profile switcher, not a designation display.
 * Top row (not sticky): language switcher left, theme switcher right.
 * Below it, a sticky compact glass pill (hamburger + profile label +
 * teal dot + chevron + nav links) with glowing teal arcs hanging above it.
 * On scroll the header becomes one unified sticky row: the two corner
 * buttons join the pill on the same baseline, at the far edges.
 *
 * The pill LABEL animates between the two profile names (~2.8s each,
 * slide + fade ~450ms) exactly like the React preview; the label NEVER
 * navigates the page. Tapping a profile pauses the animation on it.
 */
export default function SiteHeader({ current }: { current: ProfileId }) {
	const [stuck, setStuck] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [lang, setLang] = useState<"en" | "bn">("en");
	const [langHint, setLangHint] = useState(false);
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [rotationPaused, setRotationPaused] = useState(false);
	// The profile name the pill label currently shows. While the label
	// animation runs it alternates between the two profiles; while
	// paused it sits on the current profile.
	const [displayedProfile, setDisplayedProfile] =
		useState<ProfileId>(current);
	// The profile the label is sliding AWAY from (previous cycle). The
	// outgoing span slides up (-8px) and fades while the incoming span
	// slides up from below (+8px) — the preview's crossfade. Cleared
	// ~460ms after each change, once the 450ms transition has run.
	const [prevProfile, setPrevProfile] = useState<ProfileId | null>(null);
	const displayedRef = useRef<ProfileId>(current);
	const prevClearRef = useRef<number | null>(null);

	// Crossfade the pill label to `next`. Both profile labels stay
	// mounted (stable keys, no remount), so the animation never resets
	// or flickers on scroll — only the classes change, and the 450ms
	// CSS transition does the rest. The pill width never shifts: the
	// label button is a fixed width (160/176/224px, preview w-40/44/56).
	const showProfile = useCallback((next: ProfileId) => {
		const prev = displayedRef.current;
		if (prevClearRef.current !== null) {
			window.clearTimeout(prevClearRef.current);
			prevClearRef.current = null;
		}
		if (prev !== next) setPrevProfile(prev);
		displayedRef.current = next;
		setDisplayedProfile(next);
		prevClearRef.current = window.setTimeout(
			() => setPrevProfile(null),
			460,
		);
	}, []);

	useEffect(
		() => () => {
			if (prevClearRef.current !== null) {
				window.clearTimeout(prevClearRef.current);
			}
		},
		[],
	);

	useEffect(() => {
		const onScroll = () => setStuck(window.scrollY > 24);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	// Scroll restoration: never let the browser restore a scroll
	// position that leaves the header stuck. NOTE: there is NO
	// window.scrollTo(0, 0) here on purpose — the scroll listener
	// below already sets `stuck` from the current scrollY on mount,
	// so the header state is correct without forcing the page to
	// the top. Forcing scroll-to-top on mount yanked the page to 0
	// whenever the island hydrated late (e.g. a visitor who had
	// already scrolled to the globe was bounced back to the top
	// a few seconds after load). "manual" restoration alone keeps
	// navigations at the top without touching the user's scroll.
	useEffect(() => {
		try {
			if ("scrollRestoration" in history) {
				history.scrollRestoration = "manual";
			}
		} catch {
			/* history API unavailable */
		}
	}, []);

	useEffect(() => {
		try {
			const saved = localStorage.getItem("theme");
			if (saved === "light" || saved === "dark") {
				setTheme(saved);
			} else if (
				window.matchMedia("(prefers-color-scheme: dark)").matches
			) {
				setTheme("dark");
			}
		} catch {
			/* storage unavailable */
		}
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setPickerOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	// Rotation paused state: read once on mount (sessionStorage survives
	// the full-page navigations each rotation performs).
	useEffect(() => {
		try {
			setRotationPaused(
				sessionStorage.getItem(ROTATION_PAUSED_KEY) === "1",
			);
		} catch {
			/* storage unavailable */
		}
	}, []);

	// Label animation: while running, the pill label alternates between
	// the two profile names every LABEL_CYCLE_MS. Text only — the page
	// NEVER navigates. While paused, the label sits on the current
	// profile and the interval stays cleared. The crossfade (see
	// showProfile) keeps both labels mounted, so scrolling never
	// resets or flickers the animation. The interval also pauses
	// while the picker is open, so the pill shows the page's own
	// profile steadily while the visitor is choosing — otherwise
	// the label and its dot keep flipping between the two profiles
	// above the open picker.
	useEffect(() => {
		if (rotationPaused || pickerOpen) {
			showProfile(current);
			return;
		}
		showProfile(current);
		const t = window.setInterval(() => {
			showProfile(
				displayedRef.current === "se" ? "knowme" : "se",
			);
		}, LABEL_CYCLE_MS);
		return () => window.clearInterval(t);
	}, [rotationPaused, pickerOpen, current, showProfile]);

	const pauseRotation = () => {
		setRotationPaused(true);
		try {
			sessionStorage.setItem(ROTATION_PAUSED_KEY, "1");
		} catch {
			/* storage unavailable */
		}
	};

	const resumeRotation = () => {
		setRotationPaused(false);
		try {
			sessionStorage.removeItem(ROTATION_PAUSED_KEY);
		} catch {
			/* storage unavailable */
		}
		setPickerOpen(false);
	};

	const toggleTheme = () => {
		const next = theme === "dark" ? "light" : "dark";
		setTheme(next);
		try {
			localStorage.setItem("theme", next);
		} catch {
			/* storage unavailable */
		}
		document.documentElement.setAttribute("data-theme", next);
	};

	const onLangClick = () => {
		// Language switching is coming soon — show a brief hint.
		setLangHint(true);
		window.setTimeout(() => setLangHint(false), 2000);
	};

	// Tapping a profile in the picker pauses rotation ON that profile
	// (preview behavior) and navigates there if it is not current.
	const pickProfile = (p: (typeof PROFILES)[number]) => {
		pauseRotation();
		setPickerOpen(false);
		if (p.id !== current) {
			window.location.href = p.href;
		}
	};

	const currentProfile =
		PROFILES.find((p) => p.id === current) ?? PROFILES[0]!;
	const displayed =
		PROFILES.find((p) => p.id === displayedProfile) ?? currentProfile;

	// The corner buttons exist TWICE (top row + stuck-row copies, like
	// the preview). The hidden set is inert (tabIndex -1) so keyboard
	// users never tab into an invisible button.
	const langBtn = (inert: boolean) => (
		<button
			type="button"
			className="corner-btn"
			tabIndex={inert ? -1 : undefined}
			onClick={onLangClick}
			aria-label="Switch language (coming soon)"
			title="Language switching coming soon"
		>
			<span className="lang-mobile">{lang === "en" ? "BN" : "EN"}</span>
			<span className="lang-desktop">EN/BN</span>
		</button>
	);

	const themeBtn = (inert: boolean) => (
		<button
			type="button"
			className="corner-btn"
			tabIndex={inert ? -1 : undefined}
			onClick={toggleTheme}
			aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
		>
			{/* Crossfading icon swap: both icons stay mounted and swap
			    with a 300ms rotate/scale/opacity transition. */}
			<span className="theme-icon-wrap" aria-hidden="true">
				<span className={`theme-icon${theme === "dark" ? " active" : ""}`}>
					<Sun size={16} />
				</span>
				<span className={`theme-icon${theme === "light" ? " active" : ""}`}>
					<Moon size={16} />
				</span>
			</span>
		</button>
	);

	// Connecting arcs (preview): TWO separate arcs, one in each gap
	// between the pill and a corner button, arching UP (hill) from the
	// pill's edge to the button — the three header pieces read as ONE
	// connected composition. Each arc is absolutely positioned on the
	// pill (right/left: 100%), 54px tall, top: 50% with a -72%
	// vertical shift, so it hangs above the pill row in BOTH states
	// and never strikes through page content. Widths: 32px <420px,
	// 44px ≥420px, 96px ≥640px, 112px ≥1024px. Base opacity 0.16,
	// flowing light 0.55, dasharray 64/336 of pathLength 400, 4s loop,
	// right arc half a cycle behind (-2s). The old single 96px SVG
	// centred above the pill connected to NOTHING — that is why the
	// designer saw "no connecting lines" in all four states.
	const arcs = (
		<>
			<svg
				className="header-arc header-arc-left"
				viewBox="0 0 100 54"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<path className="arc-base" d="M100 44 C62 42 48 14 4 12" />
				<path
					className="arc-flow"
					d="M100 44 C62 42 48 14 4 12"
					pathLength={400}
				/>
			</svg>
			<svg
				className="header-arc header-arc-right"
				viewBox="0 0 100 54"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<path className="arc-base" d="M0 44 C38 42 52 14 96 12" />
				<path
					className="arc-flow"
					d="M0 44 C38 42 52 14 96 12"
					pathLength={400}
				/>
			</svg>
		</>
	);

	// The picker holds ONLY the two profile options (preview): the nav
	// links live in the pill itself, never duplicated in the dropdown.
	// The selected profile carries a teal checkmark (not a dot), and the
	// big full-width teal "Resume auto-rotation" button sits at the
	// bottom (preview).
	const picker = pickerOpen ? (
		<div className="header-picker" role="menu" aria-label="Choose a profile">
			<p
				style={{
					margin: "4px 10px 8px",
					fontSize: 11,
					fontWeight: 700,
					letterSpacing: "0.06em",
					textTransform: "uppercase",
					color: "var(--ink-dim)",
				}}
			>
				Choose a profile
			</p>
			{PROFILES.map((p) => {
				const Icon = p.icon;
				const active = p.id === current;
				return (
					<a
						key={p.id}
						href={p.href}
						onClick={(e) => {
							e.preventDefault();
							pickProfile(p);
						}}
						className={`picker-row${active ? " active" : ""}`}
						role="menuitem"
						aria-current={active ? "true" : undefined}
					>
						<span className="picker-icon">
							<Icon size={18} />
						</span>
						<span>{p.label}</span>
						{active ? (
							<span
								className="picker-check"
								aria-hidden="true"
							>
								<Check size={16} />
							</span>
						) : null}
					</a>
				);
			})}
			<button
				type="button"
				className="picker-resume-btn"
				onClick={resumeRotation}
			>
				<Play size={14} />
				Resume auto-rotation
			</button>
		</div>
	) : null;

	// The pill: hamburger + profile label (fixed width, crossfading) +
	// teal dot + resume-when-paused + chevron + nav links. The two
	// glowing arcs are the pill's own children, absolutely positioned
	// in the gaps beside it (preview) — NOT a decoration above it.
	const pill = (
		<div className="sticky-pill">
			{arcs}
			<button
				type="button"
				className="pill-menu-btn pill-hamb-btn"
				onClick={() => setPickerOpen((v) => !v)}
				aria-label={pickerOpen ? "Close menu" : "Open menu"}
				aria-expanded={pickerOpen}
			>
				<Menu size={18} />
			</button>
			<button
				type="button"
				className="pill-profile-btn"
				onClick={() => setPickerOpen((v) => !v)}
				aria-label={`Choose a profile — ${displayed.label}`}
			>
				{/* Fixed-width label stack (preview w-40/44/56): both
				    profile labels stay mounted with stable keys; the
				    active one is visible, the previous one slides up
				    and fades out. The pill width NEVER shifts when the
				    label changes, and scrolling never remounts it. */}
				<span className="pill-label-stack" aria-hidden="true">
					{PROFILES.map((p) => {
						const Icon = p.icon;
						const cls =
							p.id === displayedProfile
								? "pill-label-slide active"
								: p.id === prevProfile
									? "pill-label-slide leaving"
									: "pill-label-slide";
						return (
							<span key={p.id} className={cls}>
								<span className="pill-icon">
									<Icon size={16} />
								</span>
								<span className="pill-label-text">
									{p.label}
								</span>
								<span className="pill-dot" />
							</span>
						);
					})}
				</span>
			</button>
			{/* Resume button (preview: teal play button in the pill) — ONLY
			    visible while the label animation is PAUSED. While the
			    animation runs (the default state) it is HIDDEN. */}
			{rotationPaused ? (
				<button
					type="button"
					className="pill-rotate-btn"
					onClick={resumeRotation}
					aria-label="Resume auto-rotation"
					title="Resume auto-rotation"
				>
					<Play size={13} />
				</button>
			) : null}
			<button
				type="button"
				className="pill-menu-btn pill-chev-btn"
				onClick={() => setPickerOpen((v) => !v)}
				aria-label={pickerOpen ? "Close menu" : "Open menu"}
				aria-expanded={pickerOpen}
			>
				<span className="pill-chev">
					<ChevronDown size={14} />
				</span>
			</button>
			<nav className="pill-nav" aria-label="Primary">
				{NAV_LINKS.map((l) => (
					<a key={l.label} href={l.href}>
						{l.label}
					</a>
				))}
			</nav>
			{picker}
		</div>
	);


	return (
		<header className={`site-header${stuck ? " is-stuck" : ""}`}>
			<div className="header-top" aria-hidden={stuck || undefined}>
				{langBtn(stuck)}
				{themeBtn(stuck)}
			</div>
			{langHint ? (
				<p className="lang-hint">Language switching coming soon.</p>
			) : null}
			<div className="pill-stack">
				{pill}
			</div>
			{/* Stuck-row corner buttons: ALWAYS rendered (preview's
			    in-row copies). Unstuck they are collapsed to width 0 +
			    opacity 0; when stuck they expand to full width over
			    350ms, so the normal→sticky transition is one smooth,
			    coordinated move — never an abrupt pop-in. */}
			<div className="stuck-corners" aria-hidden={!stuck || undefined}>
				{langBtn(!stuck)}
				{themeBtn(!stuck)}
			</div>
		</header>
	);
}
