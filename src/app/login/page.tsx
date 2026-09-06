import { ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getDictionary } from "@/i18n/get-dictionary";
import { getLocale } from "@/i18n/get-locale";
import { AuthForm } from "./auth-form";

function safeNext(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith("/") && !candidate.startsWith("//") ? candidate : "/dashboard";
}

function authIntent(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "list-property" ? candidate : undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; intent?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);
  const intent = authIntent(params.intent);
  const listingIntent = intent === "list-property";
  const locale = await getLocale();
  const copy = getDictionary(locale).auth.loginIntro;

  return (
    <main className="shell auth-shell">
      <section className="auth-layout">
        <div className="auth-intro-panel">
          <div className="auth-language-row"><BrandLogo className="auth-brand-logo" /><LanguageSwitcher /></div>
          <p className="eyebrow">{listingIntent ? copy.listingEyebrow : copy.regularEyebrow}</p>
          <h1 className="auth-title">{listingIntent ? copy.listingTitle : copy.regularTitle}</h1>
          <p className="intro">{listingIntent ? copy.listingDescription : copy.regularDescription}</p>
          <div className="auth-benefits">
            {listingIntent ? (
              <><span>{copy.listingBenefit1}</span><span>{copy.listingBenefit2}</span><span>{copy.listingBenefit3}</span></>
            ) : (
              <><span>{copy.regularBenefit1}</span><span>{copy.regularBenefit2}</span><span>{copy.regularBenefit3}</span></>
            )}
          </div>
          <aside className="auth-owner-note" aria-label={copy.ownerNoteAria}>
            <span className="auth-owner-note-icon" aria-hidden="true"><ShieldCheck size={18} strokeWidth={1.8} /></span>
            <div><strong>{copy.ownerNoteTitle}</strong><p>{copy.ownerNoteDescription}</p></div>
          </aside>
        </div>
        <AuthForm nextPath={nextPath} intent={intent} />
      </section>
    </main>
  );
}
