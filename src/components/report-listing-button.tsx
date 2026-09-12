"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPropertyDetailCopy } from "@/i18n/property-detail-copy";
import { useLocale } from "@/i18n/use-locale";
import { createClient } from "@/lib/supabase/client";

const reasonValues = [
  "fake_listing",
  "wrong_location",
  "unavailable",
  "scam_suspicion",
  "discrimination",
  "inappropriate_content",
  "duplicate",
  "other",
] as const;

type ReportReason = (typeof reasonValues)[number];

export function ReportListingButton({ propertyId, userId, signInHref }: { propertyId: string; userId: string | null; signInHref?: string }) {
  const { locale } = useLocale();
  const copy = getPropertyDetailCopy(locale).report;
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("fake_listing");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!userId) {
    return <Link className="text-link trust-report-link" href={signInHref ?? `/login?next=${encodeURIComponent(`/homes/${propertyId}#trust`)}`}>{copy.signIn}</Link>;
  }

  async function submitReport() {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from("listing_reports").insert({
      property_id: propertyId,
      reporter_id: userId,
      reason,
      details: details.trim() || null,
    });

    if (error) {
      setMessage(error.code === "23505" ? copy.duplicate : copy.failed);
      setBusy(false);
      return;
    }

    setMessage(copy.success);
    setBusy(false);
    setOpen(false);
  }

  return (
    <div className="trust-report-control">
      <button className="text-button" type="button" onClick={() => setOpen((value) => !value)}>{open ? copy.cancel : copy.report}</button>
      {open && (
        <div className="trust-report-form">
          <label className="field">{copy.reason}
            <select value={reason} onChange={(event) => setReason(event.target.value as ReportReason)}>
              {reasonValues.map((value) => <option value={value} key={value}>{copy.reasons[value]}</option>)}
            </select>
          </label>
          <label className="field">{copy.details}
            <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} rows={4} placeholder={copy.detailsPlaceholder} />
          </label>
          <button className="secondary-button" type="button" onClick={() => void submitReport()} disabled={busy}>{busy ? copy.submitting : copy.submit}</button>
        </div>
      )}
      {message && <p className="form-hint">{message}</p>}
    </div>
  );
}
