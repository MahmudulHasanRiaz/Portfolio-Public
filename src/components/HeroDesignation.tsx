import { useEffect, useState } from "react";
import { BookOpen, CodeXml, Megaphone, Mic, Rocket } from "lucide-react";
import { PROFILE } from "../data/site";

const DESIGNATIONS = PROFILE.designations;

// One icon per designation — the icon changes with the word.
const DESIGNATION_ICONS = {
	"Software Engineer": CodeXml,
	Entrepreneur: Rocket,
	"Nasheed Artist": Mic,
	"Hafiz-Alem": BookOpen,
	"Public Figure": Megaphone,
} as const;

// Longest designation — the badge sizer reserves this width so the pill
// never grows/shrinks while typing.
const LONGEST_DESIGNATION = DESIGNATIONS.reduce((a, b) =>
	a.length >= b.length ? a : b,
);

const TYPE_MS = 45;
const EXIT_MS = 300;

// SE profile: "Software Engineer" holds ~4.5s, the other four ~1.45s each.
// Know Me profile: all five cycle equally (~2.2s each).
function holdMs(profile: "se" | "knowme", index: number): number {
	if (profile === "knowme") return 2200;
	return index === 0 ? 4500 : 1450;
}

export default function HeroDesignation({
	profile,
}: {
	profile: "se" | "knowme";
}) {
	const [index, setIndex] = useState(0);
	// First paint shows the FULL first designation (SSR HTML contains the
	// complete word) — never an empty pill with just an icon + cursor.
	// The typing cycle still runs for every word after the first hold.
	const [shown, setShown] = useState(DESIGNATIONS[0].length);
	const [exiting, setExiting] = useState(false);
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduced(mq.matches);
		const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);

	useEffect(() => {
		if (reduced) return;
		const word = DESIGNATIONS[index] ?? DESIGNATIONS[0];
		if (exiting) {
			// Clean exit (fade + slide up, ~300ms) — no backspacing.
			const timer = window.setTimeout(() => {
				setIndex((i) => (i + 1) % DESIGNATIONS.length);
				setShown(0);
				setExiting(false);
			}, EXIT_MS);
			return () => window.clearTimeout(timer);
		}
		if (shown < word.length) {
			const timer = window.setTimeout(
				() => setShown((s) => s + 1),
				TYPE_MS,
			);
			return () => window.clearTimeout(timer);
		}
		const timer = window.setTimeout(
			() => setExiting(true),
			holdMs(profile, index),
		);
		return () => window.clearTimeout(timer);
	}, [reduced, index, shown, exiting, profile]);

	const word = DESIGNATIONS[index] ?? DESIGNATIONS[0];
	const Icon = DESIGNATION_ICONS[word];
	const LongestIcon = DESIGNATION_ICONS[LONGEST_DESIGNATION];

	// Reduced motion: first designation, static — no typing, no cursor.
	if (reduced) {
		return (
			<>
				<span className="hero-badge" aria-hidden="true">
					<span className="badge-sizer">
						<span className="badge-icon">
							<LongestIcon size={14} />
						</span>
						<span>{LONGEST_DESIGNATION}</span>
					</span>
					<span className="badge-visible">
						<span className="badge-icon">
							<Icon size={14} />
						</span>
						<span>{DESIGNATIONS[0]}</span>
					</span>
				</span>
				<span className="sr-only">{DESIGNATIONS.join(", ")}</span>
			</>
		);
	}

	const letters = word.slice(0, shown).split("");

	return (
		<>
			{/* Per-letter entrance + clean word exit. glass.css has no keyframes
			    for these, so they live here, scoped to this island. */}
			<style>{`@keyframes badge-letter-in { from { opacity: 0; transform: translateY(6px); filter: blur(2px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
@keyframes badge-word-exit { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-6px); } }`}</style>
			<span className="hero-badge" aria-hidden="true">
				{/* Invisible sizer (longest designation + cursor replica)
				    reserves the badge width so it never grows/shrinks
				    while typing; the live word is centered over it. */}
				<span className="badge-sizer">
					<span className="badge-icon">
						<LongestIcon size={14} />
					</span>
					<span>{LONGEST_DESIGNATION}</span>
					<span className="badge-cursor" />
				</span>
				<span className="badge-visible">
					<span className="badge-icon">
						<Icon size={14} />
					</span>
					<span
						style={
							exiting
								? { animation: "badge-word-exit 300ms ease forwards" }
								: undefined
						}
					>
						{letters.map((ch, i) => (
							<span
								key={i}
								style={{
									display: "inline-block",
									animation:
										"badge-letter-in 300ms cubic-bezier(0.22,1,0.36,1) both",
								}}
							>
								{ch === " " ? " " : ch}
							</span>
						))}
					</span>
					{!exiting && <span className="badge-cursor" />}
				</span>
			</span>
			{/* SEO: every designation in the DOM. The visible badge above is
			    aria-hidden; this list is the accessible text, and the
			    non-active designations are additionally present as
			    visually hidden spans. */}
			<span className="sr-only">{DESIGNATIONS.join(", ")}</span>
			{DESIGNATIONS.map((d, i) =>
				i === index ? null : (
					<span key={d} className="sr-only" aria-hidden="true">
						{d}
					</span>
				),
			)}
		</>
	);
}
