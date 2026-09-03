"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { bangladeshPhoneSubscriberDigits, normalizeBangladeshPhone } from "@/lib/bangladesh-phone";
import { createClient } from "@/lib/supabase/client";

function friendlyError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit")) return "Please wait before requesting another code.";
  if (lower.includes("phone") && (lower.includes("provider") || lower.includes("sms"))) {
    return "SMS delivery is not configured yet. The account flow is ready, but a production SMS provider must be enabled in Supabase Auth.";
  }
  return message;
}

export function PhoneVerificationForm({
  currentPhone,
  isVerified,
}: {
  currentPhone: string | null;
  isVerified: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [phoneInput, setPhoneInput] = useState(bangladeshPhoneSubscriberDigits(currentPhone ?? ""));
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    const phone = normalizeBangladeshPhone(phoneInput);
    if (!phone) {
      setMessage("Enter a valid Bangladesh mobile number after +880, for example 1712345678.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setSuccess(null);
    const { error } = await supabase.auth.updateUser({ phone });
    if (error) {
      setMessage(friendlyError(error.message));
      setBusy(false);
      return;
    }

    setPhoneInput(bangladeshPhoneSubscriberDigits(phone));
    setPendingPhone(phone);
    setCooldown(true);
    window.setTimeout(() => setCooldown(false), 60_000);
    setSuccess(`A 6-digit verification code was requested for ${phone}.`);
    setBusy(false);
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!pendingPhone) {
      setMessage("Request a verification code first.");
      return;
    }
    if (!/^\d{6}$/.test(token)) {
      setMessage("Enter the 6-digit code from the SMS.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setSuccess(null);
    const { error } = await supabase.auth.verifyOtp({
      phone: pendingPhone,
      token,
      type: "phone_change",
    });
    if (error) {
      setMessage(friendlyError(error.message));
      setBusy(false);
      return;
    }

    setToken("");
    setPendingPhone(null);
    setSuccess("Phone verified. Your NearBasha trust status has been updated.");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="listing-form">
      <section className="listing-section">
        <div className="section-heading">
          <span>1</span>
          <div>
            <h2>{isVerified ? "Change verified phone" : "Verify your phone"}</h2>
            <p>Bangladesh mobile numbers are stored by Supabase Auth in international +880 format. NearBasha never shows your phone number on public listings.</p>
          </div>
        </div>
        <form className="auth-form" onSubmit={requestCode}>
          <label>
            Bangladesh mobile number
            <span className="bd-phone-field">
              <span className="bd-phone-prefix">+880</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="1712345678"
                value={phoneInput}
                onChange={(event) => setPhoneInput(bangladeshPhoneSubscriberDigits(event.target.value))}
                maxLength={14}
                aria-describedby="verification-phone-guidance"
                disabled={busy}
              />
            </span>
          </label>
          <p className="form-hint" id="verification-phone-guidance">Enter the 10 digits after +880. Pasting 01712345678 or +8801712345678 also works.</p>
          <button className="primary-button" type="submit" disabled={busy || cooldown}>
            {busy ? "Working…" : cooldown ? "Code requested — wait 60s" : pendingPhone ? "Request another code" : "Send verification code"}
          </button>
        </form>
      </section>

      <section className="listing-section">
        <div className="section-heading">
          <span>2</span>
          <div>
            <h2>Enter SMS code</h2>
            <p>The OTP is checked directly by Supabase Auth. NearBasha does not store the code.</p>
          </div>
        </div>
        <form className="auth-form" onSubmit={verifyCode}>
          <label>
            6-digit code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={token}
              onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={busy || !pendingPhone}
            />
          </label>
          <button className="primary-button" type="submit" disabled={busy || !pendingPhone}>
            {busy ? "Verifying…" : "Verify phone"}
          </button>
        </form>
      </section>

      {message && <div className="auth-message">{message}</div>}
      {success && <div className="success-message">{success}</div>}
    </div>
  );
}
