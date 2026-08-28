"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

function friendlyConversationError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("conversation start limit reached")) {
    return "You’ve opened many new conversations recently. Please try again later.";
  }
  if (lower.includes("not currently available")) {
    return "This home is no longer available for new conversations.";
  }
  if (lower.includes("own listing")) {
    return "You can’t start a renter conversation on your own listing.";
  }
  return "Could not open this conversation. Please try again.";
}

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
      setMessage("Could not check your existing conversations. Please try again.");
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

      setMessage(friendlyConversationError(error.message));
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
