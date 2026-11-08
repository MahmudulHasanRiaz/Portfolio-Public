import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Dices, X } from "lucide-react";
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
// detail card closes, after drag/snap, and after Spin. Only
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

// Constellation lines: barely-there hairlines between neighbouring tags.
const LINE_PAIRS: Array<[number, number]> = [
	[0, 1],
	[5, 6],
	[10, 11],
	[15, 16],
	[20, 21],
	[25, 26],
	[30, 31],
	[35, 36],
];

// Filter cluster: matching techs gather on a small sphere in front.
const CLUSTER_CENTER: Vec = { x: 0, y: 0, z: 0.62 };
const CLUSTER_RADIUS = 0.38;
const LANDING_MS = 1600;

const DUST_SPOTS = [
	{ left: "12%", top: "20%" },
	{ left: "78%", top: "14%" },
	{ left: "88%", top: "62%" },
	{ left: "8%", top: "70%" },
	{ left: "30%", top: "88%" },
	{ left: "64%", top: "90%" },
];

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
	const snapPendingRef = useRef(false);
	const snapAfterInertiaRef = useRef(false);
	const draggingRef = useRef(false);
	const movedRef = useRef(false);
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
				flyToRef.current !== null;

			// Magnetic fly-to-front (tap a tech, or snap after a drag).
			if (flyToRef.current !== null) {
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
				if (Math.abs(deltaY) < 0.01 && Math.abs(deltaX) < 0.01) {
					flyToRef.current = null;
					if (snapPendingRef.current) {
						snapPendingRef.current = false;
						// Resume auto-rotation shortly after the snap.
						resumeAtRef.current = now + 800;
					}
				}
			} else if (!draggingRef.current) {
				// Inertia decay after a drag; then magnetic snap.
				if (Math.abs(vel.x) > 0.0004 || Math.abs(vel.y) > 0.0004) {
					rot.x = Math.max(-1.2, Math.min(1.2, rot.x + vel.x));
					rot.y += vel.y;
					vel.x *= 0.94;
					vel.y *= 0.94;
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
					el.style.left = `${50 + p.x * 42}%`;
					el.style.top = `${50 + p.y * 42}%`;
					el.style.transform = `translate(-50%, -50%) scale(${
						0.72 + 0.28 * depth
					})`;
					el.style.zIndex = String(Math.round(depth * 100));
					el.style.opacity = dimmed ? "" : String(0.5 + 0.5 * depth);
					el.classList.toggle("front", i === frontIdx);
					el.classList.toggle("dimmed", dimmed);
				}
			}

			frontIdxRef.current = frontIdx;
			if (STACK[frontIdx].name !== frontNameRef.current) {
				frontNameRef.current = STACK[frontIdx].name;
				setFrontName(STACK[frontIdx].name);
			}

			// Constellation lines follow their tags.
			for (let k = 0; k < LINE_PAIRS.length; k++) {
				const line = lineRefs.current[k];
				if (!line) continue;
				const [a, b] = LINE_PAIRS[k];
				const pa = cur[a];
				const pb = cur[b];
				line.setAttribute("x1", String(50 + pa.x * 42));
				line.setAttribute("y1", String(50 + pa.y * 42));
				line.setAttribute("x2", String(50 + pb.x * 42));
				line.setAttribute("y2", String(50 + pb.y * 42));
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
		if (selectedRef.current) {
			selectedRef.current = null;
			setSelected(null);
		}
		flyToRef.current = null;
		snapPendingRef.current = false;
		snapAfterInertiaRef.current = false;
		velRef.current.y += 0.22;
		resumeAtRef.current = 0;
	};

	const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
		if (reducedRef.current) return;
		draggingRef.current = true;
		movedRef.current = false;
		lastPointerRef.current = { x: e.clientX, y: e.clientY };
		velRef.current = { x: 0, y: 0 };
		flyToRef.current = null;
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
			x: velRef.current.x * 0.7 + dy * 0.005 * 0.3,
			y: velRef.current.y * 0.7 + dx * 0.005 * 0.3,
		};
	};

	const onPointerUp = () => {
		if (!draggingRef.current) return;
		draggingRef.current = false;
		snapAfterInertiaRef.current = true;
	};

	return (
		<section className="glass section" id="stack">
			<div className="section-head">
				<h2>Stack</h2>
			</div>
			<div className="globe-wrap">
				<style>{`@keyframes dust-drift { from { transform: translate(0, 0); } to { transform: translate(10px, -14px); } }`}</style>
				<div
					className="globe-stage"
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerUp}
					style={{ touchAction: "pan-y", cursor: "grab" }}
				>
					<div className="globe-ball" aria-hidden="true" />
					<div
						className="globe-orbit"
						aria-hidden="true"
						style={{ inset: "-7%", transform: "rotateX(68deg)" }}
					/>
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
								strokeOpacity={0.11}
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
								style={{
									position: "absolute",
									left: spot.left,
									top: spot.top,
									width: 4,
									height: 4,
									borderRadius: "50%",
									background: "var(--ink-faint)",
									opacity: 0.45,
									animation: `dust-drift ${7 + i}s ease-in-out ${
										i * 0.7
									}s infinite alternate`,
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
							onClick={() => handleTap(i)}
							aria-label={`${tech.name} — ${tech.category}`}
						>
							<TechLogo tech={tech} />
							{tech.name}
						</button>
					))}
				</div>
				<p className="globe-now">
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
								{cat}
							</button>
						))}
					</div>
					<button
						type="button"
						className="spin-btn"
						onClick={spin}
					>
						<Dices size={16} />
						Spin
					</button>
				</div>
			</div>
		</section>
	);
}
