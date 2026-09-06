"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Dictionary } from "@/i18n/dictionaries/en";
import { interpolate } from "@/i18n/presentation";
import { useLocale } from "@/i18n/use-locale";
import { bangladeshPhoneSubscriberDigits, normalizeBangladeshPhone } from "@/lib/bangladesh-phone";
import { createClient } from "@/lib/supabase/client";
import type { TenantType } from "@/lib/tenant-match";

type Mode = "signin" | "signup";
type Method = "email" | "phone";
type Role = "renter" | "owner" | "agent";
type AuthIntent = "list-property" | undefined;
type AuthMessageKey = keyof Dictionary["auth"]["messages"];

const OTP_COOLDOWN_SECONDS = 60;

function friendlyAuthError(error: unknown, context: "signin" | "signup" | "otp-send" | "otp-verify" | "password-reset"): AuthMessageKey {
  const raw = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";
  const message = raw.toLowerCase();

  if (message.includes("rate limit") || message.includes("too many") || message.includes("over_request_rate_limit")) return "rateLimited";
  if (context === "otp-verify" && (message.includes("expired") || message.includes("invalid") || message.includes("token"))) return "otpInvalid";
  if (context === "otp-send") return "otpSendFailed";
  if (context === "password-reset") return "resetSendFailed";
  if (context === "signin") return "signinFailed";
  if (context === "signup") return "signupFailed";
  return "authFailed";
}

