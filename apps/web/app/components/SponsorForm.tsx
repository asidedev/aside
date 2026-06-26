"use client";

import { useMemo, useState } from "react";

const BUDGETS = [
  "Just exploring",
  "$100 – $500 / mo",
  "$500 – $2,000 / mo",
  "$2,000 – $10,000 / mo",
  "$10,000+ / mo",
];

const AD_MIN = 3;
const AD_MAX = 60;

interface FormState {
  company: string;
  email: string;
  destination_url: string;
  ad_copy: string;
  budget: string;
  geo: string;
  message: string;
}

const EMPTY: FormState = {
  company: "",
  email: "",
  destination_url: "",
  ad_copy: "",
  budget: "",
  geo: "",
  message: "",
};

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
function isHttps(s: string): boolean {
  try {
    return new URL(s.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

export function SponsorForm() {
  const [f, setF] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const adLen = f.ad_copy.trim().length;
  const adBad = adLen > 0 && (adLen < AD_MIN || adLen > AD_MAX);

  const set = (k: keyof FormState) => (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setF((prev) => ({ ...prev, [k]: e.target.value }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!f.email.trim()) e.email = "Contact email is required.";
    else if (!isEmail(f.email)) e.email = "Enter a valid email address.";

    if (f.destination_url.trim() && !isHttps(f.destination_url))
      e.destination_url = "Must be a valid https:// URL.";

    const al = f.ad_copy.trim().length;
    if (f.ad_copy.trim() && (al < AD_MIN || al > AD_MAX))
      e.ad_copy = `Ad line must be ${AD_MIN}–${AD_MAX} characters.`;

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        company: f.company.trim() || null,
        email: f.email.trim(),
        destination_url: f.destination_url.trim() || null,
        ad_copy: f.ad_copy.trim() || null,
        budget: f.budget || null,
        geo: f.geo.trim() || null,
        message: f.message.trim() || null,
      };
      const res = await fetch("/api/sponsor-leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setServerError(
          data.error
            ? `Could not submit: ${data.error}.`
            : "Something went wrong. Please try again.",
        );
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setServerError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const counterClass = useMemo(
    () => "counter" + (adBad ? " bad" : ""),
    [adBad],
  );

  if (done) {
    return (
      <div className="success-panel">
        <div className="check" aria-hidden="true">
          ✓
        </div>
        <h3>Application received.</h3>
        <p>
          Thanks — your details are in. We&apos;re onboarding advertisers in
          waves during early access and will reach out at the email you provided.
        </p>
        <a href="/" className="btn btn-ghost">
          Back to home
        </a>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <div className="field-row">
        <div className="field">
          <label className="lbl" htmlFor="company">
            Company <span className="opt">optional</span>
          </label>
          <input
            id="company"
            className="input"
            type="text"
            value={f.company}
            onChange={set("company")}
            placeholder="Acme Inc."
            maxLength={120}
          />
        </div>
        <div className="field">
          <label className="lbl" htmlFor="email">
            Contact email
          </label>
          <input
            id="email"
            className={"input" + (errors.email ? " invalid" : "")}
            type="email"
            required
            value={f.email}
            onChange={set("email")}
            placeholder="you@company.com"
            aria-invalid={!!errors.email}
          />
          {errors.email && <span className="field-err">{errors.email}</span>}
        </div>
      </div>

      <div className="field">
        <label className="lbl" htmlFor="destination_url">
          Destination URL <span className="opt">https://</span>
        </label>
        <input
          id="destination_url"
          className={"input" + (errors.destination_url ? " invalid" : "")}
          type="url"
          value={f.destination_url}
          onChange={set("destination_url")}
          placeholder="https://your-product.com"
          aria-invalid={!!errors.destination_url}
        />
        {errors.destination_url && (
          <span className="field-err">{errors.destination_url}</span>
        )}
      </div>

      <div className="field">
        <label className="lbl" htmlFor="ad_copy">
          Ad line copy
          <span className={counterClass}>
            {adLen}/{AD_MAX}
          </span>
        </label>
        <input
          id="ad_copy"
          className={"input" + (errors.ad_copy ? " invalid" : "")}
          type="text"
          value={f.ad_copy}
          onChange={set("ad_copy")}
          placeholder="Ship preview deploys on every PR — free."
          maxLength={80}
          aria-invalid={!!errors.ad_copy}
        />
        {errors.ad_copy ? (
          <span className="field-err">{errors.ad_copy}</span>
        ) : (
          <span className="field-err" style={{ color: "var(--text-faint)" }}>
            {AD_MIN}–{AD_MAX} characters. This is the single line developers see.
          </span>
        )}
      </div>

      <div className="field-row">
        <div className="field">
          <label className="lbl" htmlFor="budget">
            Estimated monthly budget <span className="opt">optional</span>
          </label>
          <select
            id="budget"
            className="select"
            value={f.budget}
            onChange={set("budget")}
          >
            <option value="">Select a range…</option>
            {BUDGETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="lbl" htmlFor="geo">
            Target geography <span className="opt">optional</span>
          </label>
          <input
            id="geo"
            className="input"
            type="text"
            value={f.geo}
            onChange={set("geo")}
            placeholder="e.g. US, EU, global"
            maxLength={120}
          />
        </div>
      </div>

      <div className="field">
        <label className="lbl" htmlFor="message">
          Anything else? <span className="opt">optional</span>
        </label>
        <textarea
          id="message"
          className="textarea"
          value={f.message}
          onChange={set("message")}
          placeholder="Tell us about your product and what a good campaign looks like for you."
          maxLength={2000}
        />
      </div>

      {serverError && (
        <div className="form-status error" role="alert">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting}
        style={{ width: "100%", padding: "13px" }}
      >
        {submitting ? "Submitting…" : "Apply for early access"}
      </button>
      <p
        className="field-err"
        style={{ color: "var(--text-faint)", textAlign: "center" }}
      >
        No payment now. We&apos;ll review and reach out. We never share your
        details.
      </p>
    </form>
  );
}
