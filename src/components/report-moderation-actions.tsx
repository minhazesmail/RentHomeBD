"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getModerationCopy } from "@/i18n/moderation-copy";
import { useLocale } from "@/i18n/use-locale";
import { createClient } from "@/lib/supabase/client";

export function ReportModerationActions({ reportId, reviewerId, nextReportId = null }: { reportId: string; reviewerId: string; nextReportId?: string | null }) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = getModerationCopy(locale).reportActions;
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function decide(action: "dismiss" | "resolve" | "hide_listing") {
    if (action === "hide_listing" && notes.trim().length < 3) {
      setMessage(copy.requireHide);
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from("listing_report_actions").insert({ report_id: reportId, reviewer_id: reviewerId, action, notes: notes.trim() || null });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    router.push(nextReportId ? `/moderation/reports/${nextReportId}?notice=${action}` : `/moderation/reports?notice=${action}`);
    router.refresh();
  }

  return (
    <div className="listing-section">
      <div className="section-heading"><span>!</span><div><h2>{copy.title}</h2><p>{copy.hint}</p></div></div>
      <label className="field">{copy.notes}<textarea rows={5} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={copy.placeholder} /></label>
      {message && <div className="auth-message">{message}</div>}
      <div className="dashboard-actions">
        <button className="secondary-button" type="button" disabled={busy} onClick={() => void decide("dismiss")}>{copy.dismiss}</button>
        <button className="secondary-button" type="button" disabled={busy} onClick={() => void decide("resolve")}>{nextReportId ? copy.resolveNext : copy.resolve}</button>
        <button className="primary-button" type="button" disabled={busy} onClick={() => void decide("hide_listing")}>{nextReportId ? copy.hideNext : copy.hide}</button>
      </div>
    </div>
  );
}
