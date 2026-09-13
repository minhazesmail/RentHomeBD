"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Compass } from "lucide-react";
import { useState } from "react";
import styles from "@/components/landing-map-static.module.css";
import { localizeLocationLabel } from "@/i18n/presentation";
import { useLocale } from "@/i18n/use-locale";
import { getMapExperienceCopy } from "@/i18n/map-experience-copy";
import { LOCATION_PRESETS } from "@/lib/location-presets";

const NeighborhoodMap = dynamic(() => import("@/components/landing-neighborhood-map"), { ssr: false });
const areas = LOCATION_PRESETS.filter((area) => ["Dhanmondi, Dhaka", "Banani, Dhaka", "Uttara, Dhaka"].includes(area.label));

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

export function LandingMapPreviewClient({ listings }: { listings: LandingMapListing[] }) {
  const { dictionary, locale, formatCurrency } = useLocale();
  const copy = getMapExperienceCopy(locale);
  const inventoryCopy = dictionary.landing.mapPreview;
  const [selectedLabel, setSelectedLabel] = useState(areas[0].label);
  const selected = areas.find((area) => area.label === selectedLabel) ?? areas[0];
  const areaName = localizeLocationLabel(selected.label.replace(", Dhaka", ""), dictionary);
  const href = `/homes?${new URLSearchParams({ area: selected.label, radius: "5" }).toString()}`;
  const liveListings = listings.slice(0, 3);

  return (
    <div className={`landing-map-preview ${styles.preview}`} aria-label={copy.mapLabel}>
      <div className={styles.heading}>
        <div><span>{copy.eyebrow}</span><strong>{copy.title}</strong></div>
        <Compass size={24} aria-hidden="true" />
      </div>
      <div className={styles.mapFrame}>
        <div className={styles.loading}>{copy.loading}</div>
        <NeighborhoodMap areas={areas} selected={selected} onSelect={setSelectedLabel} listings={liveListings} />
        <div className={styles.areaCaption} aria-live="polite"><MapPin size={17} aria-hidden="true" /><div><small>{copy.selectedArea}</small><strong>{areaName}</strong></div></div>
      </div>
      <aside className={`landing-map-rail ${styles.rail}`} aria-label={copy.areas}>
        <div className={styles.areaButtons}>
          {areas.map((area) => (
            <button type="button" key={area.label} aria-pressed={selected.label === area.label} onClick={() => setSelectedLabel(area.label)}>
              <MapPin size={14} aria-hidden="true" />{localizeLocationLabel(area.label.replace(", Dhaka", ""), dictionary)}
            </button>
          ))}
        </div>
        {liveListings.length > 0 && <div className={styles.inventory} aria-label={copy.inventory}>
          {liveListings.map((listing) => <Link href={`/homes/${listing.id}`} key={listing.id} className={styles.home}>
            <div className={styles.thumbnail}>{listing.cover_url ? <Image src={listing.cover_url} alt="" fill sizes="56px" /> : <MapPin size={20} aria-hidden="true" />}</div>
            <div><strong>{listing.rent_bdt == null ? inventoryCopy.rentOnRequest : formatCurrency(listing.rent_bdt)}</strong><span>{listing.title || inventoryCopy.rentalHome}</span></div>
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>)}
        </div>}
        <Link className={styles.action} href={href}>{copy.explore}<ArrowUpRight size={18} aria-hidden="true" /></Link>
        <p className={styles.hint}>{copy.hint}</p>
      </aside>
    </div>
  );
}
