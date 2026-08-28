"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export function StartConversationButton({ propertyId, userId }: { propertyId: string; userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function startConversation() {
    setBusy(true);
    setMessage(null);
    const supabase = createClient() as unknown as SupabaseClient;

    const { data: existing, error: existingError } = await supabase
      .from("conversations")
      .select("id")
      .eq("property_id", propertyId)
      .eq("renter_id", userId)
      .maybeSingle();

    if (existingError) {
      setMessage(existingError.message);
      setBusy(false);
      return;
    }

    if (existing?.id) {
      router.push(`/messages/${existing.id}`);
      return;
    }

    const { data, error } = await supabase
      .from("conversations")
      .insert({ property_id: propertyId, renter_id: userId, owner_id: userId })
      .select("id")
      .single();

    if (error) {
      const { data: raced } = await supabase
        .from("conversations")
        .select("id")
        .eq("property_id", propertyId)
        .eq("renter_id", userId)
        .maybeSingle();

      if (raced?.id) {
        router.push(`/messages/${raced.id}`);
        return;
      }

      setMessage(error.message);
      setBusy(false);
      return;
    }

    router.push(`/messages/${data.id}`);
  }

  return (
    <div className="contact-action-stack">
      <button className="primary-button property-contact-button" type="button" disabled={busy} onClick={() => void startConversation()}>
        {busy ? "Opening conversation…" : "Message owner"}
      </button>
      {message && <p className="contact-error">{message}</p>}
    </div>
  );
}
