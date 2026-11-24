import type { SupabaseClient } from "@supabase/supabase-js";
import { LOCATION_PRESETS, type LocationPreset } from "@/lib/location-presets";

export const LANDING_PREVIEW_RADIUS = 5;
export const LANDING_PREVIEW_AREAS = LOCATION_PRESETS.filter((area) =>
  ["Dhanmondi, Dhaka", "Banani, Dhaka", "Uttara, Dhaka", "Narayanganj", "Narsingdi", "Gazipur"].includes(area.label));

export type LandingMapListing = {
  id: string;
  title: string | null;
  address_text: string | null;
  rent_bdt: number | null;
  bedrooms: number | null;
  latitude: number;
  longitude: number;
  cover_url: string | null;
};

export type NeighborhoodInventory = { status: "ready" | "unavailable"; listings: LandingMapListing[] };
type SearchRow = Omit<LandingMapListing, "cover_url"> & { cover_media_path?: string | null };

export async function loadNeighborhoodInventory(client: SupabaseClient, area: LocationPreset, signal: AbortSignal): Promise<NeighborhoodInventory> {
  try {
    const { data, error } = await client.rpc("search_available_properties", {
      center_lat: area.latitude, center_long: area.longitude, radius_km: LANDING_PREVIEW_RADIUS,
      renter_tenant_type: null, sort_mode: "distance",
    }).limit(3).abortSignal(signal);
    if (error || signal.aborted || !Array.isArray(data)) return { status: "unavailable", listings: [] };
    const rows = (data as SearchRow[]).filter(row => Number.isFinite(row.latitude) && Number.isFinite(row.longitude)).slice(0, 3);
    const paths = [...new Set(rows.flatMap(row => row.cover_media_path ? [row.cover_media_path] : []))];
    const covers = new Map<string, string>();
    if (paths.length && !signal.aborted) {
      const { data: signed } = await client.storage.from("property-media").createSignedUrls(paths, 300);
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl) covers.set(item.path, item.signedUrl);
      }
    }
    if (signal.aborted) return { status: "unavailable", listings: [] };
    return { status: "ready", listings: rows.map(row => ({
      id: row.id, title: row.title, address_text: row.address_text, rent_bdt: row.rent_bdt,
      bedrooms: row.bedrooms, latitude: row.latitude, longitude: row.longitude,
      cover_url: row.cover_media_path ? covers.get(row.cover_media_path) ?? null : null,
    })) };
  } catch {
    return { status: "unavailable", listings: [] };
  }
}
