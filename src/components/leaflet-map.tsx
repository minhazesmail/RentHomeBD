"use client";

import { Circle, CircleMarker, MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { divIcon } from "leaflet";
import type { LatLngBoundsExpression } from "leaflet";

import styles from "./leaflet-map.module.css";
import { tenantSummary, tenantTone, type TenantType } from "@/lib/tenant-match";

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

function CustomAreaVertices({ points, editable, onChange }: { points: [number, number][]; editable: boolean; onChange: (points: [number, number][]) => void }) {
  if (!editable) {
    return points.map((point, index) => <CircleMarker key={`custom-area-${index}`} center={point} radius={5} pathOptions={{ color: "#0b3d2e", fillColor: "#126b4d", fillOpacity: 1, weight: 2 }} />);
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

function ListingMarker({ listing, selected, onSelect }: { listing: MapListing; selected: boolean; onSelect: (id: string) => void }) {
  const tone = clusterTone([listing]);
  return (
    <Marker
      position={[listing.latitude, listing.longitude]}
      icon={markerIcon(compactRent(listing.rent_bdt), tone, selected)}
      riseOnHover
      zIndexOffset={selected ? 1000 : 0}
      title={listing.title || "Rental property"}
      eventHandlers={{ click: () => onSelect(listing.id) }}
    >
      <Popup>
        <div className="map-popup">
          <strong>{listing.title || "Rental property"}</strong>
          <span>{listing.rent_bdt ? `৳${listing.rent_bdt.toLocaleString("en-BD")}/month` : "Rent on request"}</span>
          <small>{tenantSummary(listing.tenant_types ?? [])}</small>
          <small>{listing.address_text || "Exact location shown on map"}</small>
        </div>
      </Popup>
    </Marker>
  );
}

function ClusteredListings({ listings, selectedId, onSelect }: { listings: MapListing[]; selectedId: string | null; onSelect: (id: string) => void }) {
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
          return <ListingMarker key={listing.id} listing={listing} selected={false} onSelect={onSelect} />;
        }

        return (
          <Marker
            key={cluster.id}
            position={[cluster.latitude, cluster.longitude]}
            icon={markerIcon(String(cluster.listings.length), tone, false, true)}
            riseOnHover
            title={`${cluster.listings.length} homes in this area. Activate to zoom in.`}
            eventHandlers={{
              click: () => {
                const bounds = cluster.listings.map((listing) => [listing.latitude, listing.longitude] as [number, number]) as LatLngBoundsExpression;
                map.fitBounds(bounds, { padding: [70, 70], maxZoom: Math.min(15, zoom + 2), animate: true });
              },
            }}
          >
            <Popup>
              <div className="map-popup map-cluster-popup">
                <strong>{cluster.listings.length} homes in this area</strong>
                <span>{tone === "neutral" ? "Mixed renter fit" : tenantSummary(cluster.listings[0].tenant_types ?? [])}</span>
                <small>Activate the cluster to zoom in and compare individual homes.</small>
              </div>
            </Popup>
          </Marker>
        );
      })}
      {selectedListing && <ListingMarker key={`selected:${selectedListing.id}`} listing={selectedListing} selected onSelect={onSelect} />}
    </>
  );
}

export default function LeafletMap({ listings, center, radiusKm, selectedId, onSelect, onCenterChange, userLocation, liveTracking = false, customArea = [], drawingCustomArea = false, onCustomAreaChange }: {
  listings: MapListing[];
  center: [number, number];
  radiusKm: number | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCenterChange?: (center: [number, number]) => void;
  userLocation?: UserMapLocation | null;
  liveTracking?: boolean;
  customArea?: [number, number][];
  drawingCustomArea?: boolean;
  onCustomAreaChange?: (points: [number, number][]) => void;
}) {
  const userCenter: [number, number] | null = userLocation ? [userLocation.latitude, userLocation.longitude] : null;
  const editingCustomArea = !drawingCustomArea && customArea.length >= 3;

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className={`renter-map-canvas${drawingCustomArea ? " drawing-custom-area" : ""}`}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitToResults listings={listings} center={center} liveTracking={liveTracking} />
      <ManualMapCenter disabled={drawingCustomArea || editingCustomArea} onChange={onCenterChange} />
      <CustomAreaDrawing active={drawingCustomArea} points={customArea} onChange={onCustomAreaChange ?? (() => {})} />
      {radiusKm !== null && customArea.length < 3 && <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: "#126b4d", fillColor: "#126b4d", fillOpacity: 0.04, weight: 1 }} />}
      {customArea.length >= 2 && <Polygon positions={customArea} pathOptions={{ color: "#126b4d", fillColor: "#126b4d", fillOpacity: customArea.length >= 3 ? 0.12 : 0.04, weight: 3 }} />}
      <CustomAreaVertices points={customArea} editable={editingCustomArea} onChange={onCustomAreaChange ?? (() => {})} />
      {userCenter && <><Circle center={userCenter} radius={Math.max(userLocation?.accuracy ?? 0, 5)} pathOptions={{ color: "#167d78", fillColor: "#167d78", fillOpacity: 0.08, weight: 1 }} /><CircleMarker center={userCenter} radius={9} pathOptions={{ color: "#ffffff", fillColor: "#167d78", fillOpacity: 1, weight: 4 }}><Popup><div className="map-popup"><strong>Your live location</strong><small>Accuracy ±{Math.round(userLocation?.accuracy ?? 0)} m</small></div></Popup></CircleMarker></>}
      <ClusteredListings listings={listings} selectedId={selectedId} onSelect={onSelect} />
    </MapContainer>
  );
}
