import { useEffect, useState } from "react";
import ContactForm from "./ContactForm";

interface OpenContactDetail {
	service?: string;
	source?: string;
}

// Shared contact modal — mounted once per page by the Layout.
// Opens when any CTA dispatches `window.dispatchEvent(new CustomEvent(
// "open-contact", { detail: { service?, source? } }))`.
// Backdrop click, the × button, and Escape all close it.
export default function ContactModal() {
	const [open, setOpen] = useState(false);
	const [service, setService] = useState<string | undefined>(undefined);
	const [source, setSource] = useState<string | undefined>(undefined);

	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<OpenContactDetail>).detail ?? {};
			setService(detail.service);
			setSource(detail.source);
			setOpen(true);
		};
		window.addEventListener("open-contact", handler);
		return () => window.removeEventListener("open-contact", handler);
	}, []);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open ]);

	if (!open) return null;

	return (
		<div
			className="modal-backdrop"
			onClick={() => setOpen(false)}
			role="presentation"
		>
			<div
				className="modal-sheet"
				role="dialog"
				aria-modal="true"
				aria-label="Contact me"
				onClick={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					className="modal-close"
					aria-label="Close"
					onClick={() => setOpen(false)}
				>
					×
				</button>
				<h2>Contact me</h2>
				<p className="modal-sub">Tell me what you need — I reply personally.</p>
				<ContactForm service={service} source={source} />
			</div>
		</div>
	);
}
