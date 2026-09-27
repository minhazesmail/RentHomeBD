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

        <section id="location-data" className="info-story-card">
          <h2>{locale === "bn" ? "সারা বাংলাদেশে খুঁজুন" : "Search across Bangladesh"}</h2>
          <p>{locale === "bn"
            ? "৬৪ জেলার সব উপজেলা খুঁজতে পারবেন। নির্বাচিত স্থানের কাছাকাছি বাসা দেখানো হয়; পুরো জেলার সীমানা নয়। ম্যাপে ব্যাসার্ধ বদলান। ফলাফল উপলব্ধ বাসার ওপর নির্ভর করে।"
            : "Find every district and upazila across all 64 districts. Results show homes near the selected search center, not administrative boundaries. Adjust the radius on the map. Availability depends on listed homes."}</p>
          <p>{locale === "bn" ? "লোকেশন তথ্য: " : "Location data: "}
            <a href="https://github.com/open-admin-data/bangladesh-administrative-divisions">Bangladesh Administrative Divisions — jakkrapongt</a>{", "}
            <a href="https://www.geonames.org/">GeoNames</a>{" ("}<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>{"). "}
            <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>{". "}
            {locale === "bn" ? "NearBasha-তে নাম, বানান ও সম্প্রতি অনুমোদিত উপজেলার তথ্য যোগ করা হয়েছে।" : "Adapted by NearBasha with spelling aliases and recently approved upazilas."}
          </p>
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
