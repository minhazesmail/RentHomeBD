"use client";

import { startTransition, useMemo, useOptimistic, useState } from "react";
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
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(saved, (_current, next: boolean) => next);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggle() {
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(`/homes/${propertyId}`)}`);
      return;
    }

    const nextSaved = !saved;
    setBusy(true);
    setMessage(null);

    startTransition(async () => {
      setOptimisticSaved(nextSaved);

      const result = nextSaved
        ? await supabase.from("saved_properties").insert({ user_id: userId, property_id: propertyId })
        : await supabase.from("saved_properties").delete().eq("user_id", userId).eq("property_id", propertyId);

      if (result.error) {
        setMessage("Could not update your saved homes. Please try again.");
        setBusy(false);
        return;
      }

      setSaved(nextSaved);
      setBusy(false);
    });
  }

  return (
    <div className={compact ? "save-home-wrap compact" : "save-home-wrap"}>
      <button
        className={optimisticSaved ? "save-home-button saved" : "save-home-button"}
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={optimisticSaved}
        aria-label={optimisticSaved ? "Remove from saved homes" : "Save this home"}
      >
        <span aria-hidden="true">{optimisticSaved ? "♥" : "♡"}</span>
        {!compact && (busy ? (optimisticSaved ? "Saving…" : "Removing…") : optimisticSaved ? "Saved home" : "Save home")}
      </button>
      {message && !compact && <small className="save-home-error">{message}</small>}
    </div>
  );
}
