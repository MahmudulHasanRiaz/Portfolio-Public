import { useEffect, useState } from "react";
import {
	ChevronDown,
	Code,
	Menu,
	Moon,
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
	{ label: "Ventures", href: "/#ventures" },
	{ label: "Nasheed", href: "/releases" },
	{ label: "About", href: "/know-me" },
	{ label: "Contact", href: "/#contact" },
];

/**
 * Site header — a profile switcher, not a designation display.
 * Top row (not sticky): language switcher left, theme switcher right.
 * Below it, a sticky compact glass pill (hamburger + profile label +
 * teal dot + chevron) with glowing teal arcs hanging above it.
 * On scroll the header becomes one unified sticky row: the two corner
 * buttons join the pill on the same baseline, at the far edges.
 *
 * Deviation from the React preview (deliberate): the preview auto-rotates
 * the pill between profiles, but in Astro the profiles are real routes
 * (/ and /know-me) — auto-rotating would yank the visitor between pages.
 * So the pill shows the CURRENT profile and the picker switches on tap.
 * There is no "Resume auto-rotation" button for the same reason.
 */
export default function SiteHeader({ current }: { current: ProfileId }) {
	const [stuck, setStuck] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [lang, setLang] = useState<"en" | "bn">("en");
	const [langHint, setLangHint] = useState(false);
	const [theme, setTheme] = useState<"light" | "dark">("light");

	useEffect(() => {
		const onScroll = () => setStuck(window.scrollY > 16);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
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

	const currentProfile =
		PROFILES.find((p) => p.id === current) ?? PROFILES[0]!;
	const CurrentIcon = currentProfile.icon;

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
			{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
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
				style={{ gap: 8, display: "inline-flex", alignItems: "center" }}
			>
				<span className="pill-icon">
					<CurrentIcon size={16} />
				</span>
				<span className="pill-label">{currentProfile.label}</span>
				<span className="pill-dot" aria-hidden="true" />
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
						onClick={() => setPickerOpen(false)}
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
								style={{
									marginLeft: "auto",
									width: 6,
									height: 6,
									borderRadius: "50%",
									background: "var(--accent)",
								}}
								aria-hidden="true"
							/>
						) : null}
					</a>
				);
			})}
			<div
				style={{
					height: 1,
					background: "var(--card-border)",
					margin: "8px 4px",
				}}
			/>
			{NAV_LINKS.map((l) => (
				<a
					key={l.label}
					href={l.href}
					onClick={() => setPickerOpen(false)}
					className="picker-row"
					role="menuitem"
				>
					<span>{l.label}</span>
				</a>
			))}
		</div>
	) : null;

	const arcs = (
		<svg
			className="header-arcs"
			viewBox="0 0 200 28"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<path className="arc-base" d="M 2 2 Q 60 26 100 26" />
			<path className="arc-base" d="M 198 2 Q 140 26 100 26" />
			<path
				className="arc-flow"
				d="M 2 2 Q 60 26 100 26"
				pathLength={110}
			/>
			<path
				className="arc-flow"
				d="M 198 2 Q 140 26 100 26"
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
