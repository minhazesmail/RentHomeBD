"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap, ZoomControl } from "react-leaflet";
import { useTheme } from "@/theme/use-theme";
import { useLocale } from "@/i18n/use-locale";
import { localizeLocationLabel } from "@/i18n/presentation";
import { LIGHT_BASEMAP, DARK_BASEMAP } from "@/lib/map-basemaps";
import type { LocationPreset } from "@/lib/location-presets";
import type { LandingMapListing } from "@/components/landing-map-preview-client";
import chrome from "@/components/map-chrome.module.css";
import styles from "@/components/landing-map-static.module.css";

function FocusArea({ area }: { area: LocationPreset }) {
  const map = useMap();
  useEffect(() => {
    map.setView([area.latitude, area.longitude], 13, { animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches });
  }, [area, map]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export default function LandingNeighborhoodMap({ areas, selected, onSelect, listings }: {
  areas: LocationPreset[];
  selected: LocationPreset;
  onSelect: (label: string) => void;
  listings: LandingMapListing[];
}) {
  const { resolvedTheme } = useTheme();
  const { dictionary, formatCurrency } = useLocale();
  const basemap = resolvedTheme === "dark" ? DARK_BASEMAP : LIGHT_BASEMAP;
  const copy = dictionary.landing.mapPreview;
  return (
    <MapContainer center={[selected.latitude, selected.longitude]} zoom={13} scrollWheelZoom={false} zoomControl={false} className={`${styles.mapSurface} ${chrome.surface}`}>
      <TileLayer key={resolvedTheme} url={basemap.url} attribution={basemap.attribution} />
      <ZoomControl position="topright" />
      <FocusArea area={selected} />
      {areas.map((area) => (
        <CircleMarker key={area.label} center={[area.latitude, area.longitude]} radius={selected.label === area.label ? 12 : 8} pathOptions={{ color: resolvedTheme === "dark" ? "#c6e8d8" : "#ffffff", fillColor: "#0b4f3c", fillOpacity: 1, weight: 3 }} eventHandlers={{ click: () => onSelect(area.label) }}>
          <Tooltip direction="bottom" permanent>{localizeLocationLabel(area.label.replace(", Dhaka", ""), dictionary)}</Tooltip>
        </CircleMarker>
      ))}
      {listings.map((listing) => (
        <CircleMarker key={listing.id} center={[listing.latitude, listing.longitude]} radius={7} pathOptions={{ color: "#0b4f3c", fillColor: "#e8dfcf", fillOpacity: 1, weight: 2 }}>
          <Popup><Link className={styles.propertyLink} href={`/homes/${listing.id}`}><strong>{listing.title || copy.rentalHome}</strong><span>{listing.rent_bdt == null ? copy.rentOnRequest : formatCurrency(listing.rent_bdt)}</span></Link></Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
