import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getDictionary } from "@/i18n/get-dictionary";
import { getLocale } from "@/i18n/get-locale";
import { safeRelativePath } from "@/lib/safe-redirect";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const candidate = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = safeRelativePath(candidate);
  const locale = await getLocale();
  const copy = getDictionary(locale).auth.resetPage;

  return (
    <main className="shell auth-shell">
      <section className="auth-layout">
        <div className="auth-intro-panel">
          <div className="auth-language-row"><BrandLogo className="auth-brand-logo" /><LanguageSwitcher /></div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="auth-title">{copy.title}</h1>
          <p className="intro">{copy.description}</p>
          <div className="auth-benefits"><span>{copy.benefit1}</span><span>{copy.benefit2}</span><span>{copy.benefit3}</span></div>
          <Link className="text-link" href="/login">{copy.backToSignIn}</Link>
        </div>
        <ResetPasswordForm nextPath={nextPath} />
      </section>
    </main>
  );
}
