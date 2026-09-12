import Link from "next/link";

import { MarketingNavigation } from "@/components/marketing-navigation";
import { getInformationCopy } from "@/i18n/information-copy";
import { getLocale } from "@/i18n/get-locale";

export default async function PrivacyPage() {
  const locale = await getLocale();
  const dictionary = getInformationCopy(locale);
  const copy = dictionary.privacy;
  const common = dictionary.common;
  const sections = Object.values(copy.sections);

  return (
    <main className="info-page info-legal">
      <section className="info-shell narrow">
        <MarketingNavigation current="privacy" />

        <section className="info-legal-hero">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="intro">{copy.intro}</p>
        </section>

        <div className="info-legal-layout">
          <aside className="info-legal-toc" aria-label={copy.tocAria}>
            <strong>{common.onThisPage}</strong>
            <nav>
              {sections.map((section) => (
                <a href={`#${section.id}`} key={section.id}>
                  <span>{section.number}</span>
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <section className="info-legal-body">
            {sections.map((section) => (
              <article id={section.id} key={section.id}>
                <span>{section.number}</span>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </article>
            ))}
          </section>
        </div>

        <footer className="info-legal-footer">
          <Link className="secondary-button link-button" href="/terms">
            {common.readTerms}
          </Link>
          <Link className="text-link" href="/">
            {common.backHome}
          </Link>
        </footer>
      </section>
    </main>
  );
}
