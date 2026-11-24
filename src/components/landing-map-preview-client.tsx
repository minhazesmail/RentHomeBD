"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Compass } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import styles from "@/components/landing-map-static.module.css";
import { localizeLocationLabel } from "@/i18n/presentation";
import { useLocale } from "@/i18n/use-locale";
import { getMapExperienceCopy } from "@/i18n/map-experience-copy";
import { LANDING_PREVIEW_AREAS as areas, LANDING_PREVIEW_RADIUS, loadNeighborhoodInventory, type NeighborhoodInventory } from "@/lib/landing-neighborhood-inventory";
export type { LandingMapListing } from "@/lib/landing-neighborhood-inventory";

const NeighborhoodMap = dynamic(() => import("@/components/landing-neighborhood-map"), { ssr: false });
export function LandingMapPreviewClient({ initialInventory }: { initialInventory: NeighborhoodInventory }) {
  const { dictionary, locale, formatCurrency } = useLocale();
  const copy = getMapExperienceCopy(locale);
  const inventoryCopy = dictionary.landing.mapPreview;
  const [selectedLabel, setSelectedLabel] = useState(areas[0].label);
  const selected = areas.find((area) => area.label === selectedLabel) ?? areas[0];
  const areaName = localizeLocationLabel(selected.label.replace(", Dhaka", ""), dictionary);
  const href = `/homes?${new URLSearchParams({ area: selected.label, radius: String(LANDING_PREVIEW_RADIUS) }).toString()}`;
  const [inventory, setInventory] = useState<{ area: string; value: NeighborhoodInventory }>({ area: areas[0].label, value: initialInventory });
  const [loading, setLoading] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  async function selectArea(label: string) {
    const area = areas.find(item => item.label === label);
    if (!area) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setSelectedLabel(label);
    setLoading(true);
    const timeout = setTimeout(() => {
      controller.abort();
      if (requestRef.current === controller) {
        setInventory({ area: label, value: { status: "unavailable", listings: [] } });
        setLoading(false);
      }
    }, 8000);
    const value = await loadNeighborhoodInventory(createClient() as unknown as SupabaseClient, area, controller.signal);
    clearTimeout(timeout);
    if (requestRef.current !== controller || controller.signal.aborted) return;
    setInventory({ area: label, value });
    setLoading(false);
  }

  const current = !loading && inventory.area === selected.label ? inventory.value : null;
  const liveListings = current?.listings ?? [];

  return (
    <div className={`landing-map-preview ${styles.preview}`} aria-label={copy.mapLabel}>
      <div className={styles.heading}>
        <div><span>{copy.eyebrow}</span><strong>{copy.title}</strong></div>
        <Compass size={24} aria-hidden="true" />
      </div>
      <div className={styles.mapFrame}>
        <div className={styles.loading}>{copy.loading}</div>
        <NeighborhoodMap areas={areas} selected={selected} onSelect={(label) => void selectArea(label)} listings={liveListings} />
        <div className={styles.areaCaption} aria-live="polite"><MapPin size={17} aria-hidden="true" /><div><small>{copy.selectedArea}</small><strong>{areaName}</strong></div></div>
      </div>
      <aside className={`landing-map-rail ${styles.rail}`} aria-label={copy.areas}>
        <div className={styles.areaButtons}>
          {areas.map((area) => (
            <button type="button" key={area.label} aria-pressed={selected.label === area.label} onClick={() => void selectArea(area.label)}>
              <MapPin size={14} aria-hidden="true" />{localizeLocationLabel(area.label.replace(", Dhaka", ""), dictionary)}
            </button>
          ))}
        </div>
        <p className={styles.hint} role="status" data-neighborhood-inventory={current?.status ?? "loading"}>
          {!current ? copy.inventoryLoading : current.status === "unavailable" ? copy.inventoryUnavailable : liveListings.length ? copy.inventory : copy.inventoryEmpty}
        </p>
        {current?.status === "unavailable" && <button type="button" className="secondary-button" onClick={() => void selectArea(selected.label)}>{copy.retryInventory}</button>}
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
