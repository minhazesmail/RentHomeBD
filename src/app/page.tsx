import "./landing.css";

import Image from "next/image";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { HowItWorksTabs } from "@/components/how-it-works-tabs";
import { LandingMapPreview } from "@/components/landing-map-preview";
import { LOCATION_PRESETS } from "@/lib/location-presets";

const featuredListings = [
  {
    id: "featured-dhanmondi",
    title: "Bright 3-bedroom in Dhanmondi",
    address_text: "Road 8, Dhanmondi, Dhaka",
    rent_bdt: 32000,
    bedrooms: 3,
    bathrooms: 3,
    furnishing: "Semi furnished",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85",
    tenant: "Family friendly",
  },
  {
    id: "featured-banani",
    title: "Modern 2-bedroom near Banani 11",
    address_text: "Banani, Dhaka",
    rent_bdt: 42000,
    bedrooms: 2,
    bathrooms: 2,
    furnishing: "Furnished",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=85",
    tenant: "Professionals welcome",
  },
  {
    id: "featured-bashundhara",
    title: "Family apartment in Bashundhara",
    address_text: "Bashundhara R/A, Dhaka",
    rent_bdt: 28000,
    bedrooms: 3,
    bathrooms: 2,
    furnishing: "Unfurnished",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85",
    tenant: "Family friendly",
  },
];

const faqs = [
  ["Are listings verified?", "NearBasha uses moderation and account-verification signals to improve trust. Verification status can vary by listing, so renters should still review the listing details carefully before making payments or commitments."],
  ["How does NearBasha help prevent scams or fake listings?", "The product includes phone OTP, listing moderation, reporting tools, and freshness controls. These reduce risk, but renters should still avoid sending money before they are satisfied with the property and the person they are dealing with."],
  ["Is it free to browse or list a property?", "Pricing is not published on this marketing page yet. Any browsing or listing fees will be shown clearly before a user is asked to pay."],
  ["How does tenant-type matching work?", "Owners specify who a property is suitable for, such as families, bachelors, students, or job holders. Renters can use those structured preferences to avoid listings that are not a good fit."],
];

