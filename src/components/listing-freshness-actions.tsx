"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ActionButton } from "@/components/action";
import { createClient } from "@/lib/supabase/client";

export function ListingFreshnessActions({
  propertyId,
  status,
}: {
  propertyId: string;
  status: "available" | "pending_confirmation" | "rented" | "expired" | string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"confirm" | "rented" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reconfirm() {
    setBusy("confirm");
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("properties")
      .update({ last_confirmed_at: new Date().toISOString() } as never)
      .eq("id", propertyId);

    if (updateError) {
      setError("Could not reconfirm this listing. Please try again.");
      setBusy(null);
      return;
    }

    router.refresh();
    setBusy(null);
  }

  async function markRented() {
    setBusy("rented");
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("properties")
      .update({ status: "rented" } as never)
      .eq("id", propertyId);

    if (updateError) {
      setError("Could not mark this listing as rented. Please try again.");
      setBusy(null);
      return;
    }

    router.refresh();
    setBusy(null);
  }

  if (!["available", "pending_confirmation"].includes(status)) return null;

  return (
    <div className="freshness-actions" onClick={(event) => event.preventDefault()} aria-live="polite">
      <ActionButton variant="secondary" className="freshness-button" type="button" disabled={busy !== null} aria-busy={busy === "confirm"} onClick={() => void reconfirm()}>
        {busy === "confirm" ? "Confirming…" : "Still available"}
      </ActionButton>
      <ActionButton variant="text" className="freshness-rented" type="button" disabled={busy !== null} aria-busy={busy === "rented"} onClick={() => void markRented()}>
        {busy === "rented" ? "Updating…" : "Mark rented"}
      </ActionButton>
      {error && <span className="freshness-error" role="alert">{error}</span>}
    </div>
  );
}
