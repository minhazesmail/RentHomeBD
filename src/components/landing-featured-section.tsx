import Image from "next/image";
import Link from "next/link";

import { getLandingInventory } from "@/lib/landing-inventory";

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "—";
}

export async function LandingFeaturedSection() {
  const { availableCount, featuredListings } = await getLandingInventory();

  return (
    <section className="landing-content-section landing-featured" aria-labelledby="featured-heading">
      <div className="landing-section-intro landing-section-intro-row">
        <div>
          <p className="eyebrow">Live homes</p>
          <h2 id="featured-heading">See the home, the fit, and the location signal at a glance.</h2>
        </div>
        <p>{availableCount} currently available moderated {availableCount === 1 ? "listing" : "listings"}. This section only shows real published inventory.</p>
      </div>

      {featuredListings.length ? (
        <div className="landing-listings-grid">
          {featuredListings.map((listing) => (
            <article className="landing-listing-card" key={listing.id}>
              <div className="landing-listing-visual">
                {listing.imageUrl ? (
                  <Image src={listing.imageUrl} alt={`Interior preview for ${listing.title || "rental home"}`} fill sizes="(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                ) : (
                  <div className="landing-listing-image-empty">Photo available on the full listing</div>
                )}
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
                <div className="landing-listing-kicker"><span>{listing.tenantLabel}</span><span>Fresh listing</span></div>
                <div className="landing-listing-title-row">
                  <div><h3>{listing.title || "Rental home"}</h3><p>{listing.address_text || "Exact location available on map"}</p></div>
                  <strong>{listing.rent_bdt ? `৳${listing.rent_bdt.toLocaleString("en-BD")}` : "Rent on request"}{listing.rent_bdt ? <small>/mo</small> : null}</strong>
                </div>
                <div className="demo-meta">
                  {listing.bedrooms != null && <span>{listing.bedrooms} bedrooms</span>}
                  {listing.bathrooms != null && <span>{listing.bathrooms} bathrooms</span>}
                  <span>{label(listing.furnishing)}</span>
                </div>
                <Link className="landing-listing-link" href={`/homes/${listing.id}`}>View full listing <span aria-hidden="true">→</span></Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="landing-featured-empty">
          <strong>No moderated homes are live yet.</strong>
          <p>As soon as owners publish approved, currently available listings, they will appear here automatically.</p>
        </div>
      )}

      <div className="landing-featured-action"><Link className="secondary-button link-button" href="/homes">Browse homes on the map</Link></div>
    </section>
  );
}