export function AuthForm({ nextPath = "/dashboard", intent }: { nextPath?: string; intent?: AuthIntent }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { dictionary, formatNumber } = useLocale();
  const form = dictionary.auth.form;
  const messages = dictionary.auth.messages;
  const tenant = dictionary.common.tenant;
  const listingIntent = intent === "list-property";
  const [method, setMethod] = useState<Method>("email");
  const [mode, setMode] = useState<Mode>("signin");
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>(listingIntent ? "owner" : "renter");
  const [tenantType, setTenantType] = useState<Exclude<TenantType, "everyone"> | "">("");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [messageKey, setMessageKey] = useState<AuthMessageKey | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function validateSignupProfile(): AuthMessageKey | null {
    return displayName.trim().length < 2 ? "displayNameShort" : null;
  }

  function signupMetadata() {
    return {
      display_name: displayName.trim(),
      role,
      tenant_type: role === "renter" ? tenantType || null : null,
    };
  }

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "signup") {
      const validationMessage = validateSignupProfile();
      if (validationMessage) {
        setMessageKey(validationMessage);
        return;
      }
    }

    setBusy(true);
    setMessageKey(null);
    const result = mode === "signup"
      ? await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: signupMetadata(),
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`,
          },
        })
      : await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);

    if (result.error) {
      setMessageKey(friendlyAuthError(result.error, mode));
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessageKey("emailConfirmation");
      return;
    }
    router.replace(nextPath);
    router.refresh();
  }

  async function requestPasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessageKey("enterAccountEmail");
      return;
    }

    setBusy(true);
    setMessageKey(null);
    const resetDestination = `/auth/reset?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(resetDestination)}`,
    });
    setBusy(false);

    if (error) {
      setMessageKey(friendlyAuthError(error, "password-reset"));
      return;
    }
    setMessageKey("resetEmailSent");
  }

  async function requestPhoneOtp() {
    if (cooldown > 0 || busy) return;
    const normalizedPhone = normalizeBangladeshPhone(phone);
    if (!normalizedPhone) {
      setMessageKey("invalidPhone");
      return;
    }
    if (mode === "signup") {
      const validationMessage = validateSignupProfile();
      if (validationMessage) {
        setMessageKey(validationMessage);
        return;
      }
    }

    setBusy(true);
    setMessageKey(null);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: mode === "signup"
        ? { data: signupMetadata(), shouldCreateUser: true }
        : { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) {
      setMessageKey(friendlyAuthError(error, "otp-send"));
      return;
    }

    setPhone(bangladeshPhoneSubscriberDigits(normalizedPhone));
    setOtpSent(true);
    setCooldown(OTP_COOLDOWN_SECONDS);
    setMessageKey("otpSent");
  }

  async function sendPhoneOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestPhoneOtp();
  }

  async function verifyPhoneOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(token)) {
      setMessageKey("incompleteOtp");
      return;
    }
    const normalizedPhone = normalizeBangladeshPhone(phone);
    if (!normalizedPhone) {
      setMessageKey("invalidPhoneResend");
      setOtpSent(false);
      return;
    }

    setBusy(true);
    setMessageKey(null);
    const { error } = await supabase.auth.verifyOtp({ phone: normalizedPhone, token, type: "sms" });
    setBusy(false);
    if (error) {
      setMessageKey(friendlyAuthError(error, "otp-verify"));
      return;
    }
    router.replace(nextPath);
    router.refresh();
  }

  function switchMethod(nextMethod: Method) {
    setMethod(nextMethod);
    setRecoveringPassword(false);
    setShowPassword(false);
    setOtpSent(false);
    setToken("");
    setMessageKey(null);
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setRecoveringPassword(false);
    setShowPassword(false);
    if (nextMode === "signup" && listingIntent) setRole("owner");
    setOtpSent(false);
    setToken("");
    setMessageKey(null);
  }

  function signupProfileFields() {
    if (mode !== "signup") return null;
    return (
      <>
        <label>{form.displayName}<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={80} autoComplete="name" required /></label>
        <label>{form.roleLabel}
          <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="renter">{form.renter}</option>
            <option value="owner">{form.owner}</option>
            <option value="agent">{form.agent}</option>
          </select>
          {listingIntent && <span className="form-hint">{form.ownerIntentHint}</span>}
        </label>
        {role === "renter" && (
          <label>{form.renterType} <span className="form-optional">{form.optional}</span>
            <select value={tenantType} onChange={(event) => setTenantType(event.target.value as Exclude<TenantType, "everyone">)}>
              <option value="">{form.chooseLater}</option>
              <option value="family">{tenant.family}</option>
              <option value="bachelor">{tenant.bachelor}</option>
              <option value="student">{tenant.student}</option>
              <option value="job_holder">{tenant.jobHolder}</option>
            </select>
            <span className="form-hint">{form.renterTypeHint}</span>
          </label>
        )}
      </>
    );
  }

  return (
    <div className="auth-card">
      {!recoveringPassword && (
        <div className="auth-flow-heading">
          <p className="eyebrow">{mode === "signin" ? form.welcomeBack : listingIntent ? form.ownerSetup : form.joinNearBasha}</p>
          <h2>{mode === "signin" ? form.signInContinue : form.createAccountTitle}</h2>
          <p className="form-hint">{mode === "signin" ? form.signInHint : form.signupHint}</p>
          <div className="auth-tabs" aria-label={form.methodAria}>
            <button className={method === "email" ? "active" : ""} onClick={() => switchMethod("email")} type="button">{form.emailPassword}</button>
            <button className={method === "phone" ? "active" : ""} onClick={() => switchMethod("phone")} type="button">{form.phoneOtp}</button>
          </div>
        </div>
      )}

      {recoveringPassword ? (
        <form className="auth-form" onSubmit={requestPasswordReset}>
          <div><p className="eyebrow">{form.accountRecovery}</p><h2>{form.resetPassword}</h2><p className="form-hint">{form.resetHint}</p></div>
          <label>{form.email}<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <button className="primary-button" disabled={busy} type="submit">{busy ? form.sending : form.sendResetLink}</button>
          <button className="text-button" type="button" onClick={() => { setRecoveringPassword(false); setMessageKey(null); }}>{form.backToSignIn}</button>
        </form>
      ) : method === "email" ? (
        <form className="auth-form" onSubmit={submitEmail}>
          {signupProfileFields()}
          <label>{form.email}<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>
            {form.password}
            <span className="auth-password-field">
              <input type={showPassword ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} aria-describedby={mode === "signup" ? "auth-password-guidance" : undefined} required />
              <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? form.hidePassword : form.showPassword} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
            </span>
            {mode === "signup" && <span className="form-hint" id="auth-password-guidance">{form.passwordGuidance}</span>}
          </label>
          {mode === "signin" && <button className="text-button" type="button" onClick={() => { setRecoveringPassword(true); setMessageKey(null); }}>{form.forgotPassword}</button>}
          <button className="primary-button" disabled={busy} type="submit">{busy ? form.pleaseWait : mode === "signin" ? form.signIn : form.createAccount}</button>
        </form>
      ) : otpSent ? (
        <form className="auth-form" onSubmit={verifyPhoneOtp}>
          <label>{form.otpLabel}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, ""))} required /></label>
          <button className="primary-button" disabled={busy} type="submit">{busy ? form.verifying : form.verifyOtp}</button>
          <button className="text-button" onClick={() => { setOtpSent(false); setToken(""); setMessageKey(null); }} type="button">{form.differentNumber}</button>
          <button className="text-button" onClick={() => void requestPhoneOtp()} type="button" disabled={busy || cooldown > 0}>{cooldown > 0 ? interpolate(form.resendIn, { seconds: formatNumber(cooldown, { useGrouping: false }) }) : form.resendOtp}</button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={sendPhoneOtp}>
          {signupProfileFields()}
          <label>
            {form.mobileNumber}
            <span className="bd-phone-field"><span className="bd-phone-prefix">+880</span><input type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(event) => setPhone(bangladeshPhoneSubscriberDigits(event.target.value))} placeholder="1712345678" maxLength={14} aria-describedby="auth-phone-guidance" required /></span>
          </label>
          <p className="form-hint" id="auth-phone-guidance">{form.phoneGuidance}</p>
          <button className="primary-button" disabled={busy || cooldown > 0} type="submit">{busy ? form.sending : cooldown > 0 ? interpolate(form.tryAgainIn, { seconds: formatNumber(cooldown, { useGrouping: false }) }) : mode === "signin" ? form.sendSigninOtp : form.createWithOtp}</button>
        </form>
      )}

      {!recoveringPassword && (
        <div className="auth-mode-switch">
          <span>{mode === "signin" ? form.newToNearBasha : form.alreadyHaveAccount}</span>
          <button className="text-button" type="button" onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? form.createAnAccount : form.signInInstead}</button>
        </div>
      )}

      {messageKey && <p className="auth-message" role="status" aria-live="polite">{messages[messageKey]}</p>}
    </div>
  );
}
