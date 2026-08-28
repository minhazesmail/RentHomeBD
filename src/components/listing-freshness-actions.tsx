"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      setError(updateError.message);
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
      setError(updateError.message);
      setBusy(null);
      return;
    }

    router.refresh();
    setBusy(null);
  }

  if (!['available', 'pending_confirmation'].includes(status)) return null;

  return (
    <div className="freshness-actions" onClick={(event) => event.preventDefault()}>
      <button className="secondary-button freshness-button" type="button" disabled={busy !== null} onClick={() => void reconfirm()}>
        {busy === "confirm" ? "Confirming…" : "Still available"}
      </button>
      <button className="text-button freshness-rented" type="button" disabled={busy !== null} onClick={() => void markRented()}>
        {busy === "rented" ? "Updating…" : "Mark rented"}
      </button>
      {error && <span className="freshness-error">{error}</span>}
    </div>
  );
}
