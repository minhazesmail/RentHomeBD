import Link from "next/link";

import { MarketingNavigation } from "@/components/marketing-navigation";
import { getInformationCopy } from "@/i18n/information-copy";
import { getLocale } from "@/i18n/get-locale";

export default async function AboutPage() {
  const locale = await getLocale();
  const dictionary = getInformationCopy(locale);
  const copy = dictionary.about;
  const common = dictionary.common;

  return (
    <main className="info-page info-about">
      <section className="info-shell">
        <MarketingNavigation current="about" />

        <section className="info-hero">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p className="intro">{copy.intro}</p>
          </div>
          <div className="info-hero-note" aria-label={copy.principlesAria}>
            <span>01</span>
            <strong>{copy.locationTitle}</strong>
            <p>{copy.locationBody}</p>
          </div>
        </section>

        <section className="info-editorial-grid">
          <article className="info-story-card">
            <span>02</span>
            <h2>{copy.compatibilityTitle}</h2>
            <p>{copy.compatibilityBody}</p>
          </article>
          <article className="info-story-card">
            <span>03</span>
            <h2>{copy.freshnessTitle}</h2>
            <p>{copy.freshnessBody}</p>
          </article>
          <article className="info-story-card">
            <span>04</span>
            <h2>{copy.privateTitle}</h2>
            <p>{copy.privateBody}</p>
          </article>
        </section>

        <section className="info-cta-band">
          <div>
            <p className="eyebrow">{copy.ctaEyebrow}</p>
            <h2>{copy.ctaTitle}</h2>
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
