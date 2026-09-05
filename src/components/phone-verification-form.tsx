"use client";

import { CheckCircle2, LockKeyhole, MessageSquareText, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { bangladeshPhoneSubscriberDigits, normalizeBangladeshPhone } from "@/lib/bangladesh-phone";
import { createClient } from "@/lib/supabase/client";

type VerificationStage = "number" | "code" | "verified";

function friendlyError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit")) return "Please wait before requesting another code.";
  if (lower.includes("expired") || lower.includes("invalid") || lower.includes("token")) {
    return "That verification code is invalid or has expired. Request a new code and try again.";
  }
  if (lower.includes("phone") || lower.includes("provider") || lower.includes("sms")) {
    return "SMS verification is temporarily unavailable. Please try again later.";
  }
  return "We couldn’t complete phone verification. Please try again.";
}

function maskPhone(value: string | null) {
  const normalized = normalizeBangladeshPhone(value ?? "");
  if (!normalized) return "your Bangladesh mobile number";
  return `${normalized.slice(0, 4)} ••• ••${normalized.slice(-2)}`;
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
  const [stage, setStage] = useState<VerificationStage>(isVerified ? "verified" : "number");
  const [phoneInput, setPhoneInput] = useState(bangladeshPhoneSubscriberDigits(currentPhone ?? ""));
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(isVerified ? currentPhone : null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!resendSeconds) return;
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (isVerified && stage !== "code") {
      setVerifiedPhone(currentPhone);
      setStage("verified");
    }
  }, [currentPhone, isVerified, stage]);

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    const phone = normalizeBangladeshPhone(phoneInput);
    if (!phone) {
      setMessage("Enter a valid Bangladesh mobile number after +880, for example 1712345678.");
      return;
    }

    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ phone });
    if (error) {
      setMessage(friendlyError(error.message));
      setBusy(false);
      return;
    }

    setPhoneInput(bangladeshPhoneSubscriberDigits(phone));
    setPendingPhone(phone);
    setToken("");
    setResendSeconds(60);
    setStage("code");
    setBusy(false);
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!pendingPhone) {
      setMessage("Request a verification code first.");
      setStage("number");
      return;
    }
    if (!/^\d{6}$/.test(token)) {
      setMessage("Enter the 6-digit code from the SMS.");
      return;
    }

    setBusy(true);
    setMessage(null);
    const phoneBeingVerified = pendingPhone;
    const { error } = await supabase.auth.verifyOtp({
      phone: phoneBeingVerified,
      token,
      type: "phone_change",
    });
    if (error) {
      setMessage(friendlyError(error.message));
      setBusy(false);
      return;
    }

    setVerifiedPhone(phoneBeingVerified);
    setPhoneInput(bangladeshPhoneSubscriberDigits(phoneBeingVerified));
    setToken("");
    setPendingPhone(null);
    setResendSeconds(0);
    setStage("verified");
    setBusy(false);
    router.refresh();
  }

  function editNumber() {
    setPendingPhone(null);
    setToken("");
    setMessage(null);
    setResendSeconds(0);
    setStage("number");
  }

  return (
    <div className="phone-verification-flow">
      <ol className="phone-verification-progress" aria-label="Phone verification progress">
        <li className={stage === "number" ? "is-current" : stage === "code" || stage === "verified" ? "is-complete" : ""} aria-current={stage === "number" ? "step" : undefined}>
          <span>1</span><div><strong>Number</strong><small>Choose the phone to verify</small></div>
        </li>
        <li className={stage === "code" ? "is-current" : stage === "verified" ? "is-complete" : ""} aria-current={stage === "code" ? "step" : undefined}>
          <span>2</span><div><strong>SMS code</strong><small>Confirm control of the number</small></div>
        </li>
        <li className={stage === "verified" ? "is-current is-complete" : ""} aria-current={stage === "verified" ? "step" : undefined}>
          <span>3</span><div><strong>Verified</strong><small>Trust signal added</small></div>
        </li>
      </ol>

      <section className="phone-verification-stage" aria-live="polite">
        {stage === "number" && (
          <div className="phone-verification-stage-grid">
            <div className="phone-verification-stage-intro">
              <span className="phone-verification-stage-icon"><Phone size={22} aria-hidden="true" /></span>
              <p className="eyebrow">Step 1 of 3</p>
              <h2>{isVerified ? "Change your verified number" : "Add your mobile number"}</h2>
              <p>Use a Bangladesh mobile number you control. We’ll send one SMS code before the phone-verified trust signal is added to your account.</p>
              <div className="phone-verification-privacy-note"><LockKeyhole size={17} aria-hidden="true" /><span>Your number stays private on public property listings.</span></div>
            </div>

            <form className="phone-verification-form-card" onSubmit={requestCode}>
              <label htmlFor="verification-phone-number">Bangladesh mobile number</label>
              <div className="bd-phone-field phone-verification-number-field">
                <span className="bd-phone-prefix">+880</span>
                <input
                  id="verification-phone-number"
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
              </div>
              <p className="form-hint" id="verification-phone-guidance">Enter the 10 digits after +880. Pasting a full Bangladesh number works too.</p>
              {isVerified && <p className="phone-verification-existing-note">Your existing verified number remains your trust signal until a new number is confirmed.</p>}
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? "Sending code…" : "Send verification code"}
              </button>
            </form>
          </div>
        )}

        {stage === "code" && pendingPhone && (
          <div className="phone-verification-code-stage">
            <span className="phone-verification-stage-icon"><MessageSquareText size={22} aria-hidden="true" /></span>
            <p className="eyebrow">Step 2 of 3</p>
            <h2>Enter the code from your SMS</h2>
            <p>We sent a 6-digit verification code to <strong>{maskPhone(pendingPhone)}</strong>.</p>
            <form className="phone-verification-code-form" onSubmit={verifyCode}>
              <label htmlFor="verification-code">6-digit code</label>
              <input
                id="verification-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={token}
                onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={busy}
                autoFocus
              />
              <button className="primary-button" type="submit" disabled={busy || token.length !== 6}>
                {busy ? "Verifying…" : "Verify phone"}
              </button>
            </form>
            <div className="phone-verification-code-actions">
              <button className="text-button" type="button" onClick={editNumber} disabled={busy}>Edit number</button>
              <button className="text-button" type="button" onClick={() => void requestCode()} disabled={busy || resendSeconds > 0}>
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {stage === "verified" && (
          <div className="phone-verification-success-stage">
            <span className="phone-verification-success-icon"><CheckCircle2 size={28} aria-hidden="true" /></span>
            <p className="eyebrow">Step 3 of 3</p>
            <h2>Phone verified</h2>
            <p><strong>{maskPhone(verifiedPhone ?? currentPhone)}</strong> is now attached to your account as a phone-verified trust signal.</p>
            <div className="phone-verification-success-badge"><CheckCircle2 size={16} aria-hidden="true" /> Phone verified</div>
            <p className="phone-verification-disclaimer">This confirms control of the phone number. It does not verify legal identity, property ownership, or the accuracy of a listing.</p>
            <button className="secondary-button" type="button" onClick={editNumber}>Change verified number</button>
          </div>
        )}

        {message && <div className="auth-message phone-verification-message" role="alert">{message}</div>}
      </section>
    </div>
  );
}
