"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export function ModerationDecisionForm({
  propertyId,
  reviewerId,
  nextPropertyId = null,
}: {
  propertyId: string;
  reviewerId: string;
  nextPropertyId?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient() as unknown as SupabaseClient;
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(decision: "approve" | "reject") {
    if (decision === "reject" && notes.trim().length < 3) {
      setMessage("Add a short reason before rejecting the listing.");
      return;
    }

    setBusy(decision);
    setMessage(null);

    const { error } = await supabase.from("property_moderation_actions").insert({
      property_id: propertyId,
      reviewer_id: reviewerId,
      decision,
      notes: notes.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      setBusy(null);
      return;
    }

    const notice = decision === "approve" ? "approved" : "rejected";
    router.replace(nextPropertyId ? `/moderation/${nextPropertyId}?notice=${notice}` : `/moderation?notice=${notice}`);
    router.refresh();
  }

  return (
    <section className="listing-section sticky top-4">
      <div className="section-heading"><span>✓</span><div><h2>Decision</h2><p>Approval publishes immediately. Rejection requires a reason.</p></div></div>
      <label className="field">
        Reviewer notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} maxLength={2000} placeholder="Required when rejecting. Optional when approving." />
      </label>
      {message && <div className="auth-message">{message}</div>}
      <div className="mt-5 grid gap-2">
        <button className="secondary-button" type="button" disabled={busy !== null} onClick={() => void submit("reject")}>
          {busy === "reject" ? "Rejecting…" : "Reject with notes"}
        </button>
        <button className="primary-button" type="button" disabled={busy !== null} onClick={() => void submit("approve")}>
          {busy === "approve" ? "Approving…" : nextPropertyId ? "Approve & next" : "Approve listing"}
        </button>
      </div>
    </section>
  );
}
