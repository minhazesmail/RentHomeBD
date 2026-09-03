"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The passwords do not match. Re-enter them and try again.");
      return;
    }

    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      const text = error.message.toLowerCase();
      setMessage(text.includes("session") || text.includes("token")
        ? "This reset link is no longer valid. Return to sign in and request a new password reset email."
        : "We couldn't update your password. Try a different password or request a new reset link.");
      return;
    }

    setMessage("Password updated. Taking you back to your account…");
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <div className="auth-card">
      <form className="auth-form" onSubmit={submit}>
        <div>
          <p className="eyebrow">Account recovery</p>
          <h2>Choose a new password</h2>
          <p className="form-hint">Use at least 8 characters. Your reset link establishes a temporary authenticated session before this step.</p>
        </div>
        <label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required /></label>
        <button className="primary-button" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
        {message && <p className="auth-message" role="status" aria-live="polite">{message}</p>}
      </form>
    </div>
  );
}
