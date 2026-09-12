"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getModerationCopy } from "@/i18n/moderation-copy";
import { useLocale } from "@/i18n/use-locale";
import { createClient } from "@/lib/supabase/client";

export function ModerationDecisionForm({ propertyId, reviewerId, nextPropertyId = null }: { propertyId: string; reviewerId: string; nextPropertyId?: string | null }) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = getModerationCopy(locale).decision;
  const supabase = createClient() as unknown as SupabaseClient;
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(decision: "approve" | "reject") {
    if (decision === "reject" && notes.trim().length < 3) { setMessage(copy.requireReject); return; }
    setBusy(decision);
    setMessage(null);
    const { error } = await supabase.from("property_moderation_actions").insert({ property_id: propertyId, reviewer_id: reviewerId, decision, notes: notes.trim() || null });
    if (error) { setMessage(error.message); setBusy(null); return; }
    const notice = decision === "approve" ? "approved" : "rejected";
    router.replace(nextPropertyId ? `/moderation/${nextPropertyId}?notice=${notice}` : `/moderation?notice=${notice}`);
    router.refresh();
  }

  return (
    <section className="listing-section sticky top-4">
      <div className="section-heading"><span>✓</span><div><h2>{copy.title}</h2><p>{copy.hint}</p></div></div>
      <label className="field">{copy.notes}<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} maxLength={2000} placeholder={copy.placeholder} /></label>
      {message && <div className="auth-message">{message}</div>}
      <div className="mt-5 grid gap-2">
        <button className="secondary-button" type="button" disabled={busy !== null} onClick={() => void submit("reject")}>{busy === "reject" ? copy.rejecting : copy.reject}</button>
        <button className="primary-button" type="button" disabled={busy !== null} onClick={() => void submit("approve")}>{busy === "approve" ? copy.approving : nextPropertyId ? copy.approveNext : copy.approve}</button>
      </div>
    </section>
  );
}
