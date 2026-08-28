"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

const reasons = [
  ["fake_listing", "Fake or misleading listing"],
  ["wrong_location", "Wrong location"],
  ["unavailable", "Already unavailable"],
  ["scam_suspicion", "Possible scam"],
  ["discrimination", "Discriminatory requirement"],
  ["inappropriate_content", "Inappropriate content"],
  ["duplicate", "Duplicate listing"],
  ["other", "Other"],
] as const;

export function ReportListingButton({ propertyId, userId }: { propertyId: string; userId: string | null }) {
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("fake_listing");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!userId) {
    return <Link className="text-link trust-report-link" href={`/login?next=${encodeURIComponent(`/homes/${propertyId}#trust`)}`}>Sign in to report this listing</Link>;
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
      setMessage(error.code === "23505" ? "You already reported this listing." : error.message);
      setBusy(false);
      return;
    }

    setMessage("Report submitted. A moderator will review it.");
    setBusy(false);
    setOpen(false);
  }

  return (
    <div className="trust-report-control">
      <button className="text-button" type="button" onClick={() => setOpen((value) => !value)}>{open ? "Cancel report" : "Report this listing"}</button>
      {open && (
        <div className="trust-report-form">
          <label className="field">Reason
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              {reasons.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label className="field">Details (optional)
            <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} rows={4} placeholder="Tell the moderator what looks wrong." />
          </label>
          <button className="secondary-button" type="button" onClick={() => void submitReport()} disabled={busy}>{busy ? "Submitting…" : "Submit report"}</button>
        </div>
      )}
      {message && <p className="form-hint">{message}</p>}
    </div>
  );
}
