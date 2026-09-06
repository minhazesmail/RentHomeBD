"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import styles from "@/components/landing-map-static.module.css";
import { interpolate, localizeLocationLabel } from "@/i18n/presentation";
import { useLocale } from "@/i18n/use-locale";

export type LandingMapListing = {
  id: string;
  title: string | null;
  address_text: string | null;
  rent_bdt: number | null;
  bedrooms: number | null;
  latitude: number;
  longitude: number;
  cover_url: string | null;
};

const previewLabels = [
  { name: "Dhanmondi", left: "20%", top: "68%" },
  { name: "Banani", left: "62%", top: "29%" },
  { name: "Gulshan", left: "74%", top: "19%" },
  { name: "Tejgaon", left: "48%", top: "43%" },
  { name: "Uttara", left: "51%", top: "10%" },
];

function pinPosition(listing: LandingMapListing, index: number) {
  const minLat = 23.68;
  const maxLat = 23.9;
  const minLng = 90.32;
  const maxLng = 90.48;
  const rawLeft = ((listing.longitude - minLng) / (maxLng - minLng)) * 76 + 12;
  const rawTop = (1 - (listing.latitude - minLat) / (maxLat - minLat)) * 72 + 12;
  const fallbackLeft = 24 + index * 24;
  const fallbackTop = 36 + (index % 2) * 24;
  return {
    left: `${Math.min(88, Math.max(12, Number.isFinite(rawLeft) ? rawLeft : fallbackLeft))}%`,
    top: `${Math.min(84, Math.max(16, Number.isFinite(rawTop) ? rawTop : fallbackTop))}%`,
  };
}

export function LandingMapPreviewClient({ listings }: { listings: LandingMapListing[] }) {
  const { dictionary, formatCurrency, formatNumber } = useLocale();
  const copy = dictionary.landing.mapPreview;
  const liveListings = listings.slice(0, 3);
  const discoveryAreas = [
    { name: "Dhanmondi", note: copy.dhanmondiNote, href: "/homes?area=Dhanmondi&radius=5", tone: "sage" },
    { name: "Banani", note: copy.bananiNote, href: "/homes?area=Banani&radius=5", tone: "sand" },
    { name: "Uttara", note: copy.uttaraNote, href: "/homes?area=Uttara&radius=5", tone: "sky" },
  ];
  const money = (value: number | null) => value != null ? formatCurrency(value) : copy.rentOnRequest;
  const recentHomes = liveListings.length === 1
    ? copy.recentHomesOne
    : interpolate(copy.recentHomesMany, { count: formatNumber(liveListings.length, { useGrouping: false }) });

  return (
    <div className="landing-map-preview" aria-label={copy.previewAria}>
      <div className="landing-map-canvas-shell">
        <div className={styles.mapSurface} aria-label={copy.decorativeMapAria}>
          {previewLabels.map((label) => <span className={styles.mapLabel} style={{ left: label.left, top: label.top }} key={label.name}>{localizeLocationLabel(label.name, dictionary)}</span>)}

          {liveListings.map((listing, index) => {
            const position = pinPosition(listing, index);
            return (
              <Link className={styles.pinLink} href={`/homes/${listing.id}`} style={position} aria-label={`${listing.title || copy.rentalHome} · ${money(listing.rent_bdt)}`} key={listing.id}>
                <span className={styles.pin}><span>{formatNumber(index + 1, { useGrouping: false })}</span></span>
              </Link>
            );
          })}

          {!liveListings.length && <div className={styles.emptyState}><strong>{copy.emptyTitle}</strong><span>{copy.emptyDescription}</span></div>}
        </div>
      </div>

      <aside className="landing-map-rail" aria-label={liveListings.length ? copy.availableHomesAria : copy.suggestedPlacesAria}>
        <div className="landing-map-rail-heading"><div><span>{liveListings.length ? copy.liveNearYou : copy.startExploring}</span><strong>{liveListings.length ? recentHomes : copy.popularAreas}</strong></div><MapPin aria-hidden="true" /></div>

        <div className="landing-map-rail-list">
          {liveListings.length ? liveListings.map((listing) => (
            <Link className="landing-map-property-card" href={`/homes/${listing.id}`} key={listing.id}>
              <div className="landing-map-property-image">{listing.cover_url ? <Image src={listing.cover_url} alt="" fill sizes="240px" /> : <span aria-hidden="true">⌂</span>}<small>{copy.moderated}</small></div>
              <div className="landing-map-property-copy">
                <span>{listing.address_text || copy.exactLocationPinned}</span>
                <strong>{listing.title || copy.rentalHome}</strong>
                <div><b>{money(listing.rent_bdt)}</b><small>{listing.bedrooms == null ? "—" : formatNumber(listing.bedrooms, { useGrouping: false })} {copy.bed}</small></div>
              </div>
            </Link>
          )) : discoveryAreas.map((area, index) => (
            <Link className={`landing-map-area-card tone-${area.tone}`} href={area.href} key={area.name}>
              <span className="landing-map-area-number">{formatNumber(index + 1, { minimumIntegerDigits: 2, useGrouping: false })}</span>
              <div><strong>{localizeLocationLabel(area.name, dictionary)}</strong><small>{area.note}</small></div>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </div>

        <Link className="landing-map-rail-action" href="/homes">{copy.browseFullMap} <ArrowUpRight aria-hidden="true" /></Link>
      </aside>

      <div className="landing-map-floating-note"><span aria-hidden="true" />{copy.floatingNote}</div>
    </div>
  );
}
