import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Projects carousel — stacked deck ported from the approved React preview.
// The page renders the section wrapper (heading + "View all projects →");
// this island renders the deck, the indicator row and (mobile only) the
// flip controls. No auto-rotation: slides change only on user action.
//
// MOBILE (< 1024px): single-card carousel, one at a time, page-flip.
// DESKTOP (>= 1024px): 3-per-row grid, all projects visible, staggered
// reveal entrance + hover lift — no one-at-a-time flip, no dots/chevrons.

export interface CarouselProject {
	slug: string;
	title: string;
	description: string;
	tags: string[];
	techs: string[];
	thumbnail?: string | null;
	thumbnailType?: string | null;
}

interface Props {
	projects: CarouselProject[];
}

const SWIPE_THRESHOLD = 28;
// Page-flip (preview): one 0.52s turn around the LEFT edge (the spine),
// rotateY 0 → -104deg, opacity 1 → 0.2, on a soft paper ease.
const FLIP_MS = 520;
const FLIP_EASE = "cubic-bezier(0.35, 0.55, 0.35, 1)";
const PEEK_COUNT = 3;
const DESKTOP_QUERY = "(min-width: 1024px)";

export default function ProjectsCarousel({ projects }: Props) {
	const [index, setIndex] = useState(0);
	const [leaving, setLeaving] = useState<1 | -1 | null>(null);
	const [entering, setEntering] = useState(false);
	const [reducedMotion, setReducedMotion] = useState(false);
	const [isDesktop, setIsDesktop] = useState(false);
	const timer = useRef<number | null>(null);
	const raf1 = useRef<number | null>(null);
	const raf2 = useRef<number | null>(null);
	const dragStart = useRef<{ x: number; y: number } | null>(null);
	const suppressClick = useRef(false);

	const count = projects.length;
	const current = projects[index];
	const flipping = leaving !== null || entering;

	useEffect(() => {
		const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReducedMotion(motionMq.matches);
		const onMotionChange = (e: MediaQueryListEvent) =>
			setReducedMotion(e.matches);
		motionMq.addEventListener("change", onMotionChange);

		const desktopMq = window.matchMedia(DESKTOP_QUERY);
		setIsDesktop(desktopMq.matches);
		const onDesktopChange = (e: MediaQueryListEvent) =>
			setIsDesktop(e.matches);
		desktopMq.addEventListener("change", onDesktopChange);

		return () => {
			motionMq.removeEventListener("change", onMotionChange);
			desktopMq.removeEventListener("change", onDesktopChange);
		};
	}, []);

	useEffect(
		() => () => {
			if (timer.current !== null) window.clearTimeout(timer.current);
			if (raf1.current !== null) window.cancelAnimationFrame(raf1.current);
			if (raf2.current !== null) window.cancelAnimationFrame(raf2.current);
		},
		[],
	);

	const moveTo = useCallback(
		(target: number, dir: 1 | -1) => {
			if (count <= 1 || leaving !== null || entering) return;
			const next = (target + count) % count;
			if (next === index) return;
			if (reducedMotion) {
				setIndex(next);
				return;
			}
			// Page-flip, two beats around the LEFT edge (the spine).
			// Beat 1: the outgoing card turns away, rotateY 0 → -104deg,
			// opacity 1 → 0.2, over 0.52s. The peek pages fade out while
			// the card is turning, so no second image can ghost through
			// the fading card (no cross-fade / double exposure).
			setLeaving(dir);
			timer.current = window.setTimeout(() => {
				// Beat 2: swap the content while the card is edge-on,
				// then turn the incoming card in from the same edge.
				// The incoming card is painted at -104deg first (double
				// rAF guarantees a paint), then the transition carries it
				// to flat — a real entrance, not a silent swap.
				setIndex(next);
				setLeaving(null);
				setEntering(true);
				raf1.current = window.requestAnimationFrame(() => {
					raf2.current = window.requestAnimationFrame(() => {
						setEntering(false);
					});
				});
			}, FLIP_MS);
		},
		[count, index, leaving, entering, reducedMotion],
	);

	const go = useCallback(
		(dir: 1 | -1) => moveTo(index + dir, dir),
		[index, moveTo],
	);

	const goTo = useCallback(
		(target: number) => moveTo(target, target > index ? 1 : -1),
		[index, moveTo],
	);

	// Swipe: pointer events for mouse/pen, touch events for touch.
	// Pointer events are ignored for touch so a swipe never fires twice.
	const onPointerDown = (e: React.PointerEvent) => {
		if (e.pointerType === "touch") return;
		dragStart.current = { x: e.clientX, y: e.clientY };
	};

	const onPointerUp = (e: React.PointerEvent) => {
		if (e.pointerType === "touch" || !dragStart.current) return;
		const dx = e.clientX - dragStart.current.x;
		dragStart.current = null;
		if (Math.abs(dx) >= SWIPE_THRESHOLD) {
			suppressClick.current = true;
			go(dx < 0 ? 1 : -1);
		}
	};

	const onTouchStart = (e: React.TouchEvent) => {
		const touch = e.touches[0];
		if (touch) dragStart.current = { x: touch.clientX, y: touch.clientY };
	};

	const onTouchEnd = (e: React.TouchEvent) => {
		const touch = e.changedTouches[0];
		if (!touch || !dragStart.current) return;
		const dx = touch.clientX - dragStart.current.x;
		dragStart.current = null;
		if (Math.abs(dx) >= SWIPE_THRESHOLD) {
			suppressClick.current = true;
			go(dx < 0 ? 1 : -1);
		}
	};

	const onClickCapture = (e: React.MouseEvent) => {
		if (suppressClick.current) {
			e.preventDefault();
			e.stopPropagation();
			suppressClick.current = false;
		}
	};

	if (count === 0 || !current) {
		return <p className="empty-state">No projects published yet.</p>;
	}

	// DESKTOP: 3-per-row grid with a staggered fade+rise reveal.
	// No carousel, no dots, no chevrons — every project is visible.
	if (isDesktop) {
		return (
			<div className="projects-grid">
				{projects.map((project, i) => (
					<a
						key={project.slug}
						className="grid-card projects-grid-card"
						href={`/projects/${project.slug}`}
						style={{ animationDelay: `${i * 80}ms` }}
					>
						<div className="grid-thumb">
							{project.thumbnail ? (
								<img
									src={project.thumbnail}
									alt={project.title}
									loading="lazy"
								/>
							) : (
								<span className="thumb-fallback" aria-hidden="true">
									{project.title.charAt(0)}
								</span>
							)}
						</div>
						<div className="grid-body">
							<h3>{project.title}</h3>
							<p>{project.description}</p>
							{project.tags.length > 0 && (
								<div className="tag-row">
									{project.tags.map((tag) => (
										<span key={tag} className="tag">
											{tag}
										</span>
									))}
								</div>
							)}
						</div>
					</a>
				))}
			</div>
		);
	}

	// MOBILE: single-card carousel with the page-flip.
	return (
		<div className="projects-carousel">
			<div
				className={`deck${flipping ? " deck--flipping" : ""}`}
				role="region"
				aria-roledescription="carousel"
				aria-label="Projects"
				style={{ touchAction: "pan-y" }}
				onPointerDown={onPointerDown}
				onPointerUp={onPointerUp}
				onPointerCancel={() => {
					dragStart.current = null;
				}}
				onTouchStart={onTouchStart}
				onTouchEnd={onTouchEnd}
				onClickCapture={onClickCapture}
			>
				{[1, 2, 3].map((depth) => {
					if (count <= depth) return null;
					const peek = projects[(index + depth) % count];
					if (!peek) return null;
					// Stacked pages, left → right: every page behind the
					// main card pivots on the LEFT edge (the spine) and
					// steps further RIGHT and slightly down, so the pages
					// fan out to the right in a clear left-to-right
					// progression. Each peek is a real page edge — 20px
					// right per depth, rotated off the spine — with the
					// next project's thumbnail faintly visible on it,
					// never a 10px sliver.
					return (
						<div
							key={`${peek.slug}-${depth}`}
							className="deck-peek"
							aria-hidden="true"
							style={{
								transform: `translate(${depth * 20}px, ${depth * 9}px) rotate(${depth * 2}deg)`,
								transformOrigin: "left center",
								opacity: 1 - depth * 0.18,
								zIndex: PEEK_COUNT - depth,
							}}
						>
							{peek.thumbnail ? (
								<div
									className="deck-peek-thumb"
									style={{
										backgroundImage: `url(${peek.thumbnail})`,
									}}
								/>
							) : (
								<div className="deck-peek-thumb deck-peek-thumb--empty" />
							)}
							<div className="deck-peek-lines" aria-hidden="true">
								<span className="deck-peek-line deck-peek-line--title" />
								<span className="deck-peek-line" />
								<span className="deck-peek-line deck-peek-line--short" />
							</div>
						</div>
					);
				})}
				<a
					className="deck-card"
					href={`/projects/${current.slug}`}
					style={{
						zIndex: 10,
						transformStyle: "preserve-3d",
						transformOrigin: "left center",
						backfaceVisibility: "hidden",
						transition: `transform ${FLIP_MS}ms ${FLIP_EASE}, opacity ${FLIP_MS}ms ${FLIP_EASE}`,
						...(leaving !== null || entering
							? {
									transform: "rotateY(-104deg)",
									opacity: 0.2,
								}
							: {}),
					}}
				>
					<div className="deck-thumb">
						{current.thumbnail ? (
							<img src={current.thumbnail} alt={current.title} loading="lazy" />
						) : (
							<span className="thumb-fallback" aria-hidden="true">
								{current.title.charAt(0)}
							</span>
						)}
					</div>
					<div className="deck-body">
						<h3>{current.title}</h3>
						<p>{current.description}</p>
						{current.tags.length > 0 && (
							<div className="tag-row">
								{current.tags.map((tag) => (
									<span key={tag} className="tag">
										{tag}
									</span>
								))}
							</div>
						)}
					</div>
				</a>
			</div>

			<div className="deck-indicator">
				<span className="deck-indicator-spacer" aria-hidden="true" />
				<div className="deck-indicator-center">
					<div className="deck-dots">
						{projects.map((project, i) => (
							<button
								key={project.slug}
								type="button"
								className={`deck-dot${i === index ? " active" : ""}`}
								onClick={() => goTo(i)}
								aria-label={`Show ${project.title}`}
								aria-current={i === index}
							/>
						))}
					</div>
					<span className="deck-counter">
						{index + 1} of {count} — {current.title}
					</span>
				</div>
				<div className="deck-nav">
					<button
						type="button"
						className="chev-btn"
						onClick={() => go(-1)}
						disabled={count <= 1}
						aria-label="Previous project"
					>
						<ChevronLeft size={18} />
					</button>
					<button
						type="button"
						className="chev-btn"
						onClick={() => go(1)}
						disabled={count <= 1}
						aria-label="Next project"
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>
		</div>
	);
}
