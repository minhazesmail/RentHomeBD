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

function FitToResults({ listings, center }: { listings: MapListing[]; center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
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
  }, [center, listings, map]);

  return null;
}

export default function LeafletMap({
  listings,
  center,
  radiusKm,
  selectedId,
  onSelect,
}: {
  listings: MapListing[];
  center: [number, number];
  radiusKm: number | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="renter-map-canvas">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToResults listings={listings} center={center} />
      {radiusKm !== null && <Circle center={center} radius={radiusKm * 1000} pathOptions={{ fillOpacity: 0.04, weight: 1 }} />}
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