// TODO(i18n): Treat each major marketing copy block on this page as a future translation target.
export default function HomePage() {
  return (
    <main className="landing-shell">
      <div className="landing-frame">
        <nav className="landing-nav">
          <BrandLogo />
          <div className="landing-nav-actions">
            <Link className="text-link" href="/homes">Browse homes</Link>
            <Link className="secondary-button link-button" href="/login">Sign in</Link>
          </div>
        </nav>

        <section className="landing-hero">
          <div className="landing-copy">
            <p className="eyebrow">A better way to rent in Bangladesh</p>
            <h1>Find your next home on the map.</h1>
            <p className="intro">See real pinned locations, know who each home is meant for, and contact the owner directly before you spend time visiting.</p>

            <form className="landing-quick-search" action="/homes" method="get" role="search">
              <label htmlFor="landing-area-search">Where do you want to live?</label>
              <div className="landing-search-field">
                <span className="landing-search-icon" aria-hidden="true">⌖</span>
                <input id="landing-area-search" name="area" type="search" list="landing-location-options" placeholder="Search area, university, or neighborhood" autoComplete="off" />
                <input type="hidden" name="radius" value="5" />
                <button className="primary-button" type="submit">Search map</button>
              </div>
              <datalist id="landing-location-options">{LOCATION_PRESETS.map((location) => <option key={location.label} value={location.label} />)}</datalist>
              <p>Try Dhanmondi, Banani, Uttara, BUET, or North South University.</p>
            </form>

            <div className="landing-actions" aria-label="Choose how you want to use NearBasha">
              <div className="landing-action-path"><span>For renters</span><Link className="text-link" href="/homes">Explore the full live map →</Link></div>
              <div className="landing-action-path"><span>For owners</span><Link className="secondary-button link-button" href="/login">List a property</Link></div>
            </div>
            <div className="landing-trust" aria-label="NearBasha benefits"><span>Exact map pins</span><span>Moderated listings</span><span>Freshness checks</span></div>
          </div>
          <div className="landing-visual"><LandingMapPreview /></div>
        </section>

        {/* TODO: wire verified-listing and city counts to live marketplace data. */}
        <section className="landing-stats" aria-label="NearBasha trust signals">
          <div><strong>Live count</strong><span>Verified listings</span></div>
          <div><strong>Bangladesh</strong><span>Built for the local rental market</span></div>
          <div><strong>Phone OTP</strong><span>Account verification</span></div>
          <div><strong>Moderated</strong><span>Listings reviewed before going live</span></div>
        </section>

        <section className="landing-content-section landing-how" aria-labelledby="how-heading">
          <div className="landing-section-intro"><p className="eyebrow">How it works</p><h2 id="how-heading">A clearer path for both sides of the rental.</h2><p>Choose your side to see only the steps that matter to you.</p></div>
          <HowItWorksTabs />
        </section>

        <section className="landing-content-section landing-featured" aria-labelledby="featured-heading">
          <div className="landing-section-intro landing-section-intro-row"><div><p className="eyebrow">Sample homes</p><h2 id="featured-heading">See the home, the fit, and the location signal at a glance.</h2></div><p>Representative examples for the marketing page. Live listings show their actual moderation and verification signals.</p></div>
          <div className="landing-listings-grid">
            {featuredListings.map((listing) => (
              <article className="landing-listing-card" key={listing.id}>
                <div className="landing-listing-visual">
                  <Image src={listing.image} alt={`Interior preview for ${listing.title}`} fill sizes="(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                  <div className="landing-listing-badges" aria-label="Listing trust signals">
                    <span className="listing-badge listing-badge-trust">Moderated</span>
                    <span className="listing-badge">Exact location pin</span>
                  </div>
                  <div className="listing-mini-map" aria-hidden="true">
                    <span className="listing-mini-road one" />
                    <span className="listing-mini-road two" />
                    <span className="listing-mini-pin" />
                    <strong>Pin preview</strong>
                  </div>
                </div>
                <div className="landing-listing-copy">
                  <div className="landing-listing-kicker"><span>{listing.tenant}</span><span>Fresh listing</span></div>
                  <div className="landing-listing-title-row">
                    <div><h3>{listing.title}</h3><p>{listing.address_text}</p></div>
                    <strong>৳{listing.rent_bdt.toLocaleString("en-BD")}<small>/mo</small></strong>
                  </div>
                  <div className="demo-meta"><span>{listing.bedrooms} bedrooms</span><span>{listing.bathrooms} bathrooms</span><span>{listing.furnishing}</span></div>
                  <Link className="landing-listing-link" href="/homes">View homes near this pin <span aria-hidden="true">→</span></Link>
                </div>
              </article>
            ))}
          </div>
          <div className="landing-featured-action"><Link className="secondary-button link-button" href="/homes">Browse homes on the map</Link></div>
        </section>

        <section className="landing-strip" aria-label="How NearBasha is different">
          <div className="landing-feature"><strong>Search by real location.</strong><span>See what is actually near work, university, transport, or family—not just what shares an area name.</span></div>
          <div className="landing-feature"><strong>Know who the home suits.</strong><span>Tenant preferences are structured into each listing so both sides waste less time.</span></div>
          <div className="landing-feature"><strong>Keep listings fresh.</strong><span>Freshness controls are designed to stop old, unavailable homes from quietly filling the marketplace.</span></div>
        </section>

        <section className="landing-content-section landing-faq" aria-labelledby="faq-heading">
          <div className="landing-section-intro"><p className="eyebrow">Questions, answered</p><h2 id="faq-heading">What to know before you start.</h2><p>Clear expectations matter on both sides of a rental. These are the basics behind the NearBasha experience.</p></div>
          <div className="landing-faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question} className="landing-faq-item"><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>
            ))}
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-footer-brand"><BrandLogo /><p>Map-first home rental discovery built for Bangladesh.</p><span>Currently focused on making local rental search clearer, fresher, and easier to trust.</span></div>
          <div className="landing-footer-links">
            <div><strong>Product</strong><Link href="/homes">Browse homes</Link><Link href="/login">List a property</Link><Link href="/login">Sign in</Link></div>
            <div><strong>Company</strong><Link href="/about">About</Link><Link href="/contact">Contact</Link></div>
            <div><strong>Legal</strong><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></div>
          </div>
          <div className="landing-footer-bottom"><span>Bangladesh-focused rental marketplace</span><span>© 2026 NearBasha. All rights reserved.</span></div>
        </footer>
      </div>
    </main>
  );
}
