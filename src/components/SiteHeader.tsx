import { useEffect, useState } from "react";
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

	useEffect(() => {
		const onScroll = () => setStuck(window.scrollY > 24);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	// Scroll restoration: on mount, force the unscrolled header state so
	// a browser-restored scroll position never leaves the header stuck.
	useEffect(() => {
		try {
			if ("scrollRestoration" in history) {
				history.scrollRestoration = "manual";
			}
		} catch {
			/* history API unavailable */
		}
		// Don't yank the page when the URL carries an anchor — the
		// browser still needs to land on it.
		if (!window.location.hash) {
			window.scrollTo(0, 0);
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
	// profile and the interval stays cleared.
	useEffect(() => {
		if (rotationPaused) {
			setDisplayedProfile(current);
			return;
		}
		setDisplayedProfile(current);
		const t = window.setInterval(() => {
			setDisplayedProfile((prev) =>
				prev === "se" ? "knowme" : "se",
			);
		}, LABEL_CYCLE_MS);
		return () => window.clearInterval(t);
	}, [rotationPaused, current]);

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
	// The pill shows the ANIMATED profile (label + icon cycle together);
	// the key replays the 450ms slide+fade on every cycle.
	const displayed =
		PROFILES.find((p) => p.id === displayedProfile) ?? currentProfile;
	const DisplayedIcon = displayed.icon;

	const langBtn = (
		<button
			type="button"
			className="corner-btn"
			onClick={onLangClick}
			aria-label="Switch language (coming soon)"
			title="Language switching coming soon"
		>
			<span className="lang-mobile">{lang === "en" ? "BN" : "EN"}</span>
			<span className="lang-desktop">EN/BN</span>
		</button>
	);

	const themeBtn = (
		<button
			type="button"
			className="corner-btn"
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

	const pill = (
		<div className="sticky-pill">
			<button
				type="button"
				className="pill-menu-btn"
				onClick={() => setPickerOpen((v) => !v)}
				aria-label={pickerOpen ? "Close menu" : "Open menu"}
				aria-expanded={pickerOpen}
			>
				<Menu size={18} />
			</button>
			<button
				type="button"
				className="pill-menu-btn"
				onClick={() => setPickerOpen((v) => !v)}
				aria-label="Choose a profile"
				style={{ gap: 6, display: "inline-flex", alignItems: "center" }}
			>
				<span className="pill-icon" key={`icon-${displayed.id}`}>
					<DisplayedIcon size={16} />
				</span>
				{/* The label cycles between the two profile names while the
				    animation runs (preview: smooth vertical slide + fade,
				    ~450ms ease-in-out). The key replays the animation on
				    every cycle; the page never navigates. */}
				<span
					className="pill-label pill-label-anim"
					key={`label-${displayed.id}`}
				>
					{displayed.label}
				</span>
				<span className="pill-dot" aria-hidden="true" />
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
				className="pill-menu-btn"
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
		</div>
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

	const arcs = (
		<svg
			className="header-arcs"
			viewBox="0 0 200 28"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<path className="arc-base" d="M 2 26 Q 50 2 100 26" />
			<path className="arc-base" d="M 198 26 Q 150 2 100 26" />
			<path
				className="arc-flow"
				d="M 2 26 Q 50 2 100 26"
				pathLength={110}
			/>
			<path
				className="arc-flow"
				d="M 198 26 Q 150 2 100 26"
				pathLength={110}
			/>
		</svg>
	);

	return (
		<header className={`site-header${stuck ? " is-stuck" : ""}`}>
			<div className="header-top">
				{!stuck ? (
					<>
						{langBtn}
						{themeBtn}
					</>
				) : null}
			</div>
			{langHint ? (
				<p className="lang-hint">Language switching coming soon.</p>
			) : null}
			<div className="pill-stack">
				{arcs}
				{pill}
				{picker}
			</div>
			{stuck ? (
				<div className="stuck-corners">
					{langBtn}
					{themeBtn}
				</div>
			) : null}
		</header>
	);
}
