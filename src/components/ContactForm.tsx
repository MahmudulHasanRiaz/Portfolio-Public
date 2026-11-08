import { useEffect, useState, type FormEvent } from "react";
import { PROFILE, SERVICES } from "../data/site";
import { leadPayload, validateLead, type LeadError } from "../lib/lead";

interface ContactFormProps {
	service?: string;
	source?: string;
	/** Render the bare form (used by the Contact section) — no modal chrome. */
	inline?: boolean;
}

// The ONE shared contact form — used by the modal and inline in Contact.
// Validation is the exact contract in src/lib/lead.ts: Name required;
// Email OR Phone — at least one mandatory; BD phone + email format checks.
// Layout, labels and placeholders match the React preview exactly:
// "Your name *" / Email + Phone side by side / "Service (optional)" /
// "Message (optional)" + a big full-width teal "Send message" button.
// The "Prefer email?" line renders under the INLINE form only — the
// preview's modal has no such line.
export default function ContactForm({ service, source, inline = false }: ContactFormProps) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [selectedService, setSelectedService] = useState(service ?? "");
	const [message, setMessage] = useState("");
	const [errors, setErrors] = useState<LeadError[]>([]);
	const [submitted, setSubmitted] = useState(false);

	// The modal re-opens with a different pre-selected service — follow it.
	useEffect(() => {
		setSelectedService(service ?? "");
	}, [service]);

	const errorFor = (field: LeadError["field"]) =>
		errors.find((e) => e.field === field)?.message;

	const resetForm = () => {
		setName("");
		setEmail("");
		setPhone("");
		setSelectedService(service ?? "");
		setMessage("");
		setErrors([]);
		setSubmitted(false);
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const found = validateLead({
			name,
			email,
			phone,
			service: selectedService,
			message,
			source,
		});
		setErrors(found);
		if (found.length > 0) return;

		const payload = leadPayload({
			name,
			email,
			phone,
			service: selectedService,
			message,
			source,
		});

		// TODO: POST /api/leads — there is no leads endpoint yet. When the
		// real leads endpoint lands with the Public Content API work, POST
		// this payload there instead of showing success client-side only.
		// Until then: validate and show success. Never fake a submission.
		void payload;
		setSubmitted(true);
	};

	if (submitted) {
		return (
			<div className="form-success">
				<h3>Thanks — I&rsquo;ll get back to you soon.</h3>
				<p>I reply personally to every message.</p>
				<button type="button" className="btn btn-ghost" onClick={resetForm}>
					Send another message
				</button>
				{inline ? (
					<p className="form-prefer-email">
						Prefer email? Write to me at{" "}
						<a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
					</p>
				) : null}
			</div>
		);
	}

	// The "Prefer email?" fallback lives under the inline (Contact
	// section) form only — the preview's modal has no such line.
	const preferEmail = inline ? (
		<p className="form-prefer-email">
			Prefer email? Write to me at{" "}
			<a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
		</p>
	) : null;

	return (
		<>
		<form onSubmit={handleSubmit} data-inline={inline ? "true" : undefined} noValidate>
			<div className="form-field">
				<label htmlFor="contact-name">
					Your name <span className="req">*</span>
				</label>
				<input
					id="contact-name"
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					autoComplete="name"
					placeholder="Your full name"
				/>
				{errorFor("name") && <p className="form-error">{errorFor("name")}</p>}
			</div>

			<div className="form-row-2">
				<div className="form-field">
					<label htmlFor="contact-email">Email</label>
					<input
						id="contact-email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						autoComplete="email"
						placeholder="you@example.com"
					/>
					{errorFor("email") && <p className="form-error">{errorFor("email")}</p>}
				</div>

				<div className="form-field">
					<label htmlFor="contact-phone">Phone</label>
					<input
						id="contact-phone"
						type="tel"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
						autoComplete="tel"
						placeholder="01XXXXXXXXX"
					/>
					{errorFor("phone") && <p className="form-error">{errorFor("phone")}</p>}
				</div>
			</div>

			<p className="form-hint">Give at least one — email or phone — so I can reply. The other is optional.</p>
			{errorFor("contact") && <p className="form-error">{errorFor("contact")}</p>}

			<div className="form-field">
				<label htmlFor="contact-service">
					Service <span style={{ fontWeight: 400, color: "var(--ink-dim)" }}>(optional)</span>
				</label>
				<select
					id="contact-service"
					value={selectedService}
					onChange={(e) => setSelectedService(e.target.value)}
				>
					<option value="">Select a service...</option>
					{SERVICES.map((s) => (
						<option key={s.slug} value={s.name}>
							{s.name}
						</option>
					))}
				</select>
				{service ? (
					<p className="form-hint">
						Already selected based on what you were viewing — feel free to change it.
					</p>
				) : null}
			</div>

			<div className="form-field">
				<label htmlFor="contact-message">
					Message <span style={{ fontWeight: 400, color: "var(--ink-dim)" }}>(optional)</span>
				</label>
				<textarea
					id="contact-message"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="Tell me a little about what you need..."
				/>
			</div>

			<div className="form-field">
				<button type="submit" className="btn btn-submit-full">
					Send message
				</button>
			</div>
		</form>
		{preferEmail}
		</>
	);
}
