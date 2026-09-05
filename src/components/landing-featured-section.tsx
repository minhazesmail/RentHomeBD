import Image from "next/image";
import Link from "next/link";

import { getLandingInventory } from "@/lib/landing-inventory";
import { DEFAULT_RENTER_SEARCH_RADIUS } from "@/lib/search-defaults";

const LIST_PROPERTY_HREF = "/login?intent=list-property&next=%2Fowner%2Fproperties%2Fnew";

const launchAreas = [
  { label: "Dhanmondi", query: "Dhanmondi" },
  { label: "Banani", query: "Banani" },
  { label: "Uttara", query: "Uttara" },
  { label: "Gulshan", query: "Gulshan" },
  { label: "Near BUET", query: "BUET" },
] as const;

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "—";
}

export async function LandingFeaturedSection() {
  const { availableCount, featuredListings } = await getLandingInventory();

  return (
    <section className="landing-content-section landing-featured" data-scroll-theme="homes" aria-labelledby="featured-heading">
      <div className="landing-section-intro landing-section-intro-row">
        <div>
          <p className="eyebrow">Live homes</p>
          <h2 id="featured-heading">See the home, the fit, and the location signal at a glance.</h2>
        </div>
        <p>
          {availableCount} currently available moderated {availableCount === 1 ? "listing" : "listings"}. {availableCount > 0
            ? "This section only shows real published inventory."
            : "Inventory updates automatically as real Dhaka homes pass moderation."}
        </p>
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
        <div className="landing-launch-discovery">
          <div className="landing-launch-primary">
            <div className="landing-launch-copy">
              <p className="eyebrow">Dhaka launch market</p>
              <strong>Explore the areas that matter now. Real homes will fill the map as they go live.</strong>
              <p>There are no moderated homes live at this moment, so NearBasha is not filling the page with demo listings. You can still explore supported Dhaka locations, set up the search you care about, or publish a real property.</p>

              <div className="landing-launch-areas" aria-label="Explore supported Dhaka locations">
                {launchAreas.map((area) => (
                  <Link key={area.label} href={`/homes?area=${encodeURIComponent(area.query)}&radius=${DEFAULT_RENTER_SEARCH_RADIUS}`}>{area.label}</Link>
                ))}
              </div>

              <div className="landing-featured-action landing-launch-actions">
                <Link className="secondary-button link-button" href="/homes">Explore the live map</Link>
                <Link className="primary-button link-button" href={LIST_PROPERTY_HREF}>List a real property</Link>
              </div>
            </div>

            <div className="landing-launch-map" aria-hidden="true">
              <span className="landing-launch-road landing-launch-road-one" />
              <span className="landing-launch-road landing-launch-road-two" />
              <span className="landing-launch-road landing-launch-road-three" />
              <span className="landing-launch-pin landing-launch-pin-one" />
              <span className="landing-launch-pin landing-launch-pin-two" />
              <span className="landing-launch-pin landing-launch-pin-three" />
              <div className="landing-launch-map-card">
                <small>Launch map</small>
                <strong>Supported Dhaka search areas</strong>
                <span>Move the full map anywhere, then refine your radius.</span>
              </div>
            </div>
          </div>

          <div className="landing-launch-paths">
            <article>
              <span>For renters</span>
              <strong>Set up the search before the listing appears.</strong>
              <p>Explore the area and save the radius, budget, bedrooms, and renter-fit filters you want to revisit.</p>
              <Link href="/homes">Explore & save a search <span aria-hidden="true">→</span></Link>
            </article>
            <article>
              <span>For owners</span>
              <strong>Become part of the first real Dhaka inventory.</strong>
              <p>Create a complete listing with an exact map pin, renter fit, photos, and moderation before it becomes discoverable.</p>
              <Link href={LIST_PROPERTY_HREF}>Create a listing <span aria-hidden="true">→</span></Link>
            </article>
          </div>
        </div>
      )}

      {featuredListings.length ? <div className="landing-featured-action"><Link className="secondary-button link-button" href="/homes">Browse homes on the map</Link></div> : null}
    </section>
  );
}
