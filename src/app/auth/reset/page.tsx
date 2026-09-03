import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { ResetPasswordForm } from "./reset-password-form";

function safeNext(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith("/") && !candidate.startsWith("//") ? candidate : "/dashboard";
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);

  return (
    <main className="shell auth-shell">
      <section className="auth-layout">
        <div className="auth-intro-panel">
          <BrandLogo className="auth-brand-logo" />
          <p className="eyebrow">Secure account recovery</p>
          <h1 className="auth-title">Set a new password and get back to renting.</h1>
          <p className="intro">This page is reached through the secure recovery link sent to your email address. Choose a new password to continue with your NearBasha account.</p>
          <div className="auth-benefits">
            <span>Reset links are time-limited</span>
            <span>Your new password replaces the old one immediately</span>
            <span>You return to the account flow you were using</span>
          </div>
          <Link className="text-link" href="/login">Back to sign in</Link>
        </div>
        <ResetPasswordForm nextPath={nextPath} />
      </section>
    </main>
  );
}
