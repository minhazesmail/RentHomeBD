import type { MapListing } from "@/components/leaflet-map";

export const MAX_CUSTOM_AREA_VERTICES = 100;
export type SortOption = "recommended" | "distance" | "rent-asc" | "rent-desc";
type SearchPolygonGeoJson = { type: "Polygon"; coordinates: [number, number][][] };

export function distanceMeters(a: [number, number], b: [number, number]) {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const deltaLat = toRadians(b[0] - a[0]);
  const deltaLong = toRadians(b[1] - a[1]);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLong / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function customAreaGeoJson(points: [number, number][]): SearchPolygonGeoJson | null {
  if (points.length < 3 || points.length > MAX_CUSTOM_AREA_VERTICES) return null;
  const ring = points.map(([lat, lng]) => [lng, lat] as [number, number]);
  return { type: "Polygon", coordinates: [[...ring, ring[0]]] };
}

export function sortedResults(listings: MapListing[], sort: SortOption) {
  const next = [...listings];
  const distance = (listing: MapListing) => listing.distance_meters ?? Number.MAX_SAFE_INTEGER;
  const rent = (listing: MapListing) => listing.rent_bdt ?? Number.MAX_SAFE_INTEGER;

  if (sort === "distance") return next.sort((a, b) => distance(a) - distance(b));
  if (sort === "rent-asc") return next.sort((a, b) => rent(a) - rent(b) || distance(a) - distance(b));
  if (sort === "rent-desc") {
    return next.sort((a, b) => {
      if (a.rent_bdt == null && b.rent_bdt == null) return distance(a) - distance(b);
      if (a.rent_bdt == null) return 1;
      if (b.rent_bdt == null) return -1;
      return b.rent_bdt - a.rent_bdt || distance(a) - distance(b);
    });
  }
  // Recommended order is computed across all matches before the server cap.
  // Re-sorting this bounded subset by distance would discard that ranking.
  return next;
}
