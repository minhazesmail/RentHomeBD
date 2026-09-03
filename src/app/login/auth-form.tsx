"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";
type Method = "email" | "phone";
type Role = "renter" | "owner" | "agent";
type TenantType = "family" | "bachelor" | "student" | "job_holder";
type AuthIntent = "list-property" | undefined;

const OTP_COOLDOWN_SECONDS = 60;

function friendlyAuthError(error: unknown, context: "signin" | "signup" | "otp-send" | "otp-verify" | "password-reset") {
  const raw = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";
  const message = raw.toLowerCase();

  if (message.includes("rate limit") || message.includes("too many") || message.includes("over_request_rate_limit")) {
    return "Too many attempts. Please wait a little before trying again.";
  }
  if (context === "otp-verify" && (message.includes("expired") || message.includes("invalid") || message.includes("token"))) {
    return "That OTP is invalid or expired. Request a new code and try again.";
  }
  if (context === "otp-send") {
    return "We couldn't send an OTP to that number. Check the number and try again.";
  }
  if (context === "password-reset") {
    return "We couldn't send a password reset email right now. Please wait a moment and try again.";
  }
  if (context === "signin") {
    return "We couldn't sign you in with those credentials.";
  }
  if (context === "signup") {
    return "We couldn't create the account. Check the details or try signing in if you already registered.";
  }
  return "Authentication failed. Please try again.";
}

function normalizeBangladeshPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^01[3-9]\d{8}$/.test(compact)) return `+88${compact}`;
  if (/^8801[3-9]\d{8}$/.test(compact)) return `+${compact}`;
  if (/^\+8801[3-9]\d{8}$/.test(compact)) return compact;
  return null;
}

