"use client";

import { divIcon } from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

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
    <div className="owner-location-map" aria-label="Exact property location picker">
      <MapContainer center={viewportPosition} zoom={viewportZoom} scrollWheelZoom className="owner-location-map-canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
        <strong>{focusPosition ? "Map centered near the typed area" : exactPosition ? "Exact pin placed" : "Place the property pin"}</strong>
        <span>{disabled ? "Location is locked for this listing." : focusPosition ? "This is only an approximate area. Click the actual building entrance to place the exact pin." : exactPosition ? "Drag the pin to the building gate, or click elsewhere on the map." : "Click the map where the building entrance is located."}</span>
      </div>
    </div>
  );
}
