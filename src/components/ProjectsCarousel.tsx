import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Projects carousel — stacked deck ported from the approved React preview.
// The page renders the section wrapper (heading + "View all projects →");
// this island renders only the flip controls, the deck and the indicator.
// No auto-rotation: slides change only on user action.

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
const FLIP_MS = 220;
const PEEK_COUNT = 3;

export default function ProjectsCarousel({ projects }: Props) {
	const [index, setIndex] = useState(0);
	const [leaving, setLeaving] = useState<1 | -1 | null>(null);
	const [reducedMotion, setReducedMotion] = useState(false);
	const timer = useRef<number | null>(null);
	const dragStart = useRef<{ x: number; y: number } | null>(null);
	const suppressClick = useRef(false);

	const count = projects.length;
	const current = projects[index];

	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReducedMotion(mq.matches);
		const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);

	useEffect(
		() => () => {
			if (timer.current !== null) window.clearTimeout(timer.current);
		},
		[],
	);

	const moveTo = useCallback(
		(target: number, dir: 1 | -1) => {
			if (count <= 1 || leaving !== null) return;
			const next = (target + count) % count;
			if (next === index) return;
			if (reducedMotion) {
				setIndex(next);
				return;
			}
			setLeaving(dir);
			timer.current = window.setTimeout(() => {
				setIndex(next);
				setLeaving(null);
			}, FLIP_MS);
		},
		[count, index, leaving, reducedMotion],
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

	return (
		<div>
			<div className="flip-row">
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

			<div
				className="deck"
				role="region"
				aria-roledescription="carousel"
				aria-label="Projects"
				style={{ touchAction: "pan-y", marginBottom: 32 }}
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
					return (
						<div
							key={`${peek.slug}-${depth}`}
							className="deck-peek"
							aria-hidden="true"
							style={{
								transform: `translate(${depth * 7}px, ${depth * 9}px) rotate(${depth * 1.2}deg)`,
								opacity: 1 - depth * 0.28,
								zIndex: PEEK_COUNT - depth,
							}}
						/>
					);
				})}
				<a
					className="deck-card"
					href={`/projects/${current.slug}`}
					style={{
						zIndex: 10,
						transition: `transform ${FLIP_MS}ms ease, opacity ${FLIP_MS}ms ease`,
						...(leaving !== null
							? {
									transform: `translateX(${leaving * 48}px) rotate(${leaving * 5}deg)`,
									opacity: 0,
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
		</div>
	);
}
