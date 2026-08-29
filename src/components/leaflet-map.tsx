"use client";

import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import type { LatLngBoundsExpression } from "leaflet";

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

function FitToResults({
  listings,
  center,
  liveTracking,
}: {
  listings: MapListing[];
  center: [number, number];
  liveTracking: boolean;
}) {
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

function clusterCellSize(zoom: number) {
  if (zoom <= 10) return 0.06;
  if (zoom === 11) return 0.035;
  if (zoom === 12) return 0.018;
  if (zoom === 13) return 0.009;
  return 0;
}

function ClusteredListings({
  listings,
  selectedId,
  onSelect,
}: {
  listings: MapListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  const clusters = useMemo<ListingCluster[]>(() => {
    const cellSize = clusterCellSize(zoom);
    if (cellSize === 0) {
      return listings.map((listing) => ({
        id: listing.id,
        latitude: listing.latitude,
        longitude: listing.longitude,
        listings: [listing],
      }));
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
    if (cluster.listings.length === 1) {
      const listing = cluster.listings[0];
      return (
        <CircleMarker
          key={listing.id}
          center={[listing.latitude, listing.longitude]}
          radius={selectedId === listing.id ? 11 : 8}
          pathOptions={{ fillOpacity: 0.92, weight: selectedId === listing.id ? 4 : 2 }}
          eventHandlers={{ click: () => onSelect(listing.id) }}
        >
          <Popup>
            <div className="map-popup">
              <strong>{listing.title || "Rental property"}</strong>
              <span>{listing.rent_bdt ? `৳${listing.rent_bdt.toLocaleString("en-BD")}/month` : "Rent on request"}</span>
              <small>{listing.address_text || "Exact location shown on map"}</small>
            </div>
          </Popup>
        </CircleMarker>
      );
    }

    const radius = Math.min(22, 11 + Math.log2(cluster.listings.length) * 3);
    return (
      <CircleMarker
        key={cluster.id}
        center={[cluster.latitude, cluster.longitude]}
        radius={radius}
        pathOptions={{ fillOpacity: 0.95, weight: 3 }}
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
            <span>Tap the cluster to zoom in</span>
            <small>Individual property pins appear as you get closer.</small>
          </div>
        </Popup>
      </CircleMarker>
    );
  });
}

export default function LeafletMap({
  listings,
  center,
  radiusKm,
  selectedId,
  onSelect,
  userLocation,
  liveTracking = false,
}: {
  listings: MapListing[];
  center: [number, number];
  radiusKm: number | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  userLocation?: UserMapLocation | null;
  liveTracking?: boolean;
}) {
  const userCenter: [number, number] | null = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : null;

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="renter-map-canvas">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToResults listings={listings} center={center} liveTracking={liveTracking} />
      {radiusKm !== null && <Circle center={center} radius={radiusKm * 1000} pathOptions={{ fillOpacity: 0.04, weight: 1 }} />}
      {userCenter && (
        <>
          <Circle
            center={userCenter}
            radius={Math.max(userLocation?.accuracy ?? 0, 5)}
            pathOptions={{ fillOpacity: 0.08, weight: 1 }}
          />
          <CircleMarker
            center={userCenter}
            radius={9}
            pathOptions={{ fillOpacity: 1, weight: 4 }}
          >
            <Popup>
              <div className="map-popup">
                <strong>Your live location</strong>
                <small>Accuracy ±{Math.round(userLocation?.accuracy ?? 0)} m</small>
              </div>
            </Popup>
          </CircleMarker>
        </>
      )}
      <ClusteredListings listings={listings} selectedId={selectedId} onSelect={onSelect} />
    </MapContainer>
  );
}
