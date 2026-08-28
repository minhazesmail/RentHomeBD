"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

function normalizeBangladeshPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^01[3-9]\d{8}$/.test(compact)) return `+88${compact}`;
  if (/^8801[3-9]\d{8}$/.test(compact)) return `+${compact}`;
  if (/^\+8801[3-9]\d{8}$/.test(compact)) return compact;
  return null;
}

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
  const [phoneInput, setPhoneInput] = useState(currentPhone ?? "");
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
      setMessage("Enter a valid Bangladesh mobile number, for example 01712345678 or +8801712345678.");
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
    setSuccess("Phone verified. Your RentHomeBD trust status has been updated.");
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
            <p>Bangladesh mobile numbers are stored by Supabase Auth in international +880 format. RentHomeBD never shows your phone number on public listings.</p>
          </div>
        </div>
        <form className="auth-form" onSubmit={requestCode}>
          <label>
            Bangladesh mobile number
            <input
              inputMode="tel"
              autoComplete="tel"
              placeholder="01712345678"
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              disabled={busy}
            />
          </label>
          <p className="form-hint">Accepted formats: 01XXXXXXXXX, 8801XXXXXXXXX, or +8801XXXXXXXXX.</p>
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
            <p>The OTP is checked directly by Supabase Auth. RentHomeBD does not store the code.</p>
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
