import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { tenantSummary, type TenantType } from "@/lib/tenant-match";

type PropertyRow = {
  id: string;
  title: string | null;
  address_text: string | null;
  rent_bdt: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnishing: string | null;
  latitude: number | null;
  longitude: number | null;
  published_at: string | null;
};

type TenantRow = { property_id: string; tenant_type: TenantType };
type MediaRow = { property_id: string; storage_path: string; sort_order: number; created_at: string };

export type LandingFeaturedListing = PropertyRow & {
  imageUrl: string | null;
  tenantLabel: string;
};

export type LandingInventory = {
  availableCount: number;
  featuredListings: LandingFeaturedListing[];
};

const FEATURED_LIMIT = 3;
const IMAGE_TTL_SECONDS = 300;

export async function getLandingInventory(): Promise<LandingInventory> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }) as unknown as SupabaseClient;

  const [{ count }, { data: propertyData, error: propertyError }] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "available"),
    supabase
      .from("properties")
      .select("id, title, address_text, rent_bdt, bedrooms, bathrooms, furnishing, latitude, longitude, published_at")
      .eq("status", "available")
      .order("published_at", { ascending: false })
      .limit(FEATURED_LIMIT),
  ]);

  if (propertyError) {
    console.error("Could not load landing inventory", propertyError.message);
    return { availableCount: count ?? 0, featuredListings: [] };
  }

  const properties = (propertyData ?? []) as PropertyRow[];
  if (!properties.length) return { availableCount: count ?? 0, featuredListings: [] };

  const propertyIds = properties.map((property) => property.id);
  const [{ data: tenantData }, { data: mediaData }] = await Promise.all([
    supabase.from("property_tenant_types").select("property_id, tenant_type").in("property_id", propertyIds),
    supabase
      .from("property_media")
      .select("property_id, storage_path, sort_order, created_at")
      .in("property_id", propertyIds)
      .eq("media_type", "photo")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const tenantTypes = new Map<string, TenantType[]>();
  for (const row of (tenantData ?? []) as TenantRow[]) {
    tenantTypes.set(row.property_id, [...(tenantTypes.get(row.property_id) ?? []), row.tenant_type]);
  }

  const coverPaths = new Map<string, string>();
  for (const row of (mediaData ?? []) as MediaRow[]) {
    if (!coverPaths.has(row.property_id)) coverPaths.set(row.property_id, row.storage_path);
  }

  const featuredListings = await Promise.all(
    properties.map(async (property) => {
      const coverPath = coverPaths.get(property.id);
      let imageUrl: string | null = null;
      if (coverPath) {
        const { data: signed } = await supabase.storage.from("property-media").createSignedUrl(coverPath, IMAGE_TTL_SECONDS);
        imageUrl = signed?.signedUrl ?? null;
      }

      return {
        ...property,
        imageUrl,
        tenantLabel: tenantSummary(tenantTypes.get(property.id) ?? []),
      };
    }),
  );

  return { availableCount: count ?? featuredListings.length, featuredListings };
}
