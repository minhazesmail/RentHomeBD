"use client";

import { CheckCircle2, LockKeyhole, MessageSquareText, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { Dictionary } from "@/i18n/dictionaries/en";
import { interpolate } from "@/i18n/presentation";
import { useLocale } from "@/i18n/use-locale";
import { bangladeshPhoneSubscriberDigits, normalizeBangladeshPhone } from "@/lib/bangladesh-phone";
import { createClient } from "@/lib/supabase/client";

type VerificationStage = "number" | "code" | "verified";
type PhoneCopy = Dictionary["auth"]["phoneVerification"];
type PhoneMessageKey =
  | "errorRateLimited"
  | "errorInvalidCode"
  | "errorSmsUnavailable"
  | "errorFailed"
  | "errorInvalidPhone"
  | "errorRequestFirst"
  | "errorEnterCode";

function friendlyError(message: string): PhoneMessageKey {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit")) return "errorRateLimited";
  if (
    lower.includes("expired") ||
    lower.includes("invalid") ||
    lower.includes("token")
  )
    return "errorInvalidCode";
  if (
    lower.includes("phone") ||
    lower.includes("provider") ||
    lower.includes("sms")
  )
    return "errorSmsUnavailable";
  return "errorFailed";
}

function maskPhone(value: string | null, fallback: string) {
  const normalized = normalizeBangladeshPhone(value ?? "");
  if (!normalized) return fallback;
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
  const supabase = useMemo(() => createClient(), []);
  const { dictionary, formatNumber } = useLocale();
  const copy: PhoneCopy = dictionary.auth.phoneVerification;
  const [stage, setStage] = useState<VerificationStage>(
    isVerified ? "verified" : "number",
  );
  const [phoneInput, setPhoneInput] = useState(
    bangladeshPhoneSubscriberDigits(currentPhone ?? ""),
  );
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(
    isVerified ? currentPhone : null,
  );
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [messageKey, setMessageKey] = useState<PhoneMessageKey | null>(null);

  useEffect(() => {
    if (!resendSeconds) return;
    const timer = window.setInterval(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    const phone = normalizeBangladeshPhone(phoneInput);
    if (!phone) {
      setMessageKey("errorInvalidPhone");
      return;
    }

    setBusy(true);
    setMessageKey(null);
    // Do not log phone or OTP values.
    const { error } = await supabase.auth.updateUser({ phone });
    if (error) {
      setMessageKey(friendlyError(error.message));
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
      setMessageKey("errorRequestFirst");
      setStage("number");
      return;
    }
    if (!/^\d{6}$/.test(token)) {
      setMessageKey("errorEnterCode");
      return;
    }

    setBusy(true);
    setMessageKey(null);
    const phoneBeingVerified = pendingPhone;
    const { error } = await supabase.auth.verifyOtp({
      phone: phoneBeingVerified,
      token,
      type: "phone_change",
    });
    if (error) {
      setMessageKey(friendlyError(error.message));
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
    setMessageKey(null);
    setResendSeconds(0);
    setStage("number");
  }

  const successPhone = maskPhone(
    verifiedPhone ?? currentPhone,
    copy.fallbackPhone,
  );

  return (
    <div className="phone-verification-flow">
      <ol className="phone-verification-progress" aria-label={copy.progressAria}>
        <li
          className={
            stage === "number"
              ? "is-current"
              : stage === "code" || stage === "verified"
                ? "is-complete"
                : ""
          }
          aria-current={stage === "number" ? "step" : undefined}
        >
          <span>{formatNumber(1, { useGrouping: false })}</span>
          <div>
            <strong>{copy.numberStep}</strong>
            <small>{copy.numberStepDescription}</small>
          </div>
        </li>
        <li
          className={
            stage === "code"
              ? "is-current"
              : stage === "verified"
                ? "is-complete"
                : ""
          }
          aria-current={stage === "code" ? "step" : undefined}
        >
          <span>{formatNumber(2, { useGrouping: false })}</span>
          <div>
            <strong>{copy.codeStep}</strong>
            <small>{copy.codeStepDescription}</small>
          </div>
        </li>
        <li
          className={stage === "verified" ? "is-current is-complete" : ""}
          aria-current={stage === "verified" ? "step" : undefined}
        >
          <span>{formatNumber(3, { useGrouping: false })}</span>
          <div>
            <strong>{copy.verifiedStep}</strong>
            <small>{copy.verifiedStepDescription}</small>
          </div>
        </li>
      </ol>

      <section className="phone-verification-stage" aria-live="polite">
        {stage === "number" && (
          <div className="phone-verification-stage-grid">
            <div className="phone-verification-stage-intro">
              <span className="phone-verification-stage-icon">
                <Phone size={22} aria-hidden="true" />
              </span>
              <p className="eyebrow">{copy.step1}</p>
              <h2>
                {isVerified ? copy.changeNumberTitle : copy.addNumberTitle}
              </h2>
              <p>{copy.numberDescription}</p>
              <div className="phone-verification-privacy-note">
                <LockKeyhole size={17} aria-hidden="true" />
                <span>{copy.privacyNote}</span>
              </div>
            </div>

            <form className="phone-verification-form-card" onSubmit={requestCode}>
              <label htmlFor="verification-phone-number">{copy.mobileLabel}</label>
              <div className="bd-phone-field phone-verification-number-field">
                <span className="bd-phone-prefix">+880</span>
                <input
                  id="verification-phone-number"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="1712345678"
                  value={phoneInput}
                  onChange={(event) =>
                    setPhoneInput(
                      bangladeshPhoneSubscriberDigits(event.target.value),
                    )
                  }
                  maxLength={14}
                  aria-describedby="verification-phone-guidance"
                  disabled={busy}
                />
              </div>
              <p className="form-hint" id="verification-phone-guidance">
                {copy.mobileGuidance}
              </p>
              {isVerified && (
                <p className="phone-verification-existing-note">
                  {copy.existingNote}
                </p>
              )}
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? copy.sendingCode : copy.sendCode}
              </button>
            </form>
          </div>
        )}

        {stage === "code" && pendingPhone && (
          <div className="phone-verification-code-stage">
            <span className="phone-verification-stage-icon">
              <MessageSquareText size={22} aria-hidden="true" />
            </span>
            <p className="eyebrow">{copy.step2}</p>
            <h2>{copy.enterCodeTitle}</h2>
            <p>
              {copy.sentCodePrefix}{" "}
              <strong>{maskPhone(pendingPhone, copy.fallbackPhone)}</strong>।
            </p>
            <form className="phone-verification-code-form" onSubmit={verifyCode}>
              <label htmlFor="verification-code">{copy.codeLabel}</label>
              <input
                id="verification-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={token}
                onChange={(event) =>
                  setToken(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                disabled={busy}
                autoFocus
              />
              <button
                className="primary-button"
                type="submit"
                disabled={busy || token.length !== 6}
              >
                {busy ? copy.verifying : copy.verifyPhone}
              </button>
            </form>
            <div className="phone-verification-code-actions">
              <button
                className="text-button"
                type="button"
                onClick={editNumber}
                disabled={busy}
              >
                {copy.editNumber}
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => void requestCode()}
                disabled={busy || resendSeconds > 0}
              >
                {resendSeconds > 0
                  ? interpolate(copy.resendIn, {
                      seconds: formatNumber(resendSeconds, {
                        useGrouping: false,
                      }),
                    })
                  : copy.resendCode}
              </button>
            </div>
          </div>
        )}

        {stage === "verified" && (
          <div className="phone-verification-success-stage">
            <span className="phone-verification-success-icon">
              <CheckCircle2 size={28} aria-hidden="true" />
            </span>
            <p className="eyebrow">{copy.step3}</p>
            <h2>{copy.phoneVerified}</h2>
            <p>
              {interpolate(copy.successDescription, { phone: successPhone })}
            </p>
            <div className="phone-verification-success-badge">
              <CheckCircle2 size={16} aria-hidden="true" /> {copy.successBadge}
            </div>
            <p className="phone-verification-disclaimer">{copy.disclaimer}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={editNumber}
            >
              {copy.changeVerifiedNumber}
            </button>
          </div>
        )}

        {messageKey && (
          <div className="auth-message phone-verification-message" role="alert">
            {copy[messageKey]}
          </div>
        )}
      </section>
    </div>
  );
}
