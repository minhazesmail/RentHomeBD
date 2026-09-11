"use client";

import Image from "next/image";
import Link from "next/link";
import { Briefcase, CircleCheck, GraduationCap, User, Users } from "lucide-react";
import { memo } from "react";

import type { MapListing } from "@/components/leaflet-map";
import { SaveHomeButton } from "@/components/save-home-button";
import { formatCurrency, formatNumber } from "@/i18n/format";
import { getRenterResultsCopy } from "@/i18n/renter-results-copy";
import { useLocale } from "@/i18n/use-locale";
import { formatWorkflowText } from "@/i18n/workflow-copy";
import { tenantCompatibility, tenantTone, type TenantType } from "@/lib/tenant-match";

function useTenantLabels() {
  const { dictionary } = useLocale();
  return {
    family: dictionary.common.tenant.family,
    bachelor: dictionary.common.tenant.bachelor,
    student: dictionary.common.tenant.student,
    job_holder: dictionary.common.tenant.jobHolder,
    everyone: dictionary.common.tenant.everyone,
    unspecified: dictionary.common.tenant.unspecified,
  } satisfies Record<TenantType | "unspecified", string>;
}

function TenantBadge({ types, preference }: { types: TenantType[]; preference?: TenantType }) {
  const labels = useTenantLabels();
  const tone = tenantTone(types);
  const compatibility = tenantCompatibility(types, preference);
  const iconProps = { size: 12, strokeWidth: 2.2, "aria-hidden": true as const };
  const icon = tone === "family" ? <Users {...iconProps} />
    : tone === "student" ? <GraduationCap {...iconProps} />
    : tone === "bachelor" ? (types.includes("job_holder") ? <Briefcase {...iconProps} /> : <User {...iconProps} />)
    : <CircleCheck {...iconProps} />;
  const summary = !types.length
    ? labels.unspecified
    : types.includes("everyone")
      ? labels.everyone
      : types.map((type) => labels[type]).join(" · ");

  return <span className={`tenant-match-badge tenant-${tone}${compatibility === "match" ? " is-profile-match" : ""}`}>{icon}<span>{summary}</span></span>;
}

const RenterResultCard = memo(function RenterResultCard({
  listing,
  selected,
  preference,
  userId,
  href,
  onSelect,
}: {
  listing: MapListing;
  selected: boolean;
  preference?: TenantType;
  userId: string | null;
  href: string;
  onSelect: (id: string) => void;
}) {
  const { locale } = useLocale();
  const copy = getRenterResultsCopy(locale);
  const compatibility = tenantCompatibility(listing.tenant_types ?? [], preference);
  const rent = listing.rent_bdt ? formatCurrency(listing.rent_bdt, locale) : copy.rentOnRequest;
  const bedrooms = listing.bedrooms == null ? "—" : formatNumber(listing.bedrooms, locale);
  const bathrooms = listing.bathrooms == null ? "—" : formatNumber(listing.bathrooms, locale);
  const distance = listing.distance_meters === null
    ? null
    : listing.distance_meters < 1000
      ? formatWorkflowText(copy.metersAway, { distance: formatNumber(Math.round(listing.distance_meters), locale) })
      : formatWorkflowText(copy.kilometersAway, { distance: formatNumber(listing.distance_meters / 1000, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) });

  return (
    <div className={`renter-result-card-wrap tenant-compatibility-${compatibility}${selected ? " active" : ""}`}>
      <Link className="renter-result-card" href={href}>
        <div className="renter-result-image">
          {listing.cover_url ? <Image src={listing.cover_url} alt="" width={320} height={220} sizes="(max-width: 900px) 40vw, 220px" /> : <span>⌂</span>}
        </div>
        <div className="renter-result-copy">
          <TenantBadge types={listing.tenant_types ?? []} preference={preference} />
          <strong>{listing.title || copy.rentalProperty}</strong>
          <span>{listing.address_text || copy.locationOnMap}</span>
          {compatibility === "match" && <small className="tenant-preference-note is-match">{copy.matchesType}</small>}
          {compatibility === "mismatch" && <small className="tenant-preference-note is-mismatch">{copy.differentType}</small>}
          <div className="renter-result-meta">
            <b>{rent}</b>
            <small>{bedrooms} {copy.bed} · {bathrooms} {copy.bath}</small>
          </div>
          {distance && <small>{distance}</small>}
        </div>
      </Link>
      <button className="text-button renter-result-map-button" type="button" onClick={() => onSelect(listing.id)} aria-pressed={selected}>
        {selected ? copy.shownOnMap : copy.showOnMap}
      </button>
      <SaveHomeButton propertyId={listing.id} userId={userId} compact />
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
  propertyHref,
  onSelect,
}: {
  listings: MapListing[];
  busy: boolean;
  customAreaActive: boolean;
  selectedId: string | null;
  preference?: TenantType;
  userId: string | null;
  propertyHref: (propertyId: string) => string;
  onSelect: (id: string) => void;
}) {
  const { locale } = useLocale();
  const copy = getRenterResultsCopy(locale);
  return (
    <div className="renter-results-list">
      {!busy && listings.length === 0 && (
        <div className="renter-empty">
          {customAreaActive ? copy.noCustomAreaResults : copy.noResults}
        </div>
      )}
      {listings.map((listing) => (
        <RenterResultCard
          key={listing.id}
          listing={listing}
          selected={selectedId === listing.id}
          preference={preference}
          userId={userId}
          href={propertyHref(listing.id)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});
