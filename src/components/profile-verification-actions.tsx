"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export function ProfileVerificationActions({
  targetUserId,
  reviewerId,
  verified,
}: {
  targetUserId: string;
  reviewerId: string;
  verified: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function decide(decision: "verify" | "revoke") {
    if (decision === "revoke" && notes.trim().length < 3) {
      setMessage("Add a short moderator note before revoking this badge.");
      return;
    }

    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from("profile_verification_actions").insert({
      target_user_id: targetUserId,
      reviewer_id: reviewerId,
      decision,
      notes: notes.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    router.push(`/moderation/accounts?notice=${decision === "verify" ? "verified" : "revoked"}`);
    router.refresh();
  }

  return (
    <div className="profile-verification-actions">
      <label className="field">
        Moderator note
        <textarea
          rows={3}
          maxLength={1000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={verified ? "Required when revoking a badge." : "Optional internal context for this review."}
        />
      </label>
      {message && <div className="auth-message">{message}</div>}
      <div className="dashboard-actions">
        {verified ? (
          <button className="secondary-button" type="button" disabled={busy} onClick={() => void decide("revoke")}>
            Revoke badge
          </button>
        ) : (
          <button className="primary-button" type="button" disabled={busy} onClick={() => void decide("verify")}>
            Issue verified badge
          </button>
        )}
      </div>
    </div>
  );
}
