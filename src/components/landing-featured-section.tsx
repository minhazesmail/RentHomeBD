import Image from "next/image";
import Link from "next/link";

import { formatCurrency, formatNumber } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { getLocale } from "@/i18n/get-locale";
import { interpolate, localizeFurnishing, localizeLocationLabel, localizeTenantSummary } from "@/i18n/presentation";
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

export async function LandingFeaturedSection() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const copy = dictionary.landing.featured;
  const { availableCount, featuredListings } = await getLandingInventory();
  const count = formatNumber(availableCount, locale, { useGrouping: true });
  const countText = interpolate(availableCount === 1 ? copy.countOne : copy.countMany, { count });
  const bedroomText = (value: number) => value === 1
    ? copy.bedroomOne
    : interpolate(copy.bedroomMany, { count: formatNumber(value, locale, { useGrouping: false }) });
  const bathroomText = (value: number) => value === 1
    ? copy.bathroomOne
    : interpolate(copy.bathroomMany, { count: formatNumber(value, locale, { useGrouping: false }) });

  return (
    <section className="landing-content-section landing-featured" data-scroll-theme="homes" aria-labelledby="featured-heading">
      <div className="landing-section-intro landing-section-intro-row">
        <div><p className="eyebrow">{copy.eyebrow}</p><h2 id="featured-heading">{copy.title}</h2></div>
        <p>{countText} {availableCount > 0 ? copy.inventoryReal : copy.inventoryEmpty}</p>
      </div>

      {featuredListings.length ? (
        <div className="landing-listings-grid">
          {featuredListings.map((listing) => {
            const title = listing.title || copy.rentalHome;
            return (
              <article className="landing-listing-card" key={listing.id}>
                <div className="landing-listing-visual">
                  {listing.imageUrl ? <Image src={listing.imageUrl} alt={interpolate(copy.imageAlt, { title })} fill sizes="(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 33vw" /> : <div className="landing-listing-image-empty">{copy.noPhoto}</div>}
                  <div className="landing-listing-badges" aria-label={copy.trustAria}><span className="listing-badge listing-badge-trust">{copy.moderated}</span><span className="listing-badge">{copy.exactPin}</span></div>
                  <div className="listing-mini-map" aria-hidden="true"><span className="listing-mini-road one" /><span className="listing-mini-road two" /><span className="listing-mini-pin" /><strong>{copy.pinPreview}</strong></div>
                </div>
                <div className="landing-listing-copy">
                  <div className="landing-listing-kicker"><span>{localizeTenantSummary(listing.tenantTypes, dictionary)}</span><span>{copy.freshListing}</span></div>
                  <div className="landing-listing-title-row">
                    <div><h3>{title}</h3><p>{listing.address_text || copy.exactLocationOnMap}</p></div>
                    <strong>{listing.rent_bdt != null ? formatCurrency(listing.rent_bdt, locale) : copy.rentOnRequest}{listing.rent_bdt != null ? <small>{copy.perMonth}</small> : null}</strong>
                  </div>
                  <div className="demo-meta">
                    {listing.bedrooms != null && <span>{bedroomText(listing.bedrooms)}</span>}
                    {listing.bathrooms != null && <span>{bathroomText(listing.bathrooms)}</span>}
                    <span>{localizeFurnishing(listing.furnishing, dictionary)}</span>
                  </div>
                  <Link className="landing-listing-link" href={`/homes/${listing.id}`}>{copy.viewFullListing} <span aria-hidden="true">→</span></Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="landing-launch-discovery">
          <div className="landing-launch-primary">
            <div className="landing-launch-copy">
              <p className="eyebrow">{copy.launchEyebrow}</p>
              <strong>{copy.launchTitle}</strong>
              <p>{copy.launchDescription}</p>
              <div className="landing-launch-areas" aria-label={copy.launchAreasAria}>{launchAreas.map((area) => <Link key={area.label} href={`/homes?area=${encodeURIComponent(area.query)}&radius=${DEFAULT_RENTER_SEARCH_RADIUS}`}>{localizeLocationLabel(area.label, dictionary)}</Link>)}</div>
              <div className="landing-featured-action landing-launch-actions"><Link className="secondary-button link-button" href="/homes">{copy.exploreLiveMap}</Link><Link className="primary-button link-button" href={LIST_PROPERTY_HREF}>{copy.listRealProperty}</Link></div>
            </div>

            <div className="landing-launch-map" aria-hidden="true">
              <span className="landing-launch-road landing-launch-road-one" /><span className="landing-launch-road landing-launch-road-two" /><span className="landing-launch-road landing-launch-road-three" />
              <span className="landing-launch-pin landing-launch-pin-one" /><span className="landing-launch-pin landing-launch-pin-two" /><span className="landing-launch-pin landing-launch-pin-three" />
              <div className="landing-launch-map-card"><small>{copy.launchMapSmall}</small><strong>{copy.launchMapTitle}</strong><span>{copy.launchMapDescription}</span></div>
            </div>
          </div>

          <div className="landing-launch-paths">
            <article><span>{copy.renterKicker}</span><strong>{copy.renterTitle}</strong><p>{copy.renterDescription}</p><Link href="/homes">{copy.renterAction} <span aria-hidden="true">→</span></Link></article>
            <article><span>{copy.ownerKicker}</span><strong>{copy.ownerTitle}</strong><p>{copy.ownerDescription}</p><Link href={LIST_PROPERTY_HREF}>{copy.ownerAction} <span aria-hidden="true">→</span></Link></article>
          </div>
        </div>
      )}

      {featuredListings.length ? <div className="landing-featured-action"><Link className="secondary-button link-button" href="/homes">{copy.browseMap}</Link></div> : null}
    </section>
  );
}
