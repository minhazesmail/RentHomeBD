"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPropertyDetailCopy } from "@/i18n/property-detail-copy";
import { useLocale } from "@/i18n/use-locale";
import { createClient } from "@/lib/supabase/client";

export function StartConversationButton({ propertyId, userId }: { propertyId: string; userId: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = getPropertyDetailCopy(locale).contact.conversation;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function friendlyConversationError(raw: string) {
    const lower = raw.toLowerCase();
    if (lower.includes("conversation start limit reached")) return copy.limit;
    if (lower.includes("not currently available")) return copy.unavailable;
    if (lower.includes("own listing")) return copy.ownListing;
    return copy.generic;
  }

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
      setMessage(copy.checkFailed);
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
        {busy ? copy.opening : copy.messageOwner}
      </button>
      {message && <p className="contact-error">{message}</p>}
    </div>
  );
}
