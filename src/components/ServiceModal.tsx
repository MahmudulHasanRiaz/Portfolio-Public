import { useEffect, useRef, useState } from "react";
import { SERVICES, simpleIconsUrl, type Service } from "../data/site";
import { lockBodyScroll, unlockBodyScroll } from "../lib/scrollLock";
import type { ServiceModalDict, Lang } from "../lib/i18n";

interface OpenServiceDetail {
	slug?: string;
}

// Service detail modal — mounted once per page by Services.astro.
// Opens when a service card dispatches `window.dispatchEvent(
// new CustomEvent("open-service", { detail: { slug } }))`.
// Shows the service's existing description (no invented copy) plus a
// "Contact about this service" CTA, which closes this modal and opens
// the shared contact modal with the service pre-selected.
// Chrome matches the contact modal exactly: same .modal-backdrop /
// .modal-sheet classes (bottom sheet on mobile, centred from 640px),
// backdrop click, the × button, and Escape all close it.
//
// SCROLL STABILITY (worker H, 2026-11-08): same fixes as ContactModal
// — the content renders at its final height in the opening frame (no
// one-frame skeleton swap), the shared reference-counted scroll lock
// (src/lib/scrollLock.ts) holds the page locked across the handover
// to the contact modal, the sheet caps at 92dvh, and focus lands on
// the sheet with preventScroll. The handover dispatches "open-contact"
// SYNCHRONOUSLY before this modal closes: the old setTimeout(0) left
// a whole task where the service modal was gone, the page was
// unlocked, and the contact modal was not yet open — the page could
// jump and the mobile toolbar could resize in that gap, and the
// bottom-anchored sheet followed it up and then down.
export default function ServiceModal({
	lang = "en",
	dict,
}: {
	lang?: Lang;
	/** Subset dict only (Issue 7B) — close + contactAboutService + openingContact. */
	dict?: ServiceModalDict;
}) {
	const [open, setOpen] = useState(false);
	const [service, setService] = useState<Service | undefined>(undefined);
	// "Contact about this service" shows a spinner while handing over
	// to the contact modal, so the tap is visibly acknowledged.
	const [openingContact, setOpeningContact] = useState(false);
	const sheetRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<OpenServiceDetail>).detail ?? {};
			const found = SERVICES.find((s) => s.slug === detail.slug);
			if (!found) return;
			setService(found);
			setOpen(true);
		};
		window.addEventListener("open-service", handler);
		return () => window.removeEventListener("open-service", handler);
	}, []);

	useEffect(() => {
		if (!open) return;
		setOpeningContact(false);
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		// Lock the page behind the modal; the cleanup runs on close AND
		// on unmount, so the page never stays locked.
		lockBodyScroll();
		// Land keyboard focus inside the dialog without scrolling
		// anything (the sheet is already fully in view).
		sheetRef.current?.focus({ preventScroll: true });
		return () => {
			window.removeEventListener("keydown", onKey);
			unlockBodyScroll();
		};
	}, [open ]);

	if (!open || !service) return null;

	const openContact = () => {
		if (openingContact) return;
		const name = service.name;
		setOpeningContact(true);
		// Dispatch FIRST, synchronously, then close: both state updates
		// land in the same React commit, so the contact modal opens in
		// the same frame this one closes and the shared scroll lock
		// (reference-counted) never releases the page in between — the
		// two backdrops never stack and the page never jumps.
		window.dispatchEvent(
			new CustomEvent("open-contact", {
				detail: { service: name, source: "services" },
			}),
		);
		setOpen(false);
	};

	return (
		<div
			className="modal-backdrop"
			onClick={() => setOpen(false)}
			role="presentation"
		>
			<div
				ref={sheetRef}
				className="modal-sheet"
				role="dialog"
				aria-modal="true"
				aria-label={service.name}
				tabIndex={-1}
				onClick={(e) => e.stopPropagation()}
				style={{
					// Dynamic viewport height: stable while the mobile
					// toolbar shows/hides (vh would resize the sheet).
					maxHeight: "92dvh",
					// A tall sheet scrolls INSIDE itself; never let
					// that scroll chain out to the page behind it.
					overscrollBehavior: "contain",
				}}
			>
				<button
					type="button"
					className="modal-close"
					aria-label={dict?.close ?? "Close"}
					onClick={() => setOpen(false)}
				>
					×
				</button>
				<span className="service-icon" aria-hidden="true">
					{service.icon ? (
						<img
							src={simpleIconsUrl(service.icon)}
							alt=""
							width={26}
							height={26}
							className={
								service.icon === "wordpress" ? "logo-dark-invert" : undefined
							}
						/>
					) : service.lucide === "Database" ? (
						<svg
							width="26"
							height="26"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<ellipse cx="12" cy="5" rx="9" ry="3" />
							<path d="M3 5v14a9 3 0 0 0 18 0V5" />
							<path d="M3 12a9 3 0 0 0 18 0" />
						</svg>
					) : service.lucide === "Code" ? (
						<svg
							width="26"
							height="26"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<polyline points="16 18 22 12 16 6" />
							<polyline points="8 6 2 12 8 18" />
						</svg>
					) : (
						<svg
							width="26"
							height="26"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
							<polyline points="16 7 22 7 22 13" />
						</svg>
					)}
				</span>
				<h2 style={{ marginTop: "14px" }}>{service.name}</h2>
				<p className="modal-sub" style={{ fontSize: "15px", lineHeight: 1.6 }}>
					{service.description}
				</p>
				<div className="form-field">
					<button
						type="button"
						className="btn btn-submit-full"
						onClick={openContact}
						disabled={openingContact}
						aria-live="polite"
					>
						{openingContact ? (
							<>
								<span className="btn-spinner" aria-hidden="true" />
								{dict?.openingContact ?? "Opening contact…"}
							</>
						) : (
							(dict?.contactAboutService ?? "Contact about this service")
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
