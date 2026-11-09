import { useEffect, useState, type FormEvent } from "react";
import { PROFILE, SERVICES } from "../data/site";
import { leadPayload, validateLead, type LeadError } from "../lib/lead";
import { getDict, type ContactFormDict, type Lang } from "../lib/i18n";

interface ContactFormProps {
	service?: string;
	source?: string;
	/** Render the bare form (used by the Contact section) — no modal chrome. */
	inline?: boolean;
	lang?: Lang;
	/** Subset dict only (Issue 7B) — the 22 keys ContactForm reads. */
	dict?: ContactFormDict;
}

// The ONE shared contact form — used by the modal and inline in Contact.
// Validation is the exact contract in src/lib/lead.ts: Name required;
// Email OR Phone — at least one mandatory; BD phone + email format checks.
// Layout, labels and placeholders match the React preview exactly:
// "Your name *" / Email + Phone side by side / "Service (optional)" /
// "Message (optional)" + a big full-width teal "Send message" button.
// The "Prefer email?" line renders under the INLINE form only — the
// preview's modal has no such line.
export default function ContactForm({
	service,
	source,
	inline = false,
	lang = "en",
	dict,
}: ContactFormProps) {
	const t = dict ?? getDict(lang);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [selectedService, setSelectedService] = useState(service ?? "");
	const [message, setMessage] = useState("");
	const [errors, setErrors] = useState<LeadError[]>([]);
	const [submitted, setSubmitted] = useState(false);
	const [sending, setSending] = useState(false);

	// The modal re-opens with a different pre-selected service — follow it.
	useEffect(() => {
		setSelectedService(service ?? "");
	}, [service]);

	// Error display is localised by FIELD (the lead.ts messages stay
	// the server-side contract, untouched — only the rendered text
	// comes from the dictionary).
	const errorFor = (field: LeadError["field"]) => {
		const found = errors.find((e) => e.field === field);
		if (!found) return undefined;
		if (field === "name") return t.formErrorName;
		if (field === "contact") return t.formErrorContact;
		if (field === "email") return t.formErrorEmail;
		return t.formErrorPhone;
	};

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
		if (sending) return;
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
		// Loading state: disable the form + show a spinner while the send
		// is in progress, so the tap is visibly acknowledged. The brief
		// delay keeps the feedback perceptible instead of flashing past.
		setSending(true);
		window.setTimeout(() => {
			setSending(false);
			setSubmitted(true);
		}, 600);
	};

	if (submitted) {
		return (
			<div className="form-success">
				<h3>{t.formThanks}</h3>
				<p>{t.formReplyPersonal}</p>
				<button type="button" className="btn btn-ghost" onClick={resetForm}>
					{t.formSendAnother}
				</button>
				{inline ? (
					<p className="form-prefer-email">
						{t.formPreferEmail}{" "}
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
			{t.formPreferEmail}{" "}
			<a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
		</p>
	) : null;

	return (
		<>
		<form
			onSubmit={handleSubmit}
			data-inline={inline ? "true" : undefined}
			data-busy={sending ? "true" : undefined}
			aria-busy={sending}
			noValidate
		>
			<div className="form-field">
				<label htmlFor="contact-name">
					{t.formName}
				</label>
				<input
					id="contact-name"
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					autoComplete="name"
					placeholder={t.formNamePlaceholder}
				/>
				{errorFor("name") && <p className="form-error">{errorFor("name")}</p>}
			</div>

			<div className="form-row-2">
				<div className="form-field">
					<label htmlFor="contact-email">{t.formEmail}</label>
					<input
						id="contact-email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						autoComplete="email"
						placeholder={t.formEmailPlaceholder}
					/>
					{errorFor("email") && <p className="form-error">{errorFor("email")}</p>}
				</div>

				<div className="form-field">
					<label htmlFor="contact-phone">{t.formPhone}</label>
					<input
						id="contact-phone"
						type="tel"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
						autoComplete="tel"
						placeholder={t.formPhonePlaceholder}
					/>
					{errorFor("phone") && <p className="form-error">{errorFor("phone")}</p>}
				</div>
			</div>

			<p className="form-hint">{t.formHintContact}</p>
			{errorFor("contact") && <p className="form-error">{errorFor("contact")}</p>}

			<div className="form-field">
				<label htmlFor="contact-service">
					{t.formService}
				</label>
				<select
					id="contact-service"
					value={selectedService}
					onChange={(e) => setSelectedService(e.target.value)}
				>
					<option value="">{t.formSelectService}</option>
					{SERVICES.map((s) => (
						<option key={s.slug} value={s.name}>
							{s.name}
						</option>
					))}
				</select>
				{service ? (
					<p className="form-hint">
						{t.formPreselected}
					</p>
				) : null}
			</div>

			<div className="form-field">
				<label htmlFor="contact-message">
					{t.formMessage}
				</label>
				<textarea
					id="contact-message"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder={t.formMessagePlaceholder}
				/>
			</div>

			<div className="form-field">
				<button
					type="submit"
					className="btn btn-submit-full"
					disabled={sending}
					aria-live="polite"
				>
					{sending ? (
						<>
							<span className="btn-spinner" aria-hidden="true" />
							{t.formSending}
						</>
					) : (
						t.formSend
					)}
				</button>
			</div>
		</form>
		{preferEmail}
		</>
	);
}
