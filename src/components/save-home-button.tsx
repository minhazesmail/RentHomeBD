"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export function SaveHomeButton({
  propertyId,
  userId,
  initialSaved = false,
  compact = false,
}: {
  propertyId: string;
  userId: string | null;
  initialSaved?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle() {
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(`/homes/${propertyId}`)}`);
      return;
    }

    setBusy(true);
    setMessage(null);

    const result = saved
      ? await supabase.from("saved_properties").delete().eq("user_id", userId).eq("property_id", propertyId)
      : await supabase.from("saved_properties").insert({ user_id: userId, property_id: propertyId });

    if (result.error) {
      setMessage(result.error.message);
      setBusy(false);
      return;
    }

    setSaved(!saved);
    setBusy(false);
  }

  return (
    <div className={compact ? "save-home-wrap compact" : "save-home-wrap"}>
      <button
        className={saved ? "save-home-button saved" : "save-home-button"}
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved homes" : "Save this home"}
      >
        <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
        {!compact && (busy ? "Saving…" : saved ? "Saved home" : "Save home")}
      </button>
      {message && !compact && <small className="save-home-error">{message}</small>}
    </div>
  );
}
