import { useEffect, useRef, useState, type PointerEvent } from "react";
import { RotateCw, X } from "lucide-react";
import {
	STACK,
	STACK_CATEGORIES,
	WOOCOMMERCE_W_PATH,
	platformIconSrc,
	type StackTech,
} from "../data/site";

// 3D rotating tag sphere — HTML elements (NOT canvas) so every tech name
// stays in the DOM (SEO). Positions come from a Fibonacci sphere; the globe
// auto-rotates and never stops by default — it resumes within ~2s after a
// detail card closes, after drag/snap, and ~2.6s after Spin. Only
// prefers-reduced-motion stops it (static by design).

interface Vec {
	x: number;
	y: number;
	z: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function fibonacciSphere(n: number): Vec[] {
	const pts: Vec[] = [];
	for (let i = 0; i < n; i++) {
		const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
		const r = Math.sqrt(Math.max(0, 1 - y * y));
		const theta = GOLDEN_ANGLE * i;
		pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
	}
	return pts;
}

function rotatePoint(p: Vec, rotX: number, rotY: number): Vec {
	const cosY = Math.cos(rotY);
	const sinY = Math.sin(rotY);
	const x1 = p.x * cosY + p.z * sinY;
	const z1 = -p.x * sinY + p.z * cosY;
	const cosX = Math.cos(rotX);
	const sinX = Math.sin(rotX);
	const y2 = p.y * cosX - z1 * sinX;
	const z2 = p.y * sinX + z1 * cosX;
	return { x: x1, y: y2, z: z2 };
}

function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Rotation that brings technology i to front-and-center, taking the short
// way from the current Y rotation (nearest equivalent angle).
function frontTarget(i: number, rotY: number): { rx: number; ry: number } {
	const p = BASE_POINTS[i];
	const ryBase = Math.atan2(-p.x, p.z);
	const rx = Math.atan2(p.y, Math.hypot(p.x, p.z));
	let ry = ryBase;
	while (ry - rotY > Math.PI) ry -= Math.PI * 2;
	while (ry - rotY < -Math.PI) ry += Math.PI * 2;
	return { rx, ry };
}

const BASE_POINTS = fibonacciSphere(STACK.length);

// Dark-on-transparent logos that render white in dark mode.
const DARK_INVERT_NAMES = new Set([
	"Next.js",
	"Express.js",
	"Fastify",
	"Rust",
	"Vercel",
	"Prisma",
	"MySQL",
	"CSS",
	"WordPress",
]);

// Category colors (preview): a colored dot in each filter chip, in the
// "Now:" label, and on every tag marks which family a tech belongs to.
const CATEGORY_COLORS: Record<string, string> = {
	Frontend: "#22d3ee",
	Backend: "#2dd4bf",
	Database: "#60a5fa",
	"Cloud & Tools": "#fb923c",
	"CMS & E-commerce": "#c084fc",
	Auth: "#fb7185",
	Concepts: "#9ca3af",
};

// Constellation lines: thin, faint hairlines between related
// technologies — 20 named pairs, resolved to STACK indices once.
const CONSTELLATION_PAIRS: Array<[string, string]> = [
	["Next.js", "React"],
	["React", "TypeScript"],
	["TypeScript", "Tailwind CSS"],
	["Node.js", "Nest.js"],
	["Nest.js", "Express.js"],
	["Express.js", "Fastify"],
	["PostgreSQL", "Prisma"],
	["Prisma", "Drizzle ORM"],
	["PostgreSQL", "MySQL"],
	["WordPress", "WooCommerce"],
	["WooCommerce", "PHP"],
	["Docker", "Vercel"],
	["Vercel", "Cloudflare"],
	["Cloudflare", "DigitalOcean"],
	["Supabase", "PostgreSQL"],
	["Clerk", "Firebase"],
	["Firebase", "Better Auth"],
	["Shopify", "WooCommerce"],
	["Redis", "BullMQ"],
	["S3/R2", "Cloudflare"],
];

const LINE_PAIRS: Array<[number, number]> = CONSTELLATION_PAIRS.flatMap(
	([a, b]) => {
		const ia = STACK.findIndex((t) => t.name === a);
		const ib = STACK.findIndex((t) => t.name === b);
		return ia >= 0 && ib >= 0 ? [[ia, ib] as [number, number]] : [];
	},
);

// Filter cluster: matching techs gather on a small sphere in front.
const CLUSTER_CENTER: Vec = { x: 0, y: 0, z: 0.62 };
const CLUSTER_RADIUS = 0.38;
const LANDING_MS = 1600;
const MAX_VEL = 0.12;
const INERTIA_DECAY = 0.9;

// Ambient dust: 16 deterministic particles (seeded by index, so every
// render and every visitor sees the same calm field — no per-render
// flicker). 8s drift, opacity 0.1–0.26 (see particle-drift in glass.css).
const DUST_SPOTS = Array.from({ length: 16 }, (_, i) => {
	const rnd = (seed: number) => {
		const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
		return v - Math.floor(v);
	};
	return {
		left: `${3 + rnd(i * 3 + 1) * 94}%`,
		top: `${3 + rnd(i * 3 + 2) * 94}%`,
		size: 2 + rnd(i * 3 + 3) * 2.5,
		delay: -rnd(i * 7 + 3) * 8,
	};
});

function TechLogo({ tech }: { tech: StackTech }) {
	if (tech.icon === "woocommerce-w") {
		return (
			<svg
				viewBox="0 0 88 47.5"
				width={14}
				height={8}
				role="img"
				aria-label={tech.name}
			>
				<path d={WOOCOMMERCE_W_PATH} fill="#873EFF" />
			</svg>
		);
	}
	const src = platformIconSrc(tech.icon);
	if (!src) return null;
	return (
		<img
			src={src}
			alt=""
			loading="lazy"
			className={
				DARK_INVERT_NAMES.has(tech.name) ? "logo-dark-invert" : undefined
			}
		/>
	);
}

export default function StackGlobe() {
	const [filter, setFilter] = useState("All");
	const [selected, setSelected] = useState<StackTech | null>(null);
	const [frontName, setFrontName] = useState(STACK[0].name);
	const [reduced, setReduced] = useState(false);

	const tagRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const lineRefs = useRef<Array<SVGLineElement | null>>([]);
	const rotRef = useRef({ x: 0.25, y: 0 });
	const velRef = useRef({ x: 0, y: 0 });
	const curRef = useRef<Vec[]>(BASE_POINTS.map((p) => ({ ...p })));
	const resumeAtRef = useRef(0);
	const landingUntilRef = useRef(0);
	const clusterAngleRef = useRef(0);
	const flyToRef = useRef<number | null>(null);
	const tweenRef = useRef<{
		fx: number;
		fy: number;
		tx: number;
		ty: number;
		start: number;
		dur: number;
	} | null>(null);
	const snapPendingRef = useRef(false);
	const snapAfterInertiaRef = useRef(false);
	const draggingRef = useRef(false);
	const movedRef = useRef(false);
	const downIndexRef = useRef<number | null>(null);
	const lastPointerRef = useRef({ x: 0, y: 0 });
	const frontIdxRef = useRef(0);
	const frontNameRef = useRef(STACK[0].name);
	const filterRef = useRef("All");
	const selectedRef = useRef<StackTech | null>(null);
	const reducedRef = useRef(false);
	const matchingRef = useRef<number[]>([]);
	const clusterBaseRef = useRef<Vec[]>([]);

	reducedRef.current = reduced;

	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setReduced(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);

	useEffect(() => {
		let raf = 0;

		const loop = (now: number) => {
			const rot = rotRef.current;
			const vel = velRef.current;
			const paused =
				selectedRef.current !== null ||
				draggingRef.current ||
				flyToRef.current !== null ||
				tweenRef.current !== null;

			// Spin fly-to (and any tweened move): eased rotation onto the
			// target, then a ~2.6s hold before auto-rotation resumes.
			if (tweenRef.current !== null) {
				const tw = tweenRef.current;
				const t = Math.min(1, (now - tw.start) / tw.dur);
				const e = easeInOutCubic(t);
				rot.x = tw.fx + (tw.tx - tw.fx) * e;
				rot.y = tw.fy + (tw.ty - tw.fy) * e;
				if (t >= 1) {
					tweenRef.current = null;
					resumeAtRef.current = now + 2600;
				}
			} else if (flyToRef.current !== null) {
				// Magnetic fly-to-front (tap a tech, or snap after a drag).
				const target = rotatePoint(
					BASE_POINTS[flyToRef.current],
					rot.x,
					rot.y,
				);
				const deltaY = Math.atan2(target.x, target.z);
				const deltaX = -Math.atan2(
					target.y,
					Math.hypot(target.x, target.z),
				);
				rot.y += deltaY * 0.14;
				rot.x = Math.max(
					-1.2,
					Math.min(1.2, rot.x + deltaX * 0.14),
				);
				// rot.x is clamped to ±1.2: if the target needs more tilt
				// than the clamp allows, the X axis can never converge —
				// treat "pressed against the clamp" as done for X.
				const atLimitX =
					(rot.x <= -1.2 && deltaX < 0) ||
					(rot.x >= 1.2 && deltaX > 0);
				if (
					Math.abs(deltaY) < 0.01 &&
					(Math.abs(deltaX) < 0.01 || atLimitX)
				) {
					flyToRef.current = null;
					if (snapPendingRef.current) {
						snapPendingRef.current = false;
						// Resume auto-rotation shortly after the snap.
						resumeAtRef.current = now + 800;
					}
				}
			} else if (!draggingRef.current) {
				// While a detail card is open the globe holds still:
				// leftover velocity decays fast and is never applied.
				if (selectedRef.current !== null) {
					vel.x *= 0.5;
					vel.y *= 0.5;
					if (Math.abs(vel.x) < 0.0004) vel.x = 0;
					if (Math.abs(vel.y) < 0.0004) vel.y = 0;
				} else if (
					Math.abs(vel.x) > 0.0004 ||
					Math.abs(vel.y) > 0.0004
				) {
					// Inertia decay after a drag; then magnetic snap.
					rot.x = Math.max(-1.2, Math.min(1.2, rot.x + vel.x));
					rot.y += vel.y;
					vel.x *= INERTIA_DECAY;
					vel.y *= INERTIA_DECAY;
				} else if (snapAfterInertiaRef.current) {
					snapAfterInertiaRef.current = false;
					vel.x = 0;
					vel.y = 0;
					flyToRef.current = frontIdxRef.current;
					snapPendingRef.current = true;
				}
			}

			// Auto-rotation: never stops by default, only paused while a
			// card is open, while dragging/flying, or briefly after resume.
			const still =
				Math.abs(vel.x) < 0.0004 && Math.abs(vel.y) < 0.0004;
			if (
				!reducedRef.current &&
				!paused &&
				still &&
				now >= resumeAtRef.current
			) {
				rot.y += 0.0035;
			}

			// Filter cluster: frozen ~1.6s for landing, then it keeps
			// turning as one compact group.
			const filterActive = filterRef.current !== "All";
			const landing = now < landingUntilRef.current;
			if (filterActive && !landing) {
				clusterAngleRef.current += 0.002;
			}

			const matching = matchingRef.current;
			const matchingSet = new Set(matching);
			const clusterBase = clusterBaseRef.current;
			const clusterAngle = clusterAngleRef.current;
			const cur = curRef.current;

			let frontIdx = 0;
			let frontZ = -Infinity;

			for (let i = 0; i < STACK.length; i++) {
				let target: Vec;
				if (filterActive && matchingSet.has(i)) {
					const k = matching.indexOf(i);
					const local = rotatePoint(clusterBase[k], 0, clusterAngle);
					target = {
						x: CLUSTER_CENTER.x + CLUSTER_RADIUS * local.x,
						y: CLUSTER_CENTER.y + CLUSTER_RADIUS * local.y,
						z: CLUSTER_CENTER.z + CLUSTER_RADIUS * local.z,
					};
				} else {
					target = rotatePoint(BASE_POINTS[i], rot.x, rot.y);
				}

				if (landing) {
					// Glide into place during the landing window.
					cur[i].x += (target.x - cur[i].x) * 0.08;
					cur[i].y += (target.y - cur[i].y) * 0.08;
					cur[i].z += (target.z - cur[i].z) * 0.08;
				} else {
					cur[i] = target;
				}

				const p = cur[i];
				if (p.z > frontZ) {
					frontZ = p.z;
					frontIdx = i;
				}

				const el = tagRefs.current[i];
				if (el) {
					const depth = (p.z + 1) / 2;
					const dimmed = filterActive && !matchingSet.has(i);
					// The front tag reads ~24% larger (preview spotlight).
					let scale = 0.6 + 0.4 * depth;
					if (i === frontIdx) scale *= 1.24;
					el.style.left = `${50 + p.x * 38}%`;
					el.style.top = `${50 + p.y * 38}%`;
					el.style.transform = `translate(-50%, -50%) scale(${scale})`;
					el.style.zIndex = String(Math.round(depth * 100));
					el.style.opacity = dimmed ? "" : String(0.3 + 0.7 * depth);
					el.classList.toggle("front", i === frontIdx);
					el.classList.toggle("dimmed", dimmed);
				}
			}

			frontIdxRef.current = frontIdx;
			if (STACK[frontIdx].name !== frontNameRef.current) {
				frontNameRef.current = STACK[frontIdx].name;
				setFrontName(STACK[frontIdx].name);
			}

			// Constellation lines follow their tags, fading with depth
			// (never brighter than 0.32) and with a non-matching filter.
			for (let k = 0; k < LINE_PAIRS.length; k++) {
				const line = lineRefs.current[k];
				if (!line) continue;
				const [a, b] = LINE_PAIRS[k];
				const pa = cur[a];
				const pb = cur[b];
				line.setAttribute("x1", String(50 + pa.x * 38));
				line.setAttribute("y1", String(50 + pa.y * 38));
				line.setAttribute("x2", String(50 + pb.x * 38));
				line.setAttribute("y2", String(50 + pb.y * 38));
				const minDepth = (Math.min(pa.z, pb.z) + 1) / 2;
				let lineOp = 0.32 * Math.pow(Math.max(0, minDepth), 1.4);
				if (
					filterActive &&
					(STACK[a].category !== filterRef.current ||
						STACK[b].category !== filterRef.current)
				) {
					lineOp *= 0.2;
				}
				line.style.opacity = String(lineOp);
			}

			raf = requestAnimationFrame(loop);
		};

		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	}, []);

	const handleTap = (index: number) => {
		// A drag that ends on a tag must not open its card.
		if (movedRef.current) {
			movedRef.current = false;
			return;
		}
		const tech = STACK[index];
		selectedRef.current = tech;
		setSelected(tech);
		if (!reducedRef.current) {
			flyToRef.current = index;
		}
	};

	const closeCard = () => {
		selectedRef.current = null;
		setSelected(null);
		// Rotation resumes within ~2s of closing.
		resumeAtRef.current = performance.now() + 900;
	};

	const applyFilter = (cat: string) => {
		filterRef.current = cat;
		setFilter(cat);
		landingUntilRef.current = performance.now() + LANDING_MS;
		clusterAngleRef.current = 0;
		if (cat === "All") {
			matchingRef.current = [];
			clusterBaseRef.current = [];
		} else {
			const matching = STACK.map((t, i) =>
				t.category === cat ? i : -1,
			).filter((i) => i >= 0);
			matchingRef.current = matching;
			clusterBaseRef.current = fibonacciSphere(matching.length);
		}
		if (selectedRef.current) {
			selectedRef.current = null;
			setSelected(null);
		}
	};

	const spin = () => {
		if (draggingRef.current) return;
		if (selectedRef.current) {
			selectedRef.current = null;
			setSelected(null);
		}
		flyToRef.current = null;
		snapPendingRef.current = false;
		snapAfterInertiaRef.current = false;
		velRef.current = { x: 0, y: 0 };
		// Fly TWO extra full turns onto a RANDOM tech over 1.5s, then
		// hold ~2.6s before auto-rotation resumes (the tween's landing
		// sets resumeAtRef). Repeat taps re-target; velocity never stacks.
		const target = Math.floor(Math.random() * STACK.length);
		if (reducedRef.current) {
			const { rx, ry } = frontTarget(target, rotRef.current.y);
			rotRef.current.x = rx;
			rotRef.current.y = ry;
			resumeAtRef.current = performance.now() + 2600;
			return;
		}
		const { rx, ry } = frontTarget(target, rotRef.current.y);
		tweenRef.current = {
			fx: rotRef.current.x,
			fy: rotRef.current.y,
			tx: rx,
			ty: ry + 2 * Math.PI * 2,
			start: performance.now(),
			dur: 1500,
		};
		resumeAtRef.current = 0;
	};

	const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
		if (reducedRef.current) return;
		draggingRef.current = true;
		movedRef.current = false;
		// Remember which tag (if any) the pointer went down on. A rotating
		// tag can move between pointer-down and click, so the tap target is
		// taken from here, not from the click event.
		const target = (
			e.target as HTMLElement | null
		)?.closest?.("[data-tech]") as HTMLElement | null;
		downIndexRef.current = target
			? Number(target.getAttribute("data-tech"))
			: null;
		lastPointerRef.current = { x: e.clientX, y: e.clientY };
		velRef.current = { x: 0, y: 0 };
		flyToRef.current = null;
		tweenRef.current = null;
		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
		if (!draggingRef.current) return;
		const dx = e.clientX - lastPointerRef.current.x;
		const dy = e.clientY - lastPointerRef.current.y;
		lastPointerRef.current = { x: e.clientX, y: e.clientY };
		if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true;
		rotRef.current.y += dx * 0.005;
		rotRef.current.x = Math.max(
			-1.2,
			Math.min(1.2, rotRef.current.x + dy * 0.005),
		);
		velRef.current = {
			x: Math.max(
				-MAX_VEL,
				Math.min(
					MAX_VEL,
					velRef.current.x * 0.7 + dy * 0.005 * 0.3,
				),
			),
			y: Math.max(
				-MAX_VEL,
				Math.min(
					MAX_VEL,
					velRef.current.y * 0.7 + dx * 0.005 * 0.3,
				),
			),
		};
	};

