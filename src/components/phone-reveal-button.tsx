"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPropertyDetailCopy } from "@/i18n/property-detail-copy";
import { useLocale } from "@/i18n/use-locale";
import { createClient } from "@/lib/supabase/client";

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
  const { locale } = useLocale();
  const copy = getPropertyDetailCopy(locale).contact.phoneReveal;
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [phone, setPhone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function friendlyRevealError(message: string) {
    const lower = message.toLowerCase();
    if (lower.includes("phone verification required")) return copy.verifyRequired;
    if (lower.includes("owner phone is not verified")) return copy.ownerNotVerified;
    if (lower.includes("rate limit")) return copy.rateLimit;
    if (lower.includes("not currently available")) return copy.unavailable;
    if (lower.includes("own contact")) return copy.ownContact;
    return copy.generic;
  }

  if (!ownerPhoneVerified) {
    return <p className="contact-note">{copy.ownerUnavailable}</p>;
  }

  if (!signedIn) {
    return <Link className="secondary-button link-button property-contact-button phone-reveal-button" href={signInHref}>{copy.signIn}</Link>;
  }

  if (!viewerPhoneVerified) {
    return (
      <div className="phone-reveal-gate">
        <Link className="secondary-button link-button property-contact-button phone-reveal-button" href="/account/phone">{copy.verify}</Link>
        <p className="contact-note">{copy.viewerVerificationNote}</p>
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
      setError(copy.empty);
      setBusy(false);
      return;
    }

    setPhone(revealedPhone);
    setBusy(false);
  }

  if (phone) {
    return (
      <div className="phone-reveal-result" role="status" aria-live="polite">
        <span>{copy.verifiedOwnerPhone}</span>
        <a href={`tel:${phone}`}>{phone}</a>
        <small>{copy.revealedNote}</small>
      </div>
    );
  }

  return (
    <div className="phone-reveal-gate">
      <button className="secondary-button property-contact-button phone-reveal-button" type="button" onClick={() => void reveal()} disabled={busy}>
        {busy ? copy.checking : copy.reveal}
      </button>
      <p className="contact-note">{copy.gateNote}</p>
      {error && <p className="contact-error" role="alert">{error}</p>}
    </div>
  );
}
