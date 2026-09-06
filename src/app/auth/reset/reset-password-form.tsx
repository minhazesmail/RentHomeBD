"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/i18n/use-locale";
import { createClient } from "@/lib/supabase/client";

type ResetMessageKey = "tooShort" | "mismatch" | "invalidLink" | "updateFailed" | "updated";

export function ResetPasswordForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const copy = useLocale().dictionary.auth.resetForm;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [messageKey, setMessageKey] = useState<ResetMessageKey | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setMessageKey("tooShort");
      return;
    }
    if (password !== confirmPassword) {
      setMessageKey("mismatch");
      return;
    }

    setBusy(true);
    setMessageKey(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      const text = error.message.toLowerCase();
      setMessageKey(text.includes("session") || text.includes("token") ? "invalidLink" : "updateFailed");
      return;
    }

    setMessageKey("updated");
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <div className="auth-card">
      <form className="auth-form" onSubmit={submit}>
        <div><p className="eyebrow">{copy.eyebrow}</p><h2>{copy.title}</h2><p className="form-hint">{copy.hint}</p></div>
        <label>{copy.newPassword}<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
        <label>{copy.confirmPassword}<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required /></label>
        <button className="primary-button" type="submit" disabled={busy}>{busy ? copy.updating : copy.updatePassword}</button>
        {messageKey && <p className="auth-message" role="status" aria-live="polite">{copy[messageKey]}</p>}
      </form>
    </div>
  );
}
