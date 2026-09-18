import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { LanguageSwitcher } from "@/components/language-switcher";
import { PhoneVerificationForm } from "@/components/phone-verification-form";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getDictionary } from "@/i18n/get-dictionary";
import { getLocale } from "@/i18n/get-locale";
import { requireUser } from "@/lib/auth";
import { safeRelativePath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PhoneVerificationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [auth, locale, query] = await Promise.all([requireUser(), getLocale(), searchParams]);
  const returnTo = safeRelativePath(typeof query.next === "string" ? query.next : null, "/dashboard");
  const copy = getDictionary(locale).auth.phoneVerification;
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: trustProfile } = await supabase.from("profiles").select("phone_verified_at").eq("id", auth.userId).maybeSingle();
  const isVerified = Boolean(trustProfile?.phone_verified_at);

  return (
    <main className="verification-shell phone-verification-shell">
      <header className="listing-page-header verification-page-header phone-verification-page-header">
        <div>
          <BrandLogo className="workspace-brand-logo" />
          <p className="eyebrow">{copy.pageEyebrow}</p>
          <h1 className="listing-page-title">{isVerified ? copy.pageVerifiedTitle : copy.pageUnverifiedTitle}</h1>
          <p className="intro">{copy.pageDescription}</p>
        </div>
        <div className="phone-verification-header-actions"><LanguageSwitcher /><ThemeSwitcher compact /><Link className="text-link" href="/dashboard">{copy.backToDashboard}</Link></div>
      </header>

      <PhoneVerificationForm currentPhone={auth.phone ?? null} isVerified={isVerified} returnTo={returnTo !== "/dashboard" ? returnTo : undefined} />

      <section className="phone-verification-trust-note" aria-labelledby="phone-trust-note-heading">
        <div className="phone-verification-trust-note-heading">
          <span><ShieldCheck size={20} aria-hidden="true" /></span>
          <div><p className="eyebrow">{copy.badgeEyebrow}</p><h2 id="phone-trust-note-heading">{copy.badgeTitle}</h2></div>
        </div>
        <div className="phone-verification-trust-grid">
          <div><ShieldCheck size={17} aria-hidden="true" /><span><strong>{copy.confirmsLabel}</strong> {copy.confirmsText}</span></div>
          <div><LockKeyhole size={17} aria-hidden="true" /><span><strong>{copy.notConfirmsLabel}</strong> {copy.notConfirmsText}</span></div>
        </div>
      </section>
    </main>
  );
}
