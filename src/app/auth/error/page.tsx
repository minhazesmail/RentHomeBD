import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { RecoveryState } from "@/components/recovery-state";
import { getDictionary } from "@/i18n/get-dictionary";
import { getLocale } from "@/i18n/get-locale";

export default async function AuthErrorPage() {
  const locale = await getLocale();
  const copy = getDictionary(locale).auth.errorPage;

  return (
    <RecoveryState
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      primaryAction={<Link href="/login">{copy.returnToSignIn}</Link>}
      secondaryAction={<Link href="/">{copy.backToHome}</Link>}
      languageControl={<LanguageSwitcher />}
      headingId="auth-recovery-heading"
    />
  );
}
