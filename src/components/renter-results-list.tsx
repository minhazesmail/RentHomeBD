"use client";

import { Briefcase, CircleCheck, GraduationCap, User, Users } from "lucide-react";
import { memo, useMemo } from "react";

import type { MapListing } from "@/components/leaflet-map";
import { PropertyCard } from "@/components/property-card";
import { SaveHomeButton } from "@/components/save-home-button";
import { SearchRecoveryState } from "@/components/search-recovery-state";
import { useRenewingPublicMedia } from "@/hooks/use-renewing-public-media";
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
  const summary = !types.length ? labels.unspecified : types.includes("everyone") ? labels.everyone : types.map((type) => labels[type]).join(" · ");
  return <span className={`tenant-match-badge tenant-${tone}${compatibility === "match" ? " is-profile-match" : ""}`}>{icon}<span>{summary}</span></span>;
}

const RenterResultCard = memo(function RenterResultCard({ listing, selected, preference, userId, href, onSelect, onHighlight, onMediaError }: {
  listing: MapListing;
  selected: boolean;
  preference?: TenantType;
  userId: string | null;
  href: string;
  onSelect: (id: string) => void;
  onHighlight: (id: string | null) => void;
  onMediaError: (path: string) => void;
}) {
  const { locale } = useLocale();
  const copy = getRenterResultsCopy(locale);
  const compatibility = tenantCompatibility(listing.tenant_types ?? [], preference);
  const rent = listing.rent_bdt ? formatCurrency(listing.rent_bdt, locale) : copy.rentOnRequest;
  const bedrooms = listing.bedrooms == null ? "—" : formatNumber(listing.bedrooms, locale);
  const bathrooms = listing.bathrooms == null ? "—" : formatNumber(listing.bathrooms, locale);
  const distance = listing.distance_meters === null ? null : listing.distance_meters < 1000
    ? formatWorkflowText(copy.metersAway, { distance: formatNumber(Math.round(listing.distance_meters), locale) })
    : formatWorkflowText(copy.kilometersAway, { distance: formatNumber(listing.distance_meters / 1000, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) });

  return (
    <div
      className={`renter-result-card-wrap tenant-compatibility-${compatibility}${selected ? " active" : ""}`}
      data-property-id={listing.id}
      onMouseEnter={() => onHighlight(listing.id)}
      onMouseLeave={() => onHighlight(null)}
      onFocusCapture={() => onHighlight(listing.id)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onHighlight(null);
      }}
    >
      <PropertyCard
        href={href}
        imageUrl={listing.cover_url}
        imageSizes="(max-width: 900px) 40vw, 220px"
        classes={{ link: "renter-result-card", media: "renter-result-image", body: "renter-result-copy" }}
        onMediaError={() => { if (listing.cover_media_path) onMediaError(listing.cover_media_path); }}
      >
        <TenantBadge types={listing.tenant_types ?? []} preference={preference} />
        <strong>{listing.title || copy.rentalProperty}</strong>
        <span>{listing.address_text || copy.locationOnMap}</span>
        {compatibility === "match" && <small className="tenant-preference-note is-match">{copy.matchesType}</small>}
        {compatibility === "mismatch" && <small className="tenant-preference-note is-mismatch">{copy.differentType}</small>}
        <div className="renter-result-meta"><b>{rent}</b><small>{bedrooms} {copy.bed} · {bathrooms} {copy.bath}</small></div>
        {distance && <small>{distance}</small>}
      </PropertyCard>
      <button className="text-button renter-result-map-button" type="button" onClick={() => onSelect(listing.id)} aria-pressed={selected}>{selected ? copy.shownOnMap : copy.showOnMap}</button>
      <SaveHomeButton propertyId={listing.id} userId={userId} compact />
    </div>
  );
});

export const RenterResultsList = memo(function RenterResultsList({
  listings,
  busy,
  slow,
  searchError,
  customAreaActive,
  selectedId,
  preference,
  userId,
  propertyHref,
  onSelect,
  onRetry,
  onClearFilters,
  onHighlight = () => {},
}: {
  listings: MapListing[];
  busy: boolean;
  slow: boolean;
  searchError?: string | null;
  customAreaActive: boolean;
  selectedId: string | null;
  preference?: TenantType;
  userId: string | null;
  propertyHref: (propertyId: string) => string;
  onSelect: (id: string) => void;
  onRetry?: () => void;
  onClearFilters?: () => void;
  onHighlight?: (id: string | null) => void;
}) {
  const { locale } = useLocale();
  const copy = getRenterResultsCopy(locale);
  const renewableItems = useMemo(() => listings.flatMap((listing) => listing.cover_media_path ? [{ path: listing.cover_media_path, initialUrl: listing.cover_url }] : []), [listings]);
  const { urls, refresh } = useRenewingPublicMedia(renewableItems);
  const liveListings = useMemo(() => listings.map((listing) => listing.cover_media_path && urls[listing.cover_media_path] ? { ...listing, cover_url: urls[listing.cover_media_path] } : listing), [listings, urls]);

  return (
    <div className="renter-results-list" data-shared-property-results>
      {searchError && (
        <SearchRecoveryState
          variant="error"
          title={copy.searchErrorTitle}
          description={searchError}
          compact={liveListings.length > 0}
          primaryAction={onRetry ? { label: copy.retrySearch, onClick: onRetry } : undefined}
        />
      )}

      {!searchError && busy && slow && liveListings.length === 0 && (
        <SearchRecoveryState
          variant="slow"
          title={copy.slowSearchTitle}
          description={copy.slowSearchHint}
        />
      )}

      {!searchError && !busy && liveListings.length === 0 && (
        <SearchRecoveryState
          variant="empty"
          title={customAreaActive ? copy.noCustomAreaTitle : copy.noResultsTitle}
          description={customAreaActive ? copy.noCustomAreaResults : copy.noResults}
          primaryAction={onClearFilters ? { label: copy.broadenSearch, onClick: onClearFilters } : undefined}
        />
      )}

      {liveListings.map((listing) => (
        <RenterResultCard
          key={listing.id}
          listing={listing}
          selected={selectedId === listing.id}
          preference={preference}
          userId={userId}
          href={propertyHref(listing.id)}
          onSelect={onSelect}
          onHighlight={onHighlight}
          onMediaError={(path) => void refresh(path)}
        />
      ))}
    </div>
  );
});
