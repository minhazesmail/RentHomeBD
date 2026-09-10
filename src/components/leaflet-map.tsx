"use client";

import { Circle, CircleMarker, MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { divIcon } from "leaflet";
import type { LatLngBoundsExpression } from "leaflet";

import styles from "./leaflet-map.module.css";
import { tenantSummary, tenantTone, type TenantType } from "@/lib/tenant-match";
import { useTheme } from "@/theme/use-theme";

export type MapListing = {
  id: string;
  title: string | null;
  address_text: string | null;
  property_type: string | null;
  rent_bdt: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnishing: string;
  available_from: string | null;
  latitude: number;
  longitude: number;
  distance_meters: number | null;
  cover_media_path: string | null;
  total_matches?: number;
  results_truncated?: boolean;
  cover_url?: string | null;
  tenant_types?: TenantType[];
};

export type UserMapLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type ListingCluster = {
  id: string;
  latitude: number;
  longitude: number;
  listings: MapListing[];
};

type WorkingCluster = {
  listings: MapListing[];
  x: number;
  y: number;
  cellX: number;
  cellY: number;
};

type MapAppearance = {
  areaStroke: string;
  areaFill: string;
  userLocation: string;
  userRing: string;
};

const LIGHT_MAP: MapAppearance = {
  areaStroke: "#126b4d",
  areaFill: "#126b4d",
  userLocation: "#167d78",
  userRing: "#ffffff",
};

const DARK_MAP: MapAppearance = {
  areaStroke: "#65d8a8",
  areaFill: "#42b987",
  userLocation: "#66d4cc",
  userRing: "#07130f",
};

const LIGHT_BASEMAP = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

const DARK_BASEMAP = {
  url: "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

function FitToResults({ listings, center, liveTracking }: { listings: MapListing[]; center: [number, number]; liveTracking: boolean }) {
  const map = useMap();
  const centerRef = useRef(center);

  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  useEffect(() => {
    if (!liveTracking) return;
    map.setView(center, Math.max(map.getZoom(), 15), { animate: true });
  }, [center, liveTracking, map]);

  useEffect(() => {
    if (liveTracking) return;
    const searchCenter = centerRef.current;
    if (listings.length === 0) {
      map.setView(searchCenter, 12);
      return;
    }
    if (listings.length === 1) {
      map.setView([listings[0].latitude, listings[0].longitude], 15);
      return;
    }
    const bounds = listings.map((listing) => [listing.latitude, listing.longitude] as [number, number]) as LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
  }, [listings, liveTracking, map]);

  return null;
}

function ManualMapCenter({ disabled, onChange }: { disabled: boolean; onChange?: (center: [number, number]) => void }) {
  const map = useMap();
  useMapEvents({
    dragend: () => {
      if (disabled || !onChange) return;
      const next = map.getCenter();
      onChange([next.lat, next.lng]);
    },
  });
  return null;
}

function DrawCustomArea({ active, points, onChange }: { active: boolean; points: [number, number][]; onChange?: (points: [number, number][]) => void }) {
  useMapEvents({
    click: (event) => {
      if (!active || !onChange) return;
      onChange([...points, [event.latlng.lat, event.latlng.lng]]);
    },
  });
  return null;
}

function clusterListings(listings: MapListing[], zoom: number) {
  if (listings.length <= 1 || zoom >= 16) {
    return listings.map<ListingCluster>((listing) => ({ id: listing.id, latitude: listing.latitude, longitude: listing.longitude, listings: [listing] }));
  }

  const scale = 256 * 2 ** zoom;
  const cellSize = zoom <= 11 ? 62 : zoom <= 13 ? 54 : 46;
  const buckets = new Map<string, WorkingCluster>();

  for (const listing of listings) {
    const normalizedX = (listing.longitude + 180) / 360;
    const latitudeRadians = listing.latitude * Math.PI / 180;
    const normalizedY = (1 - Math.log(Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)) / Math.PI) / 2;
    const x = normalizedX * scale;
    const y = normalizedY * scale;
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    const key = `${cellX}:${cellY}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.listings.push(listing);
      existing.x += x;
      existing.y += y;
    } else {
      buckets.set(key, { listings: [listing], x, y, cellX, cellY });
    }
  }

  return [...buckets.values()].map<ListingCluster>((cluster) => {
    const count = cluster.listings.length;
    return {
      id: count === 1 ? cluster.listings[0].id : `cluster:${cluster.cellX}:${cluster.cellY}`,
      latitude: cluster.listings.reduce((sum, listing) => sum + listing.latitude, 0) / count,
      longitude: cluster.listings.reduce((sum, listing) => sum + listing.longitude, 0) / count,
      listings: cluster.listings,
    };
  });
}

function MapListings({ listings, selectedId, onSelect }: { listings: MapListing[]; selectedId: string | null; onSelect?: (id: string) => void }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const clusters = useMemo(() => clusterListings(listings, zoom), [listings, zoom]);

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.listings.length > 1) {
          return (
            <Marker
              key={cluster.id}
              position={[cluster.latitude, cluster.longitude]}
              icon={divIcon({
                className: styles.clusterMarker,
                html: `<span>${cluster.listings.length}</span>`,
                iconSize: [42, 42],
                iconAnchor: [21, 21],
              })}
              eventHandlers={{
                click: () => {
                  const bounds = cluster.listings.map((listing) => [listing.latitude, listing.longitude] as [number, number]) as LatLngBoundsExpression;
                  map.fitBounds(bounds, { padding: [48, 48], maxZoom: Math.min(17, zoom + 2) });
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -20]}>{cluster.listings.length} homes</Tooltip>
            </Marker>
          );
        }

        const listing = cluster.listings[0];
        const selected = selectedId === listing.id;
        const tone = tenantTone(listing.tenant_types ?? []);
        const icon = divIcon({
          className: `${styles.priceMarker} ${styles[`tenant_${tone}`] ?? styles.tenant_neutral}${selected ? ` ${styles.selected}` : ""}`,
          html: `<span>${listing.rent_bdt ? `৳${Math.round(listing.rent_bdt / 1000)}k` : "Home"}</span>`,
          iconSize: [64, 34],
          iconAnchor: [32, 17],
        });
        return (
          <Marker
            key={listing.id}
            position={[listing.latitude, listing.longitude]}
            icon={icon}
            zIndexOffset={selected ? 500 : 0}
            eventHandlers={{ click: () => onSelect?.(listing.id) }}
          >
            <Tooltip direction="top" offset={[0, -18]}>{listing.title || "Rental property"}</Tooltip>
            <Popup>
              <strong>{listing.title || "Rental property"}</strong><br />
              {tenantSummary(listing.tenant_types ?? [])}<br />
              {listing.rent_bdt ? `৳${listing.rent_bdt.toLocaleString("en-BD")}/month` : "Rent on request"}
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export default function LeafletMap({
  listings,
  center,
  radiusKm,
  selectedId = null,
  onSelect,
  onCenterChange,
  userLocation,
  liveTracking = false,
  customArea = [],
  drawingCustomArea = false,
  onCustomAreaChange,
}: {
  listings: MapListing[];
  center: [number, number];
  radiusKm: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onCenterChange?: (center: [number, number]) => void;
  userLocation?: UserMapLocation | null;
  liveTracking?: boolean;
  customArea?: [number, number][];
  drawingCustomArea?: boolean;
  onCustomAreaChange?: (points: [number, number][]) => void;
}) {
  const { resolvedTheme } = useTheme();
  const mapAppearance = resolvedTheme === "dark" ? DARK_MAP : LIGHT_MAP;
  const basemap = resolvedTheme === "dark" ? DARK_BASEMAP : LIGHT_BASEMAP;

  return (
    <MapContainer center={center} zoom={12} className={styles.map} scrollWheelZoom>
      <TileLayer key={resolvedTheme} attribution={basemap.attribution} url={basemap.url} />
      <FitToResults listings={listings} center={center} liveTracking={liveTracking} />
      <ManualMapCenter disabled={drawingCustomArea || liveTracking} onChange={onCenterChange} />
      <DrawCustomArea active={drawingCustomArea} points={customArea} onChange={onCustomAreaChange} />
      <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: mapAppearance.areaStroke, fillColor: mapAppearance.areaFill, fillOpacity: 0.08, weight: 1.5 }} />
      {customArea.length >= 3 && <Polygon positions={customArea} pathOptions={{ color: mapAppearance.areaStroke, fillColor: mapAppearance.areaFill, fillOpacity: 0.14, weight: 2 }} />}
      {userLocation && (
        <>
          <Circle center={[userLocation.latitude, userLocation.longitude]} radius={userLocation.accuracy} pathOptions={{ color: mapAppearance.userLocation, fillColor: mapAppearance.userLocation, fillOpacity: 0.08, weight: 1 }} />
          <CircleMarker center={[userLocation.latitude, userLocation.longitude]} radius={7} pathOptions={{ color: mapAppearance.userRing, fillColor: mapAppearance.userLocation, fillOpacity: 1, weight: 3 }} />
        </>
      )}
      <MapListings listings={listings} selectedId={selectedId} onSelect={onSelect} />
    </MapContainer>
  );
}
