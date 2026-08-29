import "./landing.css";

import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { LandingMapPreview } from "@/components/landing-map-preview";
import type { MapListing } from "@/components/leaflet-map";
import { LOCATION_PRESETS } from "@/lib/location-presets";

const featuredListings: MapListing[] = [
  { id: "featured-dhanmondi", title: "Bright 3-bedroom in Dhanmondi", address_text: "Road 8, Dhanmondi, Dhaka", property_type: "apartment", rent_bdt: 32000, bedrooms: 3, bathrooms: 3, furnishing: "semi_furnished", available_from: null, latitude: 23.7465, longitude: 90.376, distance_meters: null, cover_media_path: null },
  { id: "featured-banani", title: "Modern 2-bedroom near Banani 11", address_text: "Banani, Dhaka", property_type: "apartment", rent_bdt: 42000, bedrooms: 2, bathrooms: 2, furnishing: "furnished", available_from: null, latitude: 23.7937, longitude: 90.4066, distance_meters: null, cover_media_path: null },
  { id: "featured-bashundhara", title: "Family apartment in Bashundhara", address_text: "Bashundhara R/A, Dhaka", property_type: "apartment", rent_bdt: 28000, bedrooms: 3, bathrooms: 2, furnishing: "unfurnished", available_from: null, latitude: 23.8133, longitude: 90.4315, distance_meters: null, cover_media_path: null },
];

const renterSteps = [
  ["Search the map", "Choose the area that matters to you and see homes at their real pinned locations."],
  ["See who it fits", "Check tenant type, rent, bedrooms, and key details before making contact."],
  ["Message the owner", "Open the listing and contact the owner directly when the home looks right."],
];

const ownerSteps = [
  ["Pin your property", "Place the home on the map and add the structured details renters need."],
  ["Set who it is for", "Choose the tenant types that fit the property so expectations are clear upfront."],
  ["Reach matched renters", "Publish a moderated listing that renters can discover through map search."],
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
                <input
                  id="landing-area-search"
                  name="area"
                  type="search"
                  list="landing-location-options"
                  placeholder="Search area, university, or neighborhood"
                  autoComplete="off"
                />
                <input type="hidden" name="radius" value="5" />
                <button className="primary-button" type="submit">Search map</button>
              </div>
              <datalist id="landing-location-options">
                {LOCATION_PRESETS.map((location) => <option key={location.label} value={location.label} />)}
              </datalist>
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
          <div className="landing-section-intro"><p className="eyebrow">How it works</p><h2 id="how-heading">A clearer path for both sides of the rental.</h2><p>Renters get location and fit upfront. Owners publish the details that help the right renters find them.</p></div>
          <div className="landing-how-grid">
            <article className="landing-how-card">
              <div className="landing-persona-heading"><span>R</span><div><small>For renters</small><h3>Find a home that actually fits.</h3></div></div>
              <ol className="landing-steps">{renterSteps.map(([title, description], index) => <li key={title}><span className="landing-step-number">{index + 1}</span><div><strong>{title}</strong><p>{description}</p></div></li>)}</ol>
              <Link className="text-link" href="/homes">Start searching →</Link>
            </article>
            <article className="landing-how-card">
              <div className="landing-persona-heading"><span>O</span><div><small>For owners</small><h3>Publish once, match more clearly.</h3></div></div>
              <ol className="landing-steps">{ownerSteps.map(([title, description], index) => <li key={title}><span className="landing-step-number">{index + 1}</span><div><strong>{title}</strong><p>{description}</p></div></li>)}</ol>
              <Link className="text-link" href="/login">List your property →</Link>
            </article>
          </div>
        </section>

        <section className="landing-content-section landing-featured" aria-labelledby="featured-heading">
          <div className="landing-section-intro landing-section-intro-row"><div><p className="eyebrow">Sample homes</p><h2 id="featured-heading">See the kind of detail you get before you visit.</h2></div><p>Representative examples for the marketing page. Browse the live map for current inventory.</p></div>
          <div className="landing-listings-grid">
            {featuredListings.map((listing, index) => (
              <article className="landing-listing-card" key={listing.id}>
                <div className={`landing-listing-visual visual-${index + 1}`} aria-hidden="true"><span>Exact pin</span></div>
                <div className="landing-listing-copy"><div className="landing-listing-title-row"><div><h3>{listing.title}</h3><p>{listing.address_text}</p></div><strong>৳{listing.rent_bdt?.toLocaleString("en-BD")}/mo</strong></div><div className="demo-meta"><span>{listing.bedrooms} bedrooms</span><span>{listing.bathrooms} bathrooms</span><span>{listing.furnishing.replaceAll("_", " ")}</span></div></div>
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
              <details key={question} className="landing-faq-item">
                <summary>{question}<span aria-hidden="true">+</span></summary>
                <p>{answer}</p>
              </details>
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
