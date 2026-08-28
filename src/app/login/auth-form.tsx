"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";
type Method = "email" | "phone";
type Role = "renter" | "owner" | "agent";

export function AuthForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [method, setMethod] = useState<Method>("email");
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("renter");
  const [phone, setPhone] = useState("+880");
  const [token, setToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { display_name: displayName.trim(), role },
              emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`,
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to confirm your address, then sign in.");
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  async function sendPhoneOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        data: { display_name: displayName.trim(), role },
        shouldCreateUser: true,
      },
    });

    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setOtpSent(true);
    setMessage("OTP sent. Enter the 6-digit code to continue.");
  }

  async function verifyPhoneOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <div className="auth-card">
      <div className="auth-tabs" aria-label="Authentication method">
        <button className={method === "email" ? "active" : ""} onClick={() => setMethod("email")} type="button">
          Email
        </button>
        <button className={method === "phone" ? "active" : ""} onClick={() => setMethod("phone")} type="button">
          Phone OTP
        </button>
      </div>

      {method === "email" ? (
        <form className="auth-form" onSubmit={submitEmail}>
          <div className="auth-tabs compact" aria-label="Email mode">
            <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")} type="button">Sign in</button>
            <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">Create account</button>
          </div>

          {mode === "signup" && (
            <>
              <label>Display name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} minLength={2} maxLength={80} required /></label>
              <label>I am a
                <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="renter">Renter</option>
                  <option value="owner">Owner / Landlord</option>
                  <option value="agent">Agent / Agency</option>
                </select>
              </label>
            </>
          )}

          <label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></label>
          <button className="primary-button" disabled={busy} type="submit">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
      ) : otpSent ? (
        <form className="auth-form" onSubmit={verifyPhoneOtp}>
          <label>6-digit OTP<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))} required /></label>
          <button className="primary-button" disabled={busy} type="submit">{busy ? "Verifying…" : "Verify OTP"}</button>
          <button className="text-button" onClick={() => setOtpSent(false)} type="button">Use a different number</button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={sendPhoneOtp}>
          <label>Display name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} minLength={2} maxLength={80} required /></label>
          <label>I am a
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="renter">Renter</option>
              <option value="owner">Owner / Landlord</option>
              <option value="agent">Agent / Agency</option>
            </select>
          </label>
          <label>Mobile number<input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801XXXXXXXXX" required /></label>
          <p className="form-hint">Phone OTP requires an SMS provider to be enabled in the Supabase project.</p>
          <button className="primary-button" disabled={busy} type="submit">{busy ? "Sending…" : "Send OTP"}</button>
        </form>
      )}

      {message && <p className="auth-message" role="status">{message}</p>}
    </div>
  );
}
