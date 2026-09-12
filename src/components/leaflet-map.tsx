"use client";

import { Circle, CircleMarker, MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { divIcon } from "leaflet";
import type { LatLngBoundsExpression } from "leaflet";

import styles from "./leaflet-map.module.css";
import { getMapWorkspaceRedesignCopy } from "@/i18n/map-workspace-redesign-copy";
import { useLocale } from "@/i18n/use-locale";
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

type MapCopy = ReturnType<typeof getMapWorkspaceRedesignCopy>["map"];

const LIGHT_MAP: MapAppearance = {
  areaStroke: "#0b4f3c",
  areaFill: "#0b4f3c",
  userLocation: "#167d78",
  userRing: "#ffffff",
};

const DARK_MAP: MapAppearance = {
  areaStroke: "#75b59f",
  areaFill: "#75b59f",
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

function FocusListing({ listings, focusId, focusVersion }: { listings: MapListing[]; focusId?: string | null; focusVersion: number }) {
  const map = useMap();

  useEffect(() => {
    if (!focusId) return;
    const listing = listings.find((item) => item.id === focusId);
    if (!listing) return;
    map.setView([listing.latitude, listing.longitude], Math.max(map.getZoom(), 15), { animate: true });
  }, [focusId, focusVersion, listings, map]);

  return null;
}

function ResponsiveMapSize() {
  const map = useMap();

  useEffect(() => {
    const host = document.querySelector<HTMLElement>("[data-mobile-sheet]");
    let delayed: number | null = null;
    const refresh = () => {
      window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
      if (delayed !== null) window.clearTimeout(delayed);
      delayed = window.setTimeout(() => map.invalidateSize({ pan: false }), 240);
    };
    const observer = host ? new MutationObserver(refresh) : null;
    if (host && observer) observer.observe(host, { attributes: true, attributeFilter: ["data-mobile-sheet", "data-mobile-view", "data-mobile-filters"] });
    window.addEventListener("resize", refresh);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", refresh);
      if (delayed !== null) window.clearTimeout(delayed);
    };
  }, [map]);

  return null;
}

function ManualMapCenter({ disabled, onChange }: { disabled: boolean; onChange?: (center: [number, number]) => void }) {
  const map = useMap();
  const userZoomRef = useRef(false);

  useMapEvents({
    dragend: () => {
      if (disabled || !onChange) return;
      const next = map.getCenter();
      onChange([next.lat, next.lng]);
    },
    zoomstart: (event) => {
      userZoomRef.current = Boolean((event as { originalEvent?: unknown }).originalEvent);
    },
    zoomend: () => {
      if (!userZoomRef.current || disabled || !onChange) return;
      userZoomRef.current = false;
      const next = map.getCenter();
      onChange([next.lat, next.lng]);
    },
  });
  return null;
}

function CustomAreaDrawing({ active, points, onChange }: { active: boolean; points: [number, number][]; onChange: (points: [number, number][]) => void }) {
  useMapEvents({
    click: (event) => {
      if (!active) return;
      onChange([...points, [event.latlng.lat, event.latlng.lng]]);
    },
  });
  return null;
}

function customAreaVertexIcon(index: number) {
  return divIcon({
    className: styles.customAreaVertexIcon,
    html: `<span>${index + 1}</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function CustomAreaVertices({ points, editable, appearance, onChange }: { points: [number, number][]; editable: boolean; appearance: MapAppearance; onChange: (points: [number, number][]) => void }) {
  if (!editable) {
    return points.map((point, index) => <CircleMarker key={`custom-area-${index}`} center={point} radius={5} pathOptions={{ color: appearance.areaStroke, fillColor: appearance.areaFill, fillOpacity: 1, weight: 2 }} />);
  }

  return points.map((point, index) => (
    <Marker
      key={`custom-area-edit-${index}`}
      position={point}
      icon={customAreaVertexIcon(index)}
      draggable
      keyboard
      autoPan
      eventHandlers={{
        dragend: (event) => {
          const next = event.target.getLatLng();
          const updated = [...points];
          updated[index] = [next.lat, next.lng];
          onChange(updated);
        },
      }}
    >
      {index === 0 && <Tooltip permanent direction="top" offset={[0, -18]}>Drag corners to adjust area</Tooltip>}
    </Marker>
  ));
}

function clusterRadiusPixels(zoom: number) {
  if (zoom <= 10) return 72;
  if (zoom === 11) return 64;
  if (zoom === 12) return 56;
  if (zoom === 13) return 48;
  return 0;
}

function clusterTone(listings: MapListing[]) {
  const tones = new Set(listings.map((listing) => tenantTone(listing.tenant_types ?? [])));
  return tones.size === 1 ? [...tones][0] : "neutral";
}

function compactRent(rent: number | null) {
  if (!rent) return "Home";
  if (rent >= 100_000) return `৳${(rent / 100_000).toFixed(rent % 100_000 === 0 ? 0 : 1)}L`;
  if (rent >= 1_000) return `৳${Math.round(rent / 1_000)}k`;
  return `৳${rent}`;
}

function markerIcon(label: string, tone: ReturnType<typeof tenantTone>, selected = false, cluster = false) {
  return divIcon({
    className: "renthome-marker-shell",
    html: `<span class="renthome-marker tenant-tone-${tone}${selected ? " is-selected" : ""}${cluster ? " cluster" : ""}">${label}</span>`,
    iconSize: cluster ? [40, 40] : [58, 40],
    iconAnchor: cluster ? [20, 20] : [14, 38],
    popupAnchor: cluster ? [0, -18] : [10, -34],
  });
}

function clusterBucketKey(cellX: number, cellY: number) {
  return `${cellX}:${cellY}`;
}

function sameCoordinate(listings: MapListing[]) {
  if (listings.length < 2) return false;
  const [first] = listings;
  return listings.every((listing) => Math.abs(listing.latitude - first.latitude) < 0.0000001 && Math.abs(listing.longitude - first.longitude) < 0.0000001);
}

function ListingMarker({ listing, selected, onSelect, copy }: { listing: MapListing; selected: boolean; onSelect: (id: string) => void; copy: MapCopy }) {
  const tone = clusterTone([listing]);
  const policy = tenantSummary(listing.tenant_types ?? []);
  return (
    <Marker
      position={[listing.latitude, listing.longitude]}
      icon={markerIcon(compactRent(listing.rent_bdt), tone, selected)}
      riseOnHover
      zIndexOffset={selected ? 1000 : 0}
      title={`${listing.title || copy.rentalProperty}. ${policy}`}
      eventHandlers={{ click: () => onSelect(listing.id) }}
    >
      <Popup>
        <div className="map-popup">
          <strong>{listing.title || copy.rentalProperty}</strong>
          <span>{listing.rent_bdt ? `৳${listing.rent_bdt.toLocaleString("en-BD")}` : copy.rentOnRequest}</span>
          <small>{policy}</small>
          <small>{listing.address_text || copy.exactLocation}</small>
        </div>
      </Popup>
    </Marker>
  );
}

function ClusteredListings({ listings, selectedId, onSelect, copy }: { listings: MapListing[]; selectedId: string | null; onSelect: (id: string) => void; copy: MapCopy }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const clusters = useMemo<ListingCluster[]>(() => {
    const clusterRadius = clusterRadiusPixels(zoom);
    if (clusterRadius === 0) {
      return listings.map((listing) => ({ id: listing.id, latitude: listing.latitude, longitude: listing.longitude, listings: [listing] }));
    }

    const working: WorkingCluster[] = [];
    const buckets = new Map<string, WorkingCluster[]>();

    function addToBucket(cluster: WorkingCluster) {
      const key = clusterBucketKey(cluster.cellX, cluster.cellY);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(cluster);
      else buckets.set(key, [cluster]);
    }

    function moveBucket(cluster: WorkingCluster, nextCellX: number, nextCellY: number) {
      if (cluster.cellX === nextCellX && cluster.cellY === nextCellY) return;
      const previousKey = clusterBucketKey(cluster.cellX, cluster.cellY);
      const previousBucket = buckets.get(previousKey);
      if (previousBucket) {
        const index = previousBucket.indexOf(cluster);
        if (index >= 0) previousBucket.splice(index, 1);
        if (previousBucket.length === 0) buckets.delete(previousKey);
      }
      cluster.cellX = nextCellX;
      cluster.cellY = nextCellY;
      addToBucket(cluster);
    }

    for (const listing of listings) {
      const point = map.project([listing.latitude, listing.longitude], zoom);
      const cellX = Math.floor(point.x / clusterRadius);
      const cellY = Math.floor(point.y / clusterRadius);
      let nearest: WorkingCluster | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          const bucket = buckets.get(clusterBucketKey(cellX + offsetX, cellY + offsetY));
          if (!bucket) continue;
          for (const candidate of bucket) {
            const distance = Math.hypot(point.x - candidate.x, point.y - candidate.y);
            if (distance <= clusterRadius && distance < nearestDistance) {
              nearest = candidate;
              nearestDistance = distance;
            }
          }
        }
      }

      if (!nearest) {
        const cluster: WorkingCluster = { listings: [listing], x: point.x, y: point.y, cellX, cellY };
        working.push(cluster);
        addToBucket(cluster);
        continue;
      }

      const previousCount = nearest.listings.length;
      nearest.listings.push(listing);
      nearest.x = (nearest.x * previousCount + point.x) / (previousCount + 1);
      nearest.y = (nearest.y * previousCount + point.y) / (previousCount + 1);
      moveBucket(nearest, Math.floor(nearest.x / clusterRadius), Math.floor(nearest.y / clusterRadius));
    }

    return working.map((cluster) => ({
      id: `cluster:${cluster.listings.map((listing) => listing.id).sort().join(":")}`,
      latitude: cluster.listings.reduce((sum, listing) => sum + listing.latitude, 0) / cluster.listings.length,
      longitude: cluster.listings.reduce((sum, listing) => sum + listing.longitude, 0) / cluster.listings.length,
      listings: cluster.listings,
    }));
  }, [listings, map, zoom]);

  const selectedListing = selectedId ? listings.find((listing) => listing.id === selectedId) ?? null : null;
  const displayClusters = useMemo(() => {
    if (!selectedId) return clusters;
    return clusters.flatMap((cluster) => {
      const remaining = cluster.listings.filter((listing) => listing.id !== selectedId);
      if (remaining.length === 0) return [];
      if (remaining.length === cluster.listings.length) return [cluster];
      return [{
        id: `${cluster.id}:without:${selectedId}`,
        latitude: remaining.reduce((sum, listing) => sum + listing.latitude, 0) / remaining.length,
        longitude: remaining.reduce((sum, listing) => sum + listing.longitude, 0) / remaining.length,
        listings: remaining,
      }];
    });
  }, [clusters, selectedId]);

  return (
    <>
      {displayClusters.map((cluster) => {
        const tone = clusterTone(cluster.listings);

        if (cluster.listings.length === 1) {
          const listing = cluster.listings[0];
          return <ListingMarker key={listing.id} listing={listing} selected={false} onSelect={onSelect} copy={copy} />;
        }

        const exactPin = sameCoordinate(cluster.listings);
        const clusterTitle = copy.clusterTitle.replace("{count}", String(cluster.listings.length));
        return (
          <Marker
            key={cluster.id}
            position={[cluster.latitude, cluster.longitude]}
            icon={markerIcon(String(cluster.listings.length), tone, false, true)}
            riseOnHover
            title={exactPin ? `${copy.samePinTitle}. ${copy.samePinHint}` : `${clusterTitle}. ${copy.clusterHint}`}
            eventHandlers={{
              click: () => {
                if (exactPin) return;
                const bounds = cluster.listings.map((listing) => [listing.latitude, listing.longitude] as [number, number]) as LatLngBoundsExpression;
                map.fitBounds(bounds, { padding: [70, 70], maxZoom: Math.min(15, zoom + 2), animate: true });
              },
            }}
          >
            <Popup>
              <div className="map-popup map-cluster-popup">
                <strong>{exactPin ? copy.samePinTitle : clusterTitle}</strong>
                <small>{exactPin ? copy.samePinHint : copy.clusterHint}</small>
                {exactPin && (
                  <div className="map-cluster-chooser">
                    {cluster.listings.map((listing) => (
                      <button key={listing.id} type="button" onClick={() => onSelect(listing.id)}>
                        <span>{listing.title || copy.rentalProperty}</span>
                        <small>{listing.rent_bdt ? compactRent(listing.rent_bdt) : copy.rentOnRequest}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
      {selectedListing && <ListingMarker key={`selected:${selectedListing.id}`} listing={selectedListing} selected onSelect={onSelect} copy={copy} />}
    </>
  );
}

export default function LeafletMap({ listings, center, radiusKm, selectedId, focusId, focusVersion = 0, onSelect, onCenterChange, userLocation, liveTracking = false, customArea = [], drawingCustomArea = false, onCustomAreaChange }: {
  listings: MapListing[];
  center: [number, number];
  radiusKm: number | null;
  selectedId: string | null;
  activeSelectedId?: string | null;
  focusId?: string | null;
  focusVersion?: number;
  onSelect: (id: string) => void;
  onCenterChange?: (center: [number, number]) => void;
  userLocation?: UserMapLocation | null;
  liveTracking?: boolean;
  customArea?: [number, number][];
  drawingCustomArea?: boolean;
  onCustomAreaChange?: (points: [number, number][]) => void;
}) {
  const { resolvedTheme } = useTheme();
  const { locale } = useLocale();
  const copy = getMapWorkspaceRedesignCopy(locale).map;
  const userCenter: [number, number] | null = userLocation ? [userLocation.latitude, userLocation.longitude] : null;
  const editingCustomArea = !drawingCustomArea && customArea.length >= 3;
  const basemap = resolvedTheme === "dark" ? DARK_BASEMAP : LIGHT_BASEMAP;
  const appearance = resolvedTheme === "dark" ? DARK_MAP : LIGHT_MAP;

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className={`renter-map-canvas basemap-${resolvedTheme}${drawingCustomArea ? " drawing-custom-area" : ""}`}>
      <TileLayer key={resolvedTheme} attribution={basemap.attribution} url={basemap.url} />
      <ResponsiveMapSize />
      <FitToResults listings={listings} center={center} liveTracking={liveTracking} />
      <FocusListing listings={listings} focusId={focusId} focusVersion={focusVersion} />
      <ManualMapCenter disabled={drawingCustomArea || editingCustomArea} onChange={onCenterChange} />
      <CustomAreaDrawing active={drawingCustomArea} points={customArea} onChange={onCustomAreaChange ?? (() => {})} />
      {radiusKm !== null && customArea.length < 3 && <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: appearance.areaStroke, fillColor: appearance.areaFill, fillOpacity: resolvedTheme === "dark" ? 0.08 : 0.04, weight: 1 }} />}
      {customArea.length >= 2 && <Polygon positions={customArea} pathOptions={{ color: appearance.areaStroke, fillColor: appearance.areaFill, fillOpacity: customArea.length >= 3 ? (resolvedTheme === "dark" ? 0.18 : 0.12) : (resolvedTheme === "dark" ? 0.08 : 0.04), weight: 3 }} />}
      <CustomAreaVertices points={customArea} editable={editingCustomArea} appearance={appearance} onChange={onCustomAreaChange ?? (() => {})} />
      {userCenter && <><Circle center={userCenter} radius={Math.max(userLocation?.accuracy ?? 0, 5)} pathOptions={{ color: appearance.userLocation, fillColor: appearance.userLocation, fillOpacity: resolvedTheme === "dark" ? 0.14 : 0.08, weight: 1 }} /><CircleMarker center={userCenter} radius={9} pathOptions={{ color: appearance.userRing, fillColor: appearance.userLocation, fillOpacity: 1, weight: 4 }}><Popup><div className="map-popup"><strong>{copy.liveLocation}</strong><small>±{Math.round(userLocation?.accuracy ?? 0)} m</small></div></Popup></CircleMarker></>}
      <ClusteredListings listings={listings} selectedId={selectedId} onSelect={onSelect} copy={copy} />
    </MapContainer>
  );
}
