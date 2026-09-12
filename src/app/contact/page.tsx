import Link from "next/link";

import { MarketingNavigation } from "@/components/marketing-navigation";
import { SupportRequestForm } from "@/components/support-request-form";
import { getInformationCopy } from "@/i18n/information-copy";
import { getLocale } from "@/i18n/get-locale";
import type { SupportCategory } from "@/i18n/support-copy";

const SUPPORT_CATEGORIES = new Set<SupportCategory>([
  "account_recovery",
  "otp_delivery",
  "data_export",
  "account_deletion",
  "safety_abuse",
  "other",
]);

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const dictionary = getInformationCopy(locale);
  const copy = dictionary.contact;
  const common = dictionary.common;

  const params = await searchParams;
  const requestedCategory = first(params.category) as SupportCategory | undefined;
  const initialCategory =
    requestedCategory && SUPPORT_CATEGORIES.has(requestedCategory) ? requestedCategory : "other";
  const conversation = first(params.conversation)?.slice(0, 80);

  const privacyLabel = locale === "bn" ? "গোপনীয়তা" : "Privacy";
  const termsLabel = locale === "bn" ? "শর্তাবলি" : "Terms";

  return (
    <main className="info-page info-contact">
      <section className="info-shell">
        <MarketingNavigation current="contact" />

        <section className="info-hero compact">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p className="intro">{copy.intro}</p>
          </div>
          <div className="info-hero-note">
            <span>{copy.noteLabel}</span>
            <strong>{copy.noteTitle}</strong>
            <p>{copy.noteBody}</p>
          </div>
        </section>

        <section className="info-support-grid info-support-priority-grid">
          <article className="info-support-primary">
            <span>{copy.primarySafetyLabel}</span>
            <h2>{copy.primarySafetyTitle}</h2>
            <p>{copy.primarySafetyBody}</p>
            <Link className="primary-button link-button" href="/homes">
              {copy.findProperty}
            </Link>
          </article>
          <article>
            <span>{copy.accountAccessLabel}</span>
            <h2>{copy.accountAccessTitle}</h2>
            <p>{copy.accountAccessBody}</p>
            <a className="text-link" href="#support-request">
              {copy.openSupportForm}
            </a>
          </article>
          <article>
            <span>{copy.privacyRequestsLabel}</span>
            <h2>{copy.privacyRequestsTitle}</h2>
            <p>{copy.privacyRequestsBody}</p>
            <div className="info-inline-links">
              <Link href="/privacy">{privacyLabel}</Link>
              <Link href="/terms">{termsLabel}</Link>
            </div>
          </article>
        </section>

        <section
          id="support-request"
          className="info-cta-band subtle"
          aria-labelledby="support-request-title"
        >
          <div>
            <p className="eyebrow">{copy.supportEyebrow}</p>
            <h2 id="support-request-title">{copy.supportTitle}</h2>
          </div>
        </section>
        <SupportRequestForm
          initialCategory={initialCategory}
          context={conversation ? { conversation_id: conversation } : {}}
        />

        <section className="info-cta-band subtle">
          <div>
            <p className="eyebrow">{copy.continueEyebrow}</p>
            <h2>{copy.continueTitle}</h2>
          </div>
          <div className="hero-actions">
            <Link className="primary-button link-button" href="/homes">
              {common.browseHomes}
            </Link>
            <Link className="secondary-button link-button" href="/">
              {common.backHome}
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
