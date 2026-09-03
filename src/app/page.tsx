import Link from "next/link";
import { ArrowRight, BedDouble, Building2, MapPin, Search, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { HowItWorksTabs } from "@/components/how-it-works-tabs";
import { LandingFeaturedSection } from "@/components/landing-featured-section";
import { LandingMapPreview } from "@/components/landing-map-preview";
import { LandingScrollAtmosphere } from "@/components/landing-scroll-atmosphere";
import { LOCATION_PRESETS } from "@/lib/location-presets";

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
    title: "Exact map pins",
    description: "Renters can judge the real location around work, university, transport, or family instead of relying only on area names.",
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
  ["Are listings verified?", "NearBasha uses moderation and account-verification signals to improve trust. Verification status can vary by listing, so renters should still review listing details carefully before making payments or commitments."],
  ["How does NearBasha help prevent scams or fake listings?", "The product includes phone OTP, listing moderation, reporting tools, and freshness controls. These reduce risk, but renters should still avoid sending money before they are satisfied with the property and the person they are dealing with."],
  ["Is it free to browse or list a property?", "Pricing is not published on this marketing page yet. Any browsing or listing fees will be shown clearly before a user is asked to pay."],
  ["How does tenant-type matching work?", "Owners specify who a property is suitable for, such as families, bachelors, students, or job holders. Renters can use those structured preferences to avoid listings that are not a good fit."],
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
            <Link className="primary-button link-button" href="/login">List a property</Link>
          </div>
        </nav>

        <section className="landing-hero landing-hero-reference" data-scroll-theme="hero">
          <div className="landing-copy">
            <div className="landing-live-kicker"><span aria-hidden="true" />Map-first rental discovery across Dhaka</div>
            <h1>Find a home close to the life you already live.</h1>
            <p className="intro">Search around the streets, campuses, offices, and neighborhoods that matter. Compare exact locations and tenant fit before you spend time on a visit.</p>

            <form className="landing-search-console" action="/homes" method="get" role="search">
              <div className="landing-search-console-heading">
                <div><span>Start your search</span><strong>Where should home be?</strong></div>
                <ShieldCheck aria-label="Moderated listings" />
              </div>
              <div className="landing-search-console-fields">
                <label className="landing-search-console-field landing-search-console-area" htmlFor="landing-area-search">
                  <MapPin aria-hidden="true" />
                  <span>Area or landmark</span>
                  <input id="landing-area-search" name="area" type="search" list="landing-location-options" placeholder="Dhanmondi, BUET, Banani…" autoComplete="off" />
                </label>
                <label className="landing-search-console-field">
                  <Building2 aria-hidden="true" />
                  <span>Monthly budget</span>
                  <select name="maxRent" defaultValue="">
                    <option value="">Any budget</option>
                    <option value="15000">Up to ৳15,000</option>
                    <option value="25000">Up to ৳25,000</option>
                    <option value="40000">Up to ৳40,000</option>
                    <option value="60000">Up to ৳60,000</option>
                  </select>
                </label>
                <label className="landing-search-console-field">
                  <BedDouble aria-hidden="true" />
                  <span>Bedrooms</span>
                  <select name="bedrooms" defaultValue="">
                    <option value="">Any size</option>
                    <option value="1">1+ bedroom</option>
                    <option value="2">2+ bedrooms</option>
                    <option value="3">3+ bedrooms</option>
                  </select>
                </label>
                <input type="hidden" name="radius" value="5" />
                <button className="landing-search-submit" type="submit"><Search aria-hidden="true" /><span>Search map</span><ArrowRight aria-hidden="true" /></button>
              </div>
              <datalist id="landing-location-options">{LOCATION_PRESETS.map((location) => <option key={location.label} value={location.label} />)}</datalist>
            </form>

            <div className="landing-popular-searches">
              <span>Popular:</span>
              <Link href="/homes?area=Dhanmondi&radius=5">Dhanmondi</Link>
              <Link href="/homes?area=Banani&radius=5">Banani</Link>
              <Link href="/homes?area=Uttara&radius=5">Uttara</Link>
              <Link href="/homes?area=BUET&radius=5">Near BUET</Link>
            </div>

            <div className="landing-confidence-row" aria-label="NearBasha marketplace safeguards">
              <div><strong>Exact map pins</strong><span>See the real neighborhood</span></div>
              <div><strong>Tenant-fit signals</strong><span>Know who each home suits</span></div>
              <div><strong>Freshness checks</strong><span>Less time on stale listings</span></div>
            </div>
          </div>
          <div className="landing-visual">
            <div className="landing-map-caption">
              <span className="landing-map-caption-dot" aria-hidden="true" />
              <div><strong>Explore Dhaka visually</strong><small>Move the map, then refine your radius</small></div>
              <Link href="/homes">Open full map <ArrowRight aria-hidden="true" /></Link>
            </div>
            <LandingMapPreview />
          </div>
        </section>

        <section className="landing-trust-section" data-scroll-theme="trust" aria-labelledby="trust-heading">
          <div className="landing-trust-heading">
            <div><p className="eyebrow">Built for higher-trust renting</p><h2 id="trust-heading">Local rental discovery needs more than a list of phone numbers.</h2></div>
            <p>NearBasha combines identity signals, moderation, precise location, and listing-freshness tools so renters and owners can make better decisions before money or time changes hands.</p>
          </div>
          <div className="landing-trust-grid">
            {trustSignals.map((signal) => (
              <article className="landing-trust-card" key={signal.title}>
                <span className="landing-trust-icon"><TrustIcon type={signal.icon} /></span>
                <div><strong>{signal.title}</strong><p>{signal.description}</p></div>
              </article>
            ))}
          </div>
          <div className="landing-trust-note"><strong>No inflated marketplace claims.</strong><span>NearBasha uses live marketplace inventory on this page instead of fabricated listing counts or sample property claims.</span></div>
        </section>

        <section className="landing-content-section landing-how" data-scroll-theme="journey" aria-labelledby="how-heading">
          <div className="landing-section-intro"><p className="eyebrow">How it works</p><h2 id="how-heading">A clearer path for both sides of the rental.</h2><p>Choose your side to see only the steps that matter to you.</p></div>
          <HowItWorksTabs />
        </section>

        <LandingFeaturedSection />

        <section className="landing-strip" data-scroll-theme="local" aria-label="How NearBasha is different">
          <div className="landing-feature"><strong>Search by real location.</strong><span>See what is actually near work, university, transport, or family—not just what shares an area name.</span></div>
          <div className="landing-feature"><strong>Know who the home suits.</strong><span>Tenant preferences are structured into each listing so both sides waste less time.</span></div>
          <div className="landing-feature"><strong>Keep listings fresh.</strong><span>Freshness controls are designed to stop old, unavailable homes from quietly filling the marketplace.</span></div>
        </section>

        <section className="landing-content-section landing-faq" data-scroll-theme="clarity" aria-labelledby="faq-heading">
          <div className="landing-section-intro"><p className="eyebrow">Questions, answered</p><h2 id="faq-heading">What to know before you start.</h2><p>Clear expectations matter on both sides of a rental. These are the basics behind the NearBasha experience.</p></div>
          <div className="landing-faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question} className="landing-faq-item"><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>
            ))}
          </div>
        </section>

        <section className="landing-cta-band" data-scroll-theme="action" aria-label="Start using NearBasha">
          <div><p className="eyebrow">Ready when you are</p><h2>Start with the map, not another endless listing feed.</h2><p>Explore homes around the places that matter to you, or publish a property with an exact pin and clear tenant preferences.</p></div>
          <div className="landing-cta-actions"><Link className="primary-button link-button" href="/homes">Browse the live map</Link><Link className="secondary-button link-button" href="/login">List a property</Link></div>
        </section>

        <footer className="landing-footer" data-scroll-theme="footer">
          <div className="landing-footer-brand"><BrandLogo /><p>Map-first home rental discovery built for Bangladesh.</p><span>Currently focused on making local rental search clearer, fresher, and easier to trust.</span></div>
          <div className="landing-footer-links">
            <div><strong>Product</strong><Link href="/homes">Browse homes</Link><Link href="/login">List a property</Link><Link href="/login">Sign in</Link></div>
            <div><strong>Company</strong><Link href="/about">About</Link><Link href="/contact">Contact</Link></div>
            <div><strong>Legal</strong><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></div>
          </div>
          <div className="landing-footer-bottom">
            <span>Bangladesh-focused rental marketplace</span>
            <div className="landing-footer-studio" aria-label="Built by Hemilin Studio">
              <img src="/hemilin-studio.svg" alt="Hemilin Studio" className="landing-footer-studio-logo" />
              <span>By Hemilin Studio</span>
            </div>
            <span>© 2026 NearBasha. All rights reserved.</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
