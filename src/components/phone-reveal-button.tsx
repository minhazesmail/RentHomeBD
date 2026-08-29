"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

function friendlyRevealError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("phone verification required")) return "Verify your phone before revealing owner contact details.";
  if (lower.includes("owner phone is not verified")) return "This owner has not verified a phone number yet.";
  if (lower.includes("rate limit")) return "You’ve revealed several phone numbers recently. Try again later or use in-app chat.";
  if (lower.includes("not currently available")) return "This listing is no longer available for direct contact.";
  if (lower.includes("own contact")) return "You can’t reveal your own phone number from your listing.";
  return "Could not reveal the phone number. You can still contact the owner through NearBasha chat.";
}

export function PhoneRevealButton({
  propertyId,
  signedIn,
  viewerPhoneVerified,
  ownerPhoneVerified,
  signInHref,
}: {
  propertyId: string;
  signedIn: boolean;
  viewerPhoneVerified: boolean;
  ownerPhoneVerified: boolean;
  signInHref: string;
}) {
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [phone, setPhone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ownerPhoneVerified) {
    return <p className="contact-note">Direct phone reveal is unavailable because this owner has not verified a phone number. In-app chat remains available.</p>;
  }

  if (!signedIn) {
    return <Link className="secondary-button link-button property-contact-button phone-reveal-button" href={signInHref}>Sign in to reveal phone</Link>;
  }

  if (!viewerPhoneVerified) {
    return (
      <div className="phone-reveal-gate">
        <Link className="secondary-button link-button property-contact-button phone-reveal-button" href="/account/phone">Verify phone to reveal</Link>
        <p className="contact-note">Your number stays private. Verification only proves you control a Bangladesh mobile number before direct contact is unlocked.</p>
      </div>
    );
  }

  async function reveal() {
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("reveal_property_owner_phone", { property_uuid: propertyId });
    if (rpcError) {
      setError(friendlyRevealError(rpcError.message));
      setBusy(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const revealedPhone = row && typeof row === "object" && "phone" in row ? String(row.phone ?? "") : "";
    if (!revealedPhone) {
      setError("The owner’s verified phone number is currently unavailable. Use in-app chat instead.");
      setBusy(false);
      return;
    }

    setPhone(revealedPhone);
    setBusy(false);
  }

  if (phone) {
    return (
      <div className="phone-reveal-result" role="status" aria-live="polite">
        <span>Verified owner phone</span>
        <a href={`tel:${phone}`}>{phone}</a>
        <small>Shown only after your phone verification. Please use it only for this rental enquiry.</small>
      </div>
    );
  }

  return (
    <div className="phone-reveal-gate">
      <button className="secondary-button property-contact-button phone-reveal-button" type="button" onClick={() => void reveal()} disabled={busy}>
        {busy ? "Checking verification…" : "Reveal verified phone"}
      </button>
      <p className="contact-note">Click-to-reveal is gated by phone verification and protected against bulk lookups.</p>
      {error && <p className="contact-error" role="alert">{error}</p>}
    </div>
  );
}
