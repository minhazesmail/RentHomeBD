"use client";

import { Circle, CircleMarker, MapContainer, Marker, Polygon, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import { divIcon } from "leaflet";
import type { LatLngBoundsExpression } from "leaflet";

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

function FitToResults({ listings, center, liveTracking }: { listings: MapListing[]; center: [number, number]; liveTracking: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (liveTracking) {
      map.setView(center, Math.max(map.getZoom(), 15), { animate: true });
      return;
    }
    if (listings.length === 0) {
      map.setView(center, 12);
      return;
    }
    if (listings.length === 1) {
      map.setView([listings[0].latitude, listings[0].longitude], 15);
      return;
    }
    const bounds = listings.map((listing) => [listing.latitude, listing.longitude] as [number, number]) as LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
  }, [center, listings, liveTracking, map]);

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

function clusterCellSize(zoom: number) {
  if (zoom <= 10) return 0.06;
  if (zoom === 11) return 0.035;
  if (zoom === 12) return 0.018;
  if (zoom === 13) return 0.009;
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

function ClusteredListings({ listings, selectedId, onSelect }: { listings: MapListing[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const clusters = useMemo<ListingCluster[]>(() => {
    const cellSize = clusterCellSize(zoom);
    if (cellSize === 0) {
      return listings.map((listing) => ({ id: listing.id, latitude: listing.latitude, longitude: listing.longitude, listings: [listing] }));
    }

    const cells = new Map<string, MapListing[]>();
    for (const listing of listings) {
      const latCell = Math.floor(listing.latitude / cellSize);
      const lngCell = Math.floor(listing.longitude / cellSize);
      const key = `${latCell}:${lngCell}`;
      const current = cells.get(key) ?? [];
      current.push(listing);
      cells.set(key, current);
    }

    return Array.from(cells.entries()).map(([key, grouped]) => ({
      id: key,
      latitude: grouped.reduce((sum, listing) => sum + listing.latitude, 0) / grouped.length,
      longitude: grouped.reduce((sum, listing) => sum + listing.longitude, 0) / grouped.length,
      listings: grouped,
    }));
  }, [listings, zoom]);

  return clusters.map((cluster) => {
    const tone = clusterTone(cluster.listings);

    if (cluster.listings.length === 1) {
      const listing = cluster.listings[0];
      const selected = selectedId === listing.id;
      return (
        <Marker
          key={listing.id}
          position={[listing.latitude, listing.longitude]}
          icon={markerIcon(compactRent(listing.rent_bdt), tone, selected)}
          riseOnHover
          zIndexOffset={selected ? 1000 : 0}
          eventHandlers={{
            click: () => onSelect(listing.id),
            mouseover: () => onSelect(listing.id),
          }}
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

    return (
      <Marker
        key={cluster.id}
        position={[cluster.latitude, cluster.longitude]}
        icon={markerIcon(String(cluster.listings.length), tone, false, true)}
        riseOnHover
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
            <span>{tone === "neutral" ? "Mixed tenant fit" : tenantSummary(cluster.listings[0].tenant_types ?? [])}</span>
            <small>Tap the cluster to zoom in and compare individual matches.</small>
          </div>
        </Popup>
      </Marker>
    );
  });
}

export default function LeafletMap({ listings, center, radiusKm, selectedId, onSelect, userLocation, liveTracking = false, customArea = [], drawingCustomArea = false, onCustomAreaChange }: {
  listings: MapListing[];
  center: [number, number];
  radiusKm: number | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  userLocation?: UserMapLocation | null;
  liveTracking?: boolean;
  customArea?: [number, number][];
  drawingCustomArea?: boolean;
  onCustomAreaChange?: (points: [number, number][]) => void;
}) {
  const userCenter: [number, number] | null = userLocation ? [userLocation.latitude, userLocation.longitude] : null;

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className={`renter-map-canvas${drawingCustomArea ? " drawing-custom-area" : ""}`}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitToResults listings={listings} center={center} liveTracking={liveTracking} />
      <CustomAreaDrawing active={drawingCustomArea} points={customArea} onChange={onCustomAreaChange ?? (() => {})} />
      {radiusKm !== null && customArea.length < 3 && <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: "#126b4d", fillColor: "#126b4d", fillOpacity: 0.04, weight: 1 }} />}
      {customArea.length >= 2 && <Polygon positions={customArea} pathOptions={{ color: "#126b4d", fillColor: "#126b4d", fillOpacity: customArea.length >= 3 ? 0.12 : 0.04, weight: 3 }} />}
      {customArea.map((point, index) => <CircleMarker key={`custom-area-${index}`} center={point} radius={5} pathOptions={{ color: "#0b3d2e", fillColor: "#126b4d", fillOpacity: 1, weight: 2 }} />)}
      {userCenter && <><Circle center={userCenter} radius={Math.max(userLocation?.accuracy ?? 0, 5)} pathOptions={{ color: "#167d78", fillColor: "#167d78", fillOpacity: 0.08, weight: 1 }} /><CircleMarker center={userCenter} radius={9} pathOptions={{ color: "#ffffff", fillColor: "#167d78", fillOpacity: 1, weight: 4 }}><Popup><div className="map-popup"><strong>Your live location</strong><small>Accuracy ±{Math.round(userLocation?.accuracy ?? 0)} m</small></div></Popup></CircleMarker></>}
      <ClusteredListings listings={listings} selectedId={selectedId} onSelect={onSelect} />
    </MapContainer>
  );
}
