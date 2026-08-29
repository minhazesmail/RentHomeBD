"use client";

import { divIcon } from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

const DHAKA_CENTER: [number, number] = [23.8103, 90.4125];

function Recenter({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, Math.max(map.getZoom(), 16), { animate: true });
  }, [map, position]);

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
  disabled = false,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  disabled?: boolean;
  onChange: (lat: number, lng: number) => void;
}) {
  const position: [number, number] = latitude !== null && longitude !== null
    ? [latitude, longitude]
    : DHAKA_CENTER;

  const markerIcon = useMemo(() => divIcon({
    className: "owner-location-marker-wrap",
    html: '<span class="owner-location-marker"><span></span></span>',
    iconSize: [38, 46],
    iconAnchor: [19, 44],
  }), []);

  return (
    <div className="owner-location-map" aria-label="Exact property location picker">
      <MapContainer center={position} zoom={latitude !== null && longitude !== null ? 16 : 12} scrollWheelZoom className="owner-location-map-canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlace disabled={disabled} onChange={onChange} />
        {latitude !== null && longitude !== null && <Recenter position={position} />}
        {latitude !== null && longitude !== null && (
          <Marker
            position={position}
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
        <strong>{latitude !== null && longitude !== null ? "Exact pin placed" : "Place the property pin"}</strong>
        <span>{disabled ? "Location is locked for this listing." : latitude !== null && longitude !== null ? "Drag the pin to the building gate, or click elsewhere on the map." : "Click the map where the building entrance is located."}</span>
      </div>
    </div>
  );
}
