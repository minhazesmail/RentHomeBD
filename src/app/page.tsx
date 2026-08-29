import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { LandingMapPreview } from "@/components/landing-map-preview";

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
            <p className="intro">
              See real pinned locations, know who each home is meant for, and contact the owner directly before you spend time visiting.
            </p>
            <div className="landing-actions" aria-label="Choose how you want to use NearBasha">
              <div className="landing-action-path">
                <span>For renters</span>
                <Link className="primary-button link-button" href="/homes">Explore the live map →</Link>
              </div>
              <div className="landing-action-path">
                <span>For owners</span>
                <Link className="secondary-button link-button" href="/login">List a property</Link>
              </div>
            </div>
            <div className="landing-trust" aria-label="NearBasha benefits">
              <span>Exact map pins</span>
              <span>Moderated listings</span>
              <span>Freshness checks</span>
            </div>
          </div>

          <div className="landing-visual">
            <LandingMapPreview />
          </div>
        </section>

        <section className="landing-strip" aria-label="How NearBasha is different">
          <div className="landing-feature">
            <strong>Search spatially, not administratively.</strong>
            <span>See what is actually near work, university, transport, or family—not just what shares a thana name.</span>
          </div>
          <div className="landing-feature">
            <strong>Know the fit before you call.</strong>
            <span>Tenant preferences are structured into every listing, reducing awkward and wasted conversations.</span>
          </div>
          <div className="landing-feature">
            <strong>Designed to age out stale inventory.</strong>
            <span>Published homes have freshness controls so the marketplace does not quietly fill with dead listings.</span>
          </div>
        </section>
      </div>
    </main>
  );
}
