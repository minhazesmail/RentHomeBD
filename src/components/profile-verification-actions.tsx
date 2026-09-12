"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getModerationCopy } from "@/i18n/moderation-copy";
import { useLocale } from "@/i18n/use-locale";
import { createClient } from "@/lib/supabase/client";

export function ProfileVerificationActions({ targetUserId, reviewerId, verified }: { targetUserId: string; reviewerId: string; verified: boolean }) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = getModerationCopy(locale).profileActions;
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isSelf = targetUserId === reviewerId;

  function friendlyVerificationError(message: string) {
    const lower = message.toLowerCase();
    if (lower.includes("cannot verify or revoke verification on their own account")) return copy.selfError;
    if (lower.includes("already verified")) return copy.already;
    if (lower.includes("not currently verified")) return copy.notVerified;
    if (lower.includes("only owner or agent")) return copy.roleOnly;
    if (lower.includes("moderator access required")) return copy.moderatorRequired;
    return copy.generic;
  }

  async function decide(decision: "verify" | "revoke") {
    if (isSelf) { setMessage(copy.selfError); return; }
    if (decision === "revoke" && notes.trim().length < 3) { setMessage(copy.revokeNote); return; }
    setBusy(true); setMessage(null);
    const { error } = await supabase.from("profile_verification_actions").insert({ target_user_id: targetUserId, reviewer_id: reviewerId, decision, notes: notes.trim() || null });
    if (error) { setMessage(friendlyVerificationError(error.message)); setBusy(false); return; }
    router.push(`/moderation/accounts?notice=${decision === "verify" ? "verified" : "revoked"}`);
    router.refresh();
  }

  return (
    <div className="profile-verification-actions">
      <label className="field">{copy.note}<textarea rows={3} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={verified ? copy.revokePlaceholder : copy.verifyPlaceholder} disabled={isSelf} /></label>
      {isSelf && <div className="auth-message">{copy.self}</div>}
      {message && <div className="auth-message">{message}</div>}
      <div className="dashboard-actions">
        {verified ? <button className="secondary-button" type="button" disabled={busy || isSelf} onClick={() => void decide("revoke")}>{copy.revoke}</button> : <button className="primary-button" type="button" disabled={busy || isSelf} onClick={() => void decide("verify")}>{copy.issue}</button>}
      </div>
    </div>
  );
}
