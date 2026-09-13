"use client";

import { divIcon } from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";

import chrome from "@/components/map-chrome.module.css";
import { LIGHT_BASEMAP, DARK_BASEMAP } from "@/lib/map-basemaps";
import { useTheme } from "@/theme/use-theme";
import { useLocale } from "@/i18n/use-locale";
import { getMapExperienceCopy } from "@/i18n/map-experience-copy";

const DHAKA_CENTER: [number, number] = [23.8103, 90.4125];

function Recenter({ position, zoom }: { position: [number, number]; zoom: number }) {
  const map = useMap();
  const [latitude, longitude] = position;

  useEffect(() => {
    map.setView([latitude, longitude], Math.max(map.getZoom(), zoom), { animate: true });
  }, [latitude, longitude, map, zoom]);

  return null;
}

function ClickToPlace({ disabled, onChange }: { disabled: boolean; onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (event) => {
      if (!disabled) onChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export function OwnerLocationPicker({
  latitude,
  longitude,
  focusPosition = null,
  disabled = false,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  focusPosition?: [number, number] | null;
  disabled?: boolean;
  onChange: (lat: number, lng: number) => void;
}) {
  const { resolvedTheme } = useTheme();
  const { locale } = useLocale();
  const copy = getMapExperienceCopy(locale);
  const basemap = resolvedTheme === "dark" ? DARK_BASEMAP : LIGHT_BASEMAP;
  const exactPosition: [number, number] | null = latitude !== null && longitude !== null
    ? [latitude, longitude]
    : null;
  const viewportPosition = focusPosition ?? exactPosition ?? DHAKA_CENTER;
  const viewportZoom = focusPosition ? 14 : exactPosition ? 16 : 12;

  const markerIcon = useMemo(() => divIcon({
    className: "owner-location-marker-wrap",
    html: '<span class="owner-location-marker"><span></span></span>',
    iconSize: [38, 46],
    iconAnchor: [19, 44],
  }), []);

  return (
    <div className="owner-location-map" aria-label={copy.pickerLabel}>
      <MapContainer center={viewportPosition} zoom={viewportZoom} scrollWheelZoom zoomControl={false} className={`owner-location-map-canvas ${chrome.surface}`}>
        <TileLayer key={resolvedTheme} attribution={basemap.attribution} url={basemap.url} />
        <ZoomControl position="topright" />
        <ClickToPlace disabled={disabled} onChange={onChange} />
        {(exactPosition || focusPosition) && <Recenter position={viewportPosition} zoom={viewportZoom} />}
        {exactPosition && (
          <Marker
            position={exactPosition}
            icon={markerIcon}
            draggable={!disabled}
            eventHandlers={{
              dragend: (event) => {
                const next = event.target.getLatLng();
                onChange(next.lat, next.lng);
              },
            }}
          />
        )}
      </MapContainer>
      <div className="owner-location-map-tip">
        <strong>{focusPosition ? copy.pickerArea : exactPosition ? copy.pickerPlaced : copy.pickerPlace}</strong>
        <span>{disabled ? copy.pickerLocked : focusPosition ? copy.pickerApprox : exactPosition ? copy.pickerDrag : copy.pickerClick}</span>
      </div>
    </div>
  );
}
