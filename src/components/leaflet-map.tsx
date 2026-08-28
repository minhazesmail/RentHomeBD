"use client";

import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
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
      {listings.map((listing) => (
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
      ))}
    </MapContainer>
  );
}
