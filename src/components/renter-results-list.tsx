"use client";

import Image from "next/image";
import Link from "next/link";
import { Briefcase, CircleCheck, GraduationCap, User, Users } from "lucide-react";
import { memo } from "react";

import type { MapListing } from "@/components/leaflet-map";
import { SaveHomeButton } from "@/components/save-home-button";
import { tenantCompatibility, tenantSummary, tenantTone, type TenantType } from "@/lib/tenant-match";

function TenantBadge({ types, preference }: { types: TenantType[]; preference?: TenantType }) {
  const tone = tenantTone(types);
  const compatibility = tenantCompatibility(types, preference);
  const iconProps = { size: 12, strokeWidth: 2.2, "aria-hidden": true as const };
  const icon = tone === "family" ? <Users {...iconProps} />
    : tone === "student" ? <GraduationCap {...iconProps} />
    : tone === "bachelor" ? (types.includes("job_holder") ? <Briefcase {...iconProps} /> : <User {...iconProps} />)
    : <CircleCheck {...iconProps} />;

  return <span className={`tenant-match-badge tenant-${tone}${compatibility === "match" ? " is-profile-match" : ""}`}>{icon}<span>{tenantSummary(types)}</span></span>;
}

const RenterResultCard = memo(function RenterResultCard({
  listing,
  selected,
  preference,
  userId,
  initiallySaved,
  href,
  onSelect,
}: {
  listing: MapListing;
  selected: boolean;
  preference?: TenantType;
  userId: string | null;
  initiallySaved: boolean;
  href: string;
  onSelect: (id: string) => void;
}) {
  const compatibility = tenantCompatibility(listing.tenant_types ?? [], preference);

  return (
    <div className={`renter-result-card-wrap tenant-compatibility-${compatibility}${selected ? " active" : ""}`}>
      <Link className="renter-result-card" href={href}>
        <div className="renter-result-image">
          {listing.cover_url ? <Image src={listing.cover_url} alt="" width={320} height={220} sizes="(max-width: 900px) 40vw, 220px" /> : <span>⌂</span>}
        </div>
        <div className="renter-result-copy">
          <TenantBadge types={listing.tenant_types ?? []} preference={preference} />
          <strong>{listing.title || "Rental property"}</strong>
          <span>{listing.address_text || "Location available on map"}</span>
          {compatibility === "match" && <small className="tenant-preference-note is-match">✓ Matches your renter type</small>}
          {compatibility === "mismatch" && <small className="tenant-preference-note is-mismatch">This owner prefers a different renter type.</small>}
          <div className="renter-result-meta">
            <b>{listing.rent_bdt ? `৳${listing.rent_bdt.toLocaleString("en-BD")}` : "Rent on request"}</b>
            <small>{listing.bedrooms ?? "—"} bed · {listing.bathrooms ?? "—"} bath</small>
          </div>
          {listing.distance_meters !== null && <small>{listing.distance_meters < 1000 ? `${Math.round(listing.distance_meters)} m away` : `${(listing.distance_meters / 1000).toFixed(1)} km away`}</small>}
        </div>
      </Link>
      <button className="text-button renter-result-map-button" type="button" onClick={() => onSelect(listing.id)} aria-pressed={selected}>
        {selected ? "Shown on map" : "Show on map"}
      </button>
      <SaveHomeButton propertyId={listing.id} userId={userId} initialSaved={initiallySaved} compact />
    </div>
  );
});

export const RenterResultsList = memo(function RenterResultsList({
  listings,
  busy,
  customAreaActive,
  selectedId,
  preference,
  userId,
  savedPropertyIds,
  propertyHref,
  onSelect,
}: {
  listings: MapListing[];
  busy: boolean;
  customAreaActive: boolean;
  selectedId: string | null;
  preference?: TenantType;
  userId: string | null;
  savedPropertyIds: Set<string>;
  propertyHref: (propertyId: string) => string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="renter-results-list">
      {!busy && listings.length === 0 && (
        <div className="renter-empty">
          {customAreaActive ? "No available homes fall inside this custom area. Try expanding the shape or radius." : "No available homes match these filters yet."}
        </div>
      )}
      {listings.map((listing) => (
        <RenterResultCard
          key={listing.id}
          listing={listing}
          selected={selectedId === listing.id}
          preference={preference}
          userId={userId}
          initiallySaved={savedPropertyIds.has(listing.id)}
          href={propertyHref(listing.id)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});