export function AuthForm({ nextPath = "/dashboard", intent }: { nextPath?: string; intent?: AuthIntent }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const listingIntent = intent === "list-property";
  const [method, setMethod] = useState<Method>("email");
  const [mode, setMode] = useState<Mode>("signin");
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>(listingIntent ? "owner" : "renter");
  const [tenantType, setTenantType] = useState<TenantType | "">("");
  const [phone, setPhone] = useState("+880");
  const [token, setToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function validateSignupProfile() {
    if (displayName.trim().length < 2) return "Enter a display name with at least 2 characters.";
    if (role === "renter" && !tenantType) return "Choose the renter type that best describes you so we can match suitable homes by default.";
    return null;
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
        setMessage(validationMessage);
        return;
      }
    }

    setBusy(true);
    setMessage(null);

    const result =
      mode === "signup"
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
      setMessage(friendlyAuthError(result.error, mode));
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("If this email can be registered, a confirmation message will arrive shortly. Check your inbox and spam folder.");
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  async function requestPasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage("Enter the email address you use for NearBasha.");
      return;
    }

    setBusy(true);
    setMessage(null);
    const resetDestination = `/auth/reset?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(resetDestination)}`,
    });
    setBusy(false);

    if (error) {
      setMessage(friendlyAuthError(error, "password-reset"));
      return;
    }

    setMessage("If an account exists for that email, a password reset link will arrive shortly. Check your inbox and spam folder.");
  }

  async function requestPhoneOtp() {
    if (cooldown > 0 || busy) return;

    const normalizedPhone = normalizeBangladeshPhone(phone);
    if (!normalizedPhone) {
      setMessage("Enter a valid Bangladesh mobile number, for example +8801XXXXXXXXX.");
      return;
    }
    if (mode === "signup") {
      const validationMessage = validateSignupProfile();
      if (validationMessage) {
        setMessage(validationMessage);
        return;
      }
    }

    setBusy(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: mode === "signup"
        ? {
            data: signupMetadata(),
            shouldCreateUser: true,
          }
        : {
            shouldCreateUser: false,
          },
    });

    setBusy(false);
    if (error) {
      setMessage(friendlyAuthError(error, "otp-send"));
      return;
    }

    setPhone(normalizedPhone);
    setOtpSent(true);
    setCooldown(OTP_COOLDOWN_SECONDS);
    setMessage("OTP sent. Enter the 6-digit code to continue.");
  }

  async function sendPhoneOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestPhoneOtp();
  }

  async function verifyPhoneOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(token)) {
      setMessage("Enter the complete 6-digit OTP.");
      return;
    }

    setBusy(true);
    setMessage(null);

    const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    setBusy(false);

    if (error) {
      setMessage(friendlyAuthError(error, "otp-verify"));
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  function switchMethod(nextMethod: Method) {
    setMethod(nextMethod);
    setRecoveringPassword(false);
    setOtpSent(false);
    setToken("");
    setMessage(null);
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setRecoveringPassword(false);
    if (nextMode === "signup" && listingIntent) setRole("owner");
    setOtpSent(false);
    setToken("");
    setMessage(null);
  }

  function signupProfileFields() {
    if (mode !== "signup") return null;
    return (
      <>
        <label>Display name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} minLength={2} maxLength={80} autoComplete="name" required /></label>
        <label>I am a
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="renter">Renter</option>
            <option value="owner">Owner / Landlord</option>
            <option value="agent">Agent / Agency</option>
          </select>
          {listingIntent && <span className="form-hint">Owner / Landlord is selected because you chose “List a property.” Change this only if another role describes you better.</span>}
        </label>
        {role === "renter" && (
          <label>My renter type
            <select value={tenantType} onChange={(e) => setTenantType(e.target.value as TenantType)} required>
              <option value="">Choose one</option>
              <option value="family">Family</option>
              <option value="bachelor">Bachelor</option>
              <option value="student">Student</option>
              <option value="job_holder">Job holder</option>
            </select>
            <span className="form-hint">We’ll use this as your default map match. You can still change the tenant filter while searching.</span>
          </label>
        )}
      </>
    );
  }

  return (
    <div className="auth-card">
      {!recoveringPassword && (
        <>
          <div className="auth-tabs" aria-label="Authentication method">
            <button className={method === "email" ? "active" : ""} onClick={() => switchMethod("email")} type="button">Email</button>
            <button className={method === "phone" ? "active" : ""} onClick={() => switchMethod("phone")} type="button">Phone OTP</button>
          </div>

          <div className="auth-tabs compact" aria-label="Account mode">
            <button className={mode === "signin" ? "active" : ""} onClick={() => switchMode("signin")} type="button">Sign in</button>
            <button className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")} type="button">Create account</button>
          </div>
        </>
      )}

      {recoveringPassword ? (
        <form className="auth-form" onSubmit={requestPasswordReset}>
          <div>
            <p className="eyebrow">Account recovery</p>
            <h2>Reset your password</h2>
            <p className="form-hint">Enter the email address on your NearBasha account. We’ll send a secure link to choose a new password.</p>
          </div>
          <label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <button className="primary-button" disabled={busy} type="submit">{busy ? "Sending…" : "Send reset link"}</button>
          <button className="text-button" type="button" onClick={() => { setRecoveringPassword(false); setMessage(null); }}>Back to sign in</button>
        </form>
      ) : method === "email" ? (
        <form className="auth-form" onSubmit={submitEmail}>
          {signupProfileFields()}
          <label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></label>
          {mode === "signin" && <button className="text-button" type="button" onClick={() => { setRecoveringPassword(true); setMessage(null); }}>Forgot password?</button>}
          <button className="primary-button" disabled={busy} type="submit">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
      ) : otpSent ? (
        <form className="auth-form" onSubmit={verifyPhoneOtp}>
          <label>6-digit OTP<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))} required /></label>
          <button className="primary-button" disabled={busy} type="submit">{busy ? "Verifying…" : "Verify OTP"}</button>
          <button className="text-button" onClick={() => { setOtpSent(false); setToken(""); setMessage(null); }} type="button">Use a different number</button>
          <button className="text-button" onClick={() => void requestPhoneOtp()} type="button" disabled={busy || cooldown > 0}>{cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}</button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={sendPhoneOtp}>
          {signupProfileFields()}
          <label>Mobile number<input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801XXXXXXXXX" required /></label>
          <p className="form-hint">Bangladesh mobile numbers only. OTP delivery and abuse limits are also enforced by the authentication provider.</p>
          <button className="primary-button" disabled={busy || cooldown > 0} type="submit">{busy ? "Sending…" : cooldown > 0 ? `Try again in ${cooldown}s` : mode === "signin" ? "Send sign-in OTP" : "Create account with OTP"}</button>
        </form>
      )}

      {message && <p className="auth-message" role="status" aria-live="polite">{message}</p>}
    </div>
  );
}
