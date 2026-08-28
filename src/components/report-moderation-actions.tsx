"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export function ReportModerationActions({ reportId, reviewerId }: { reportId: string; reviewerId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function decide(action: "dismiss" | "resolve" | "hide_listing") {
    if (action === "hide_listing" && notes.trim().length < 3) {
      setMessage("Add a short moderator note before hiding the listing.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from("listing_report_actions").insert({
      report_id: reportId,
      reviewer_id: reviewerId,
      action,
      notes: notes.trim() || null,
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    router.push(`/moderation/reports?notice=${action}`);
    router.refresh();
  }

  return (
    <div className="listing-section">
      <div className="section-heading"><span>!</span><div><h2>Resolve report</h2><p>Decisions are recorded in the audit trail.</p></div></div>
      <label className="field">Moderator notes<textarea rows={5} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Required when hiding a listing." /></label>
      {message && <div className="auth-message">{message}</div>}
      <div className="dashboard-actions">
        <button className="secondary-button" type="button" disabled={busy} onClick={() => void decide("dismiss")}>Dismiss report</button>
        <button className="secondary-button" type="button" disabled={busy} onClick={() => void decide("resolve")}>Resolve</button>
        <button className="primary-button" type="button" disabled={busy} onClick={() => void decide("hide_listing")}>Hide listing</button>
      </div>
    </div>
  );
}
