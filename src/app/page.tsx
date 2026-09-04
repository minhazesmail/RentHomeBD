import Link from "next/link";
import { ArrowRight, BedDouble, Building2, MapPin, Search, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { HowItWorksTabs } from "@/components/how-it-works-tabs";
import { LandingFeaturedSection } from "@/components/landing-featured-section";
import { LandingMapPreview } from "@/components/landing-map-preview";
import { LandingScrollAtmosphere } from "@/components/landing-scroll-atmosphere";
import { LOCATION_PRESETS } from "@/lib/location-presets";
import { DEFAULT_RENTER_SEARCH_RADIUS } from "@/lib/search-defaults";

const LIST_PROPERTY_HREF = "/login?intent=list-property&next=%2Fowner%2Fproperties%2Fnew";

const trustSignals = [
  {
    title: "Phone OTP verification",
    description: "Account verification adds a stronger identity signal before people list, save, or contact through the platform.",
    icon: "phone",
  },
  {
    title: "Moderated before live",
    description: "Listings can be reviewed before they become discoverable, giving obvious abuse and low-quality submissions another checkpoint.",
    icon: "shield",
  },
  {
    title: "Approximate public map pins",
    description: "Owners provide a precise pin for moderation and listing management; public rental discovery receives rounded coordinates instead.",
    icon: "pin",
  },
  {
    title: "Freshness & reporting",
    description: "Availability checks and reporting tools are designed to reduce stale, misleading, or suspicious listings over time.",
    icon: "refresh",
  },
];

function TrustIcon({ type }: { type: string }) {
  if (type === "phone") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10 5h4M11 18.5h2"/></svg>;
  if (type === "shield") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.5-2.8 8.1-7 10-4.2-1.9-7-5.5-7-10V6l7-3Z"/><path d="m9.2 12 1.8 1.8 3.9-4"/></svg>;
  if (type === "pin") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M18.3 15.6A7.5 7.5 0 1 1 19 8l1 4"/><path d="m9.5 12 1.7 1.7 3.5-3.7"/></svg>;
}

const faqs = [
  ["Where is NearBasha available?", "NearBasha is a Bangladesh-focused rental marketplace launching first in Dhaka. The current location search supports the Dhaka areas and landmarks shown in the product; broader Bangladesh coverage can expand as local inventory and location support grow."],
  ["Are listings verified?", "NearBasha uses moderation and account-verification signals to improve trust. Verification status can vary by listing, so renters should still review listing details carefully before making payments or commitments."],
  ["How does NearBasha help prevent scams or fake listings?", "The product includes phone OTP, listing moderation, reporting tools, and freshness controls. These reduce risk, but renters should still avoid sending money before they are satisfied with the property and the person they are dealing with."],
  ["What does NearBasha cost right now?", "NearBasha is free to browse and list during the current launch phase. There is no NearBasha checkout in the product today. If paid features are introduced later, their price and what they include will be shown before you choose to pay."],
  ["How does renter-type matching work?", "Owners specify which renter types a property is suitable for, such as Family, Bachelor, Student, or Job holder. Renters can use those structured preferences to avoid listings that are not a good fit."],
];

// TODO(i18n): Treat each major marketing copy block on this page as a future translation target.
export default function HomePage() {
  return (
    <main className="landing-shell" data-landing-theme="hero">
      <LandingScrollAtmosphere />
      <div className="landing-frame">
        <nav className="landing-nav">
          <BrandLogo />
          <div className="landing-nav-center" aria-label="Primary navigation">
            <Link href="/homes">Find on map</Link>
            <a href="#how-heading">How it works</a>
            <Link href="/about">About</Link>
          </div>
          <div className="landing-nav-actions">
            <Link className="text-link" href="/login">Sign in</Link>
            <Link className="primary-button link-button" href={LIST_PROPERTY_HREF}>List a property</Link>
          </div>
        </nav>

        <section className="landing-hero landing-hero-reference" data-scroll-theme="hero">
          <div className="landing-copy">
            <div className="landing-live-kicker"><span aria-hidden="true" />Bangladesh-focused · launching in Dhaka</div>
            <h1>Find a home close to the life you already live.</h1>
            <p className="intro">Search Dhaka around the streets, campuses, offices, and neighborhoods that matter to you. Compare location and renter fit before you visit.</p>

            <form className="landing-search-console" action="/homes" method="get" role="search">
              <div className="landing-search-console-heading">
                <div><span>Start your Dhaka search</span><strong>Where should home be?</strong></div>
                <ShieldCheck aria-label="Moderated listings" />
              </div>
              <div className="landing-search-console-fields">
                <label className="landing-search-console-field">
                  <MapPin size={18} aria-hidden="true" />
                  <span>Area</span>
                  <select name="area" defaultValue="Dhanmondi">
                    {LOCATION_PRESETS.map((preset) => <option value={preset.label} key={preset.label}>{preset.label}</option>)}
                  </select>
                </label>
                <label className="landing-search-console-field">
                  <BedDouble size={18} aria-hidden="true" />
                  <span>Bedrooms</span>
                  <select name="bedrooms" defaultValue="2">
                    <option value="">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </label>
                <label className="landing-search-console-field">
                  <Building2 size={18} aria-hidden="true" />
                  <span>Radius</span>
                  <select name="radius" defaultValue={DEFAULT_RENTER_SEARCH_RADIUS.toString()}>
                    <option value="2">2 km</option>
                    <option value="5">5 km</option>
                    <option value="10">10 km</option>
                    <option value="15">15 km</option>
                    <option value="25">25 km</option>
                  </select>
                </label>
                <button className="landing-search-submit" type="submit"><Search size={19} aria-hidden="true" /><span>Search homes</span><ArrowRight size={17} aria-hidden="true" /></button>
              </div>
            </form>

            <div className="landing-confidence-row" aria-label="Marketplace trust signals">
              <div><strong>Map-first</strong><span>Search around real-life anchors</span></div>
              <div><strong>Renter fit</strong><span>Family, bachelor, student & job holder</span></div>
              <div><strong>Moderated</strong><span>Review before public discovery</span></div>
            </div>
          </div>

          <LandingMapPreview />
        </section>

        <LandingFeaturedSection />

        <section className="landing-content-section landing-how" data-scroll-theme="process" aria-labelledby="how-heading">
          <div className="landing-section-intro">
            <p className="eyebrow">How it works</p>
            <h2 id="how-heading">Built around the decisions people actually make before renting.</h2>
            <p>Start with location, narrow by renter fit and practical details, then move into a listing only when the home looks worth your time.</p>
          </div>
          <HowItWorksTabs />
        </section>

        <section className="landing-content-section landing-trust-section" data-scroll-theme="trust" aria-labelledby="trust-heading">
          <div className="landing-section-intro landing-section-intro-row">
            <div><p className="eyebrow">Trust signals</p><h2 id="trust-heading">Useful checks without pretending risk disappears.</h2></div>
            <p>NearBasha can surface verification and moderation signals. Renters should still inspect the property and verify the person they are dealing with before paying.</p>
          </div>
          <div className="landing-trust-grid">
            {trustSignals.map((item) => (
              <article className="landing-trust-card" key={item.title}>
                <span className="landing-trust-icon"><TrustIcon type={item.icon} /></span>
                <div><h3>{item.title}</h3><p>{item.description}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-content-section landing-faq" data-scroll-theme="faq" aria-labelledby="faq-heading">
          <div className="landing-section-intro">
            <p className="eyebrow">Questions before you start</p>
            <h2 id="faq-heading">Straight answers about the current marketplace.</h2>
          </div>
          <div className="landing-faq-list">
            {faqs.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}</summary><p>{answer}</p></details>)}
          </div>
        </section>

        <section className="landing-content-section landing-final-cta" data-scroll-theme="cta">
          <div><p className="eyebrow">Ready to look?</p><h2>Search around the places your day already revolves around.</h2><p>Use the live map to compare homes by distance, renter fit, rent, and the details that matter before a viewing.</p></div>
          <div className="hero-actions"><Link className="primary-button link-button" href="/homes">Explore homes <ArrowRight size={17} aria-hidden="true" /></Link><Link className="secondary-button link-button" href={LIST_PROPERTY_HREF}>List a property</Link></div>
        </section>

        <footer className="landing-footer">
          <BrandLogo />
          <div><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
          <span>Bangladesh-focused rental marketplace</span>
        </footer>
      </div>
    </main>
  );
}
