import Link from "next/link";
import { ArrowRight, BedDouble, Building2, MapPin, Search, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { HowItWorksTabs } from "@/components/how-it-works-tabs";
import { LandingFaqSection } from "@/components/landing-faq-section";
import { LandingFeaturedSection } from "@/components/landing-featured-section";
import { LandingMapPreview } from "@/components/landing-map-preview";
import { LandingScrollAtmosphere } from "@/components/landing-scroll-atmosphere";
import { MarketingNavigation } from "@/components/marketing-navigation";
import { formatCurrency, formatNumber } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { getLocale } from "@/i18n/get-locale";
import { interpolate, localizeLocationLabel } from "@/i18n/presentation";
import { LOCATION_PRESETS } from "@/lib/location-presets";
import { DEFAULT_RENTER_SEARCH_RADIUS } from "@/lib/search-defaults";

const LIST_PROPERTY_HREF = "/login?intent=list-property&next=%2Fowner%2Fproperties%2Fnew";

function TrustIcon({ type }: { type: string }) {
  if (type === "phone") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10 5h4M11 18.5h2"/></svg>;
  if (type === "shield") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.5-2.8 8.1-7 10-4.2-1.9-7-5.5-7-10V6l7-3Z"/><path d="m9.2 12 1.8 1.8 3.9-4"/></svg>;
  if (type === "pin") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M18.3 15.6A7.5 7.5 0 1 1 19 8l1 4"/><path d="m9.5 12 1.7 1.7 3.5-3.7"/></svg>;
}

export default async function HomePage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const landing = dictionary.landing;
  const hero = landing.hero;
  const radius = formatNumber(Number(DEFAULT_RENTER_SEARCH_RADIUS), locale, { maximumFractionDigits: 1 });
  const trustSignals = [
    { title: landing.trust.phoneTitle, description: landing.trust.phoneDescription, icon: "phone" },
    { title: landing.trust.moderationTitle, description: landing.trust.moderationDescription, icon: "shield" },
    { title: landing.trust.pinTitle, description: landing.trust.pinDescription, icon: "pin" },
    { title: landing.trust.freshnessTitle, description: landing.trust.freshnessDescription, icon: "refresh" },
  ];

  return (
    <main className="landing-shell" data-landing-theme="hero" data-atmosphere="hero" data-scroll-direction="down">
      <LandingScrollAtmosphere />
      <div className="landing-frame">
        <MarketingNavigation variant="landing" />

        <section className="landing-hero landing-hero-reference" data-scroll-theme="hero">
          <div className="landing-copy">
            <div className="landing-live-kicker"><span aria-hidden="true" />{hero.kicker}</div>
            <h1>{hero.title}</h1>
            <p className="intro">{hero.description}</p>

            <form className="landing-search-console" action="/homes" method="get" role="search">
              <div className="landing-search-console-heading">
                <div><span>{hero.searchKicker}</span><strong>{hero.searchTitle}</strong></div>
                <ShieldCheck aria-label={hero.moderatedListings} />
              </div>
              <div className="landing-search-console-fields">
                <label className="landing-search-console-field landing-search-console-area">
                  <MapPin aria-hidden="true" />
                  <span>{hero.areaLabel}</span>
                  <select name="area" defaultValue="" required aria-describedby="landing-area-help">
                    <option value="" disabled>{hero.chooseLocation}</option>
                    {LOCATION_PRESETS.map((location) => (
                      <option key={location.label} value={location.label}>{localizeLocationLabel(location.label, dictionary)}</option>
                    ))}
                  </select>
                </label>
                <label className="landing-search-console-field">
                  <Building2 aria-hidden="true" />
                  <span>{hero.budgetLabel}</span>
                  <select name="maxRent" defaultValue="">
                    <option value="">{hero.anyBudget}</option>
                    {[15000, 25000, 40000, 60000].map((amount) => (
                      <option value={amount} key={amount}>{hero.upTo} {formatCurrency(amount, locale)}</option>
                    ))}
                  </select>
                </label>
                <label className="landing-search-console-field">
                  <BedDouble aria-hidden="true" />
                  <span>{hero.bedroomsLabel}</span>
                  <select name="bedrooms" defaultValue="">
                    <option value="">{hero.anySize}</option>
                    <option value="1">{hero.bedroomOne}</option>
                    {[2, 3].map((count) => (
                      <option value={count} key={count}>{interpolate(hero.bedroomMany, { count: formatNumber(count, locale, { useGrouping: false }) })}</option>
                    ))}
                  </select>
                </label>
                <input type="hidden" name="radius" value={DEFAULT_RENTER_SEARCH_RADIUS} />
                <button className="landing-search-submit" type="submit"><Search aria-hidden="true" /><span>{hero.searchMap}</span><ArrowRight aria-hidden="true" /></button>
              </div>
              <p className="form-hint" id="landing-area-help">{interpolate(hero.areaHelp, { radius })}</p>
            </form>

            <div className="landing-popular-searches">
              <span>{hero.popular}</span>
              <Link href={`/homes?area=Dhanmondi&radius=${DEFAULT_RENTER_SEARCH_RADIUS}`}>{dictionary.common.locations.dhanmondi}</Link>
              <Link href={`/homes?area=Banani&radius=${DEFAULT_RENTER_SEARCH_RADIUS}`}>{dictionary.common.locations.banani}</Link>
              <Link href={`/homes?area=Uttara&radius=${DEFAULT_RENTER_SEARCH_RADIUS}`}>{dictionary.common.locations.uttara}</Link>
              <Link href={`/homes?area=BUET&radius=${DEFAULT_RENTER_SEARCH_RADIUS}`}>{hero.nearBuet}</Link>
            </div>

            <div className="landing-confidence-row" aria-label={hero.safeguardsAria}>
              <div><strong>{hero.exactPinsTitle}</strong><span>{hero.exactPinsDescription}</span></div>
              <div><strong>{hero.renterFitTitle}</strong><span>{hero.renterFitDescription}</span></div>
              <div><strong>{hero.freshnessTitle}</strong><span>{hero.freshnessDescription}</span></div>
            </div>
          </div>
          <div className="landing-visual">
            <div className="landing-map-caption">
              <span className="landing-map-caption-dot" aria-hidden="true" />
              <div><strong>{hero.mapTitle}</strong><small>{hero.mapDescription}</small></div>
              <Link href="/homes">{hero.openFullMap} <ArrowRight aria-hidden="true" /></Link>
            </div>
            <LandingMapPreview />
          </div>
        </section>

        <section className="landing-trust-section" data-scroll-theme="trust" aria-labelledby="trust-heading">
          <div className="landing-trust-heading">
            <div><p className="eyebrow">{landing.trust.eyebrow}</p><h2 id="trust-heading">{landing.trust.title}</h2></div>
            <p>{landing.trust.description}</p>
          </div>
          <div className="landing-trust-grid">
            {trustSignals.map((signal) => (
              <article className="landing-trust-card" key={signal.title}>
                <span className="landing-trust-icon"><TrustIcon type={signal.icon} /></span>
                <div><strong>{signal.title}</strong><p>{signal.description}</p></div>
              </article>
            ))}
          </div>
          <div className="landing-trust-note"><strong>{landing.trust.noteTitle}</strong><span>{landing.trust.noteDescription}</span></div>
        </section>

        <section className="landing-content-section landing-how" data-scroll-theme="journey" aria-labelledby="how-heading">
          <div className="landing-section-intro"><p className="eyebrow">{landing.how.eyebrow}</p><h2 id="how-heading">{landing.how.title}</h2><p>{landing.how.description}</p></div>
          <HowItWorksTabs />
        </section>

        <LandingFeaturedSection />
        <LandingFaqSection />

        <section className="landing-cta-band" data-scroll-theme="action" aria-label={landing.cta.aria}>
          <div><p className="eyebrow">{landing.cta.eyebrow}</p><h2>{landing.cta.title}</h2><p>{landing.cta.description}</p></div>
          <div className="landing-cta-actions"><Link className="primary-button link-button" href="/homes">{landing.cta.browseMap}</Link><Link className="secondary-button link-button" href={LIST_PROPERTY_HREF}>{landing.cta.listProperty}</Link></div>
        </section>

        <footer className="landing-footer" data-scroll-theme="footer">
          <div className="landing-footer-brand"><BrandLogo /><p>{landing.footer.tagline}</p></div>
          <div className="landing-footer-links">
            <div><strong>{landing.footer.product}</strong><Link href="/homes">{landing.footer.browseHomes}</Link><Link href={LIST_PROPERTY_HREF}>{landing.footer.listProperty}</Link><Link href="/login">{landing.footer.signIn}</Link></div>
            <div><strong>{landing.footer.company}</strong><Link href="/about">{landing.footer.about}</Link><Link href="/contact">{landing.footer.contact}</Link></div>
            <div><strong>{landing.footer.legal}</strong><Link href="/terms">{landing.footer.terms}</Link><Link href="/privacy">{landing.footer.privacy}</Link></div>
          </div>
          <div className="landing-footer-bottom">
            <span>{landing.footer.launchMarket}</span>
            <div className="landing-footer-studio" aria-label={landing.footer.builtByAria}>
              <img src="/hemilin-studio.svg" alt="Hemilin Studio" className="landing-footer-studio-logo" />
              <span>{landing.footer.byStudio}</span>
            </div>
            <span>{interpolate(landing.footer.copyright, { year: formatNumber(2026, locale, { useGrouping: false }) })}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
