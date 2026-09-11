"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { useLocale } from "@/i18n/use-locale";
import { getSupportCopy, type SupportCategory } from "@/i18n/support-copy";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES: SupportCategory[] = ["account_recovery", "otp_delivery", "data_export", "account_deletion", "safety_abuse", "other"];

export function SupportRequestForm({
  initialCategory = "other",
  context = {},
}: {
  initialCategory?: SupportCategory;
  context?: Record<string, string>;
}) {
  const { locale } = useLocale();
  const copy = getSupportCopy(locale);
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<SupportCategory>(initialCategory);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setReference(null);
    const supabase = createClient() as unknown as SupabaseClient;
    const { data, error } = await supabase.rpc("submit_support_request", {
      request_email: email.trim(),
      request_category: category,
      request_subject: subject.trim(),
      request_details: details.trim(),
      request_context: context,
    });
    if (error) {
      setMessage(error.message || copy.error);
    } else {
      setReference(String(data));
      setSubject("");
      setDetails("");
    }
    setBusy(false);
  }

  return (
    <form className="auth-card support-request-form" onSubmit={submit}>
      <div className="form-grid two-col">
        <label className="field">
          {copy.email}
          <input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="field">
          {copy.category}
          <select value={category} onChange={(event) => setCategory(event.target.value as SupportCategory)}>
            {CATEGORIES.map((value) => <option key={value} value={value}>{copy.categories[value]}</option>)}
          </select>
        </label>
      </div>
      <label className="field">
        {copy.subject}
        <input required minLength={3} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} />
      </label>
      <label className="field">
        {copy.details}
        <textarea required minLength={10} maxLength={4000} rows={7} value={details} onChange={(event) => setDetails(event.target.value)} />
      </label>
      <p className="form-hint">{copy.detailsHelp}</p>
      {(category === "data_export" || category === "account_deletion") && <p className="review-note">{copy.manual}</p>}
      {message && <div className="auth-message" role="alert">{message}</div>}
      {reference && <div className="success-message" role="status">{copy.sent} <strong>{reference}</strong></div>}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? copy.sending : copy.submit}</button>
    </form>
  );
}