	const onPointerUp = () => {
		if (!draggingRef.current) return;
		draggingRef.current = false;
		// A tap (no real movement) on a tag opens its card. Pointer-up is
		// used instead of click: a rotating tag can drift between
		// pointer-down and click, so the click lands on the wrong tag.
		if (!movedRef.current && downIndexRef.current !== null) {
			handleTap(downIndexRef.current);
		}
		downIndexRef.current = null;
		snapAfterInertiaRef.current = true;
	};

	const onPointerCancel = () => {
		// Interrupted gesture (browser took over for scroll, etc.): end the
		// drag without opening anything.
		draggingRef.current = false;
		downIndexRef.current = null;
	};

	const frontTech = STACK.find((t) => t.name === frontName);

	return (
		<section className="glass section" id="stack">
			<div className="section-head">
				<h2>Stack</h2>
				<p>
					The tools behind the products above — drag the globe to
					explore them all.
				</p>
			</div>
			<div className="globe-wrap">
				<div
					className="globe-stage"
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerCancel}
					style={{ touchAction: "pan-y", cursor: "grab" }}
				>
					<div className="globe-ball" aria-hidden="true" />
					<div
						className="globe-orbit"
						aria-hidden="true"
						style={{ inset: "-7%" }}
					>
						<span className="globe-satellite" aria-hidden="true" />
					</div>
					<svg
						aria-hidden="true"
						viewBox="0 0 100 100"
						preserveAspectRatio="none"
						style={{
							position: "absolute",
							inset: 0,
							width: "100%",
							height: "100%",
							pointerEvents: "none",
						}}
					>
						{LINE_PAIRS.map(([a, b], k) => (
							<line
								key={`${a}-${b}`}
								ref={(el) => {
									lineRefs.current[k] = el;
								}}
								x1="50"
								y1="50"
								x2="50"
								y2="50"
								stroke="var(--ink)"
								strokeOpacity={1}
								strokeWidth={1}
								vectorEffect="non-scaling-stroke"
							/>
						))}
					</svg>
					{!reduced &&
						DUST_SPOTS.map((spot, i) => (
							<span
								key={i}
								aria-hidden="true"
								className="globe-particle"
								style={{
									position: "absolute",
									left: spot.left,
									top: spot.top,
									width: spot.size,
									height: spot.size,
									borderRadius: "50%",
									background: "var(--accent)",
									animationDelay: `${spot.delay}s`,
								}}
							/>
						))}
					{STACK.map((tech, i) => (
						<button
							key={tech.name}
							type="button"
							ref={(el) => {
								tagRefs.current[i] = el;
							}}
							className="globe-tag"
							data-tech={i}
							onClick={(e) => {
								// Pointer taps open via pointer-up (see
								// onPointerUp); a click with detail 0 is
								// keyboard activation.
								if (e.detail === 0) handleTap(i);
							}}
							aria-label={`${tech.name} — ${tech.category}`}
						>
							<TechLogo tech={tech} />
							{tech.name}
						</button>
					))}
				</div>
				<p className="globe-now">
					<span
						aria-hidden="true"
						className="globe-now-dot"
						style={{
							background:
								(frontTech
									? CATEGORY_COLORS[frontTech.category]
									: undefined) ?? "var(--accent)",
						}}
					/>
					Now: <b>{frontName}</b>
				</p>
				{selected ? (
					<div className="globe-card">
						<button
							type="button"
							onClick={closeCard}
							aria-label="Close"
							style={{
								float: "right",
								background: "transparent",
								border: 0,
								color: "var(--ink-dim)",
								padding: 4,
							}}
						>
							<X size={18} />
						</button>
						<h3>
							<TechLogo tech={selected} />
							{selected.name}
						</h3>
						<p className="globe-cat">{selected.category}</p>
						{selected.use ? (
							<p className="globe-use">{selected.use}</p>
						) : null}
					</div>
				) : null}
				<div
					className="globe-controls"
					style={{ flexWrap: "wrap", justifyContent: "center" }}
				>
					<div
						className="chip-row"
						role="group"
						aria-label="Filter stack by category"
					>
						<button
							type="button"
							className={filter === "All" ? "chip active" : "chip"}
							onClick={() => applyFilter("All")}
						>
							All
						</button>
						{STACK_CATEGORIES.map((cat) => (
							<button
								key={cat}
								type="button"
								className={
									filter === cat ? "chip active" : "chip"
								}
								onClick={() => applyFilter(cat)}
							>
								<span
									aria-hidden="true"
									style={{
										display: "inline-block",
										width: 6,
										height: 6,
										flex: "none",
										borderRadius: "50%",
										background: CATEGORY_COLORS[cat],
										marginRight: 6,
										verticalAlign: "1px",
									}}
								/>
								{cat}
							</button>
						))}
					</div>
					<button
						type="button"
						className="spin-btn"
						onClick={spin}
					>
						<RotateCw size={16} />
						Spin
					</button>
				</div>
			</div>
		</section>
	);
}
