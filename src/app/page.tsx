import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <div className="landing-frame">
        <nav className="landing-nav">
          <Link className="brand" href="/">RentHomeBD</Link>
          <div className="landing-nav-actions">
            <Link className="text-link" href="/homes">Browse homes</Link>
            <Link className="secondary-button link-button" href="/login">Sign in</Link>
          </div>
        </nav>

        <section className="landing-hero">
          <div className="landing-copy">
            <p className="eyebrow">A better way to rent in Bangladesh</p>
            <h1>Home search, finally built around location.</h1>
            <p className="intro">
              Explore moderated rental homes directly on the map, understand who each home is right for,
              and contact owners without wading through stale classifieds.
            </p>
            <div className="landing-actions">
              <Link className="primary-button link-button" href="/homes">Explore the live map →</Link>
              <Link className="secondary-button link-button" href="/login">List a property</Link>
            </div>
            <div className="landing-trust" aria-label="RentHomeBD benefits">
              <span>Exact map pins</span>
              <span>Moderated listings</span>
              <span>Freshness checks</span>
            </div>
          </div>

          <div className="landing-visual" aria-hidden="true">
            <div className="map-demo">
              <span className="map-road one" />
              <span className="map-road two" />
              <span className="map-road three" />
              <span className="map-pin-demo p1" />
              <span className="map-pin-demo p2" />
              <span className="map-pin-demo p3" />
              <div className="demo-card">
                <div className="demo-card-top">
                  <div>
                    <h3>Bright 3-bedroom in Dhanmondi</h3>
                    <p>Road 8 · exact location pinned</p>
                  </div>
                  <div className="demo-price">৳32,000/mo</div>
                </div>
                <div className="demo-meta">
                  <span>3 bedrooms</span>
                  <span>Family friendly</span>
                  <span>Fresh listing</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-strip" aria-label="How RentHomeBD is different">
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
