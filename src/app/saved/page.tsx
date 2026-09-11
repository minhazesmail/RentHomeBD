import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ProductNavigation } from "@/components/product-navigation";
import { SavedHomesWorkspace, type SavedHome } from "@/components/saved-homes-workspace";
import { SavedSearchCard } from "@/components/saved-search-card";
import { requireUser } from "@/lib/auth";
import { describeMapCenter } from "@/lib/location-presets";
import { createClient } from "@/lib/supabase/server";
import { normalizeTenantType, TENANT_PROFILE_LABELS, type TenantType } from "@/lib/tenant-match";
export const dynamic = "force-dynamic";

const SAVED_HOME_MEDIA_TTL_SECONDS = 300;

type SavedSearchMatchRow = {
  current_count: number | string;
  new_count: number | string;
};

function searchHref(search: {
  center_lat: number;
  center_long: number;
  radius_km: number | null;
  min_rent: number | null;
  max_rent: number | null;
  tenant_type: string | null;
  min_bedrooms: number | null;
}) {
  const params = new URLSearchParams({ lat: String(search.center_lat), lng: String(search.center_long) });
  if (search.radius_km !== null) params.set("radius", String(search.radius_km));
  if (search.min_rent !== null) params.set("minRent", String(search.min_rent));
  if (search.max_rent !== null) params.set("maxRent", String(search.max_rent));
  if (search.tenant_type) params.set("tenant", search.tenant_type);
  if (search.min_bedrooms !== null) params.set("bedrooms", String(search.min_bedrooms));
  return `/homes?${params.toString()}`;
}

function renterTypeLabel(value: unknown) {
  const type = normalizeTenantType(value);
  return type ? TENANT_PROFILE_LABELS[type] : null;
}

function propertyLabel(value: unknown) {
  return typeof value === "string" && value
    ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Not listed";
}

function savedSearchLocation(search: { center_lat: unknown; center_long: unknown }) {
  return describeMapCenter(Number(search.center_lat), Number(search.center_long));
}

function savedSearchTitle(search: { name: unknown; center_lat: unknown; center_long: unknown }) {
  const name = typeof search.name === "string" ? search.name.trim() : "";
  const location = savedSearchLocation(search);
  const genericName = !name || /^(my\s+)?(saved\s+)?search(?:\s+\d+)?$/i.test(name);
  return genericName ? `${location} search` : name;
}

function savedSearchArea(search: { center_lat: unknown; center_long: unknown; radius_km: unknown }) {
  const location = savedSearchLocation(search);
  const radius = search.radius_km == null ? null : Number(search.radius_km);
  return radius !== null && Number.isFinite(radius)
    ? `Around ${location} · within ${radius} km`
    : `Around ${location}`;
}

function savedSearchFilters(search: {
  min_rent: unknown;
  max_rent: unknown;
  tenant_type: unknown;
  min_bedrooms: unknown;
}) {
  const parts: string[] = [];
  const minRent = search.min_rent == null ? null : Number(search.min_rent);
  const maxRent = search.max_rent == null ? null : Number(search.max_rent);

  if (minRent !== null || maxRent !== null) {
    const minimum = minRent !== null && Number.isFinite(minRent) ? `৳${minRent.toLocaleString("en-BD")}` : "any";
    const maximum = maxRent !== null && Number.isFinite(maxRent) ? `৳${maxRent.toLocaleString("en-BD")}` : "any";
    parts.push(`Rent ${minimum}–${maximum}`);
  }

  const renterType = renterTypeLabel(search.tenant_type);
  if (renterType) parts.push(`Renter type: ${renterType}`);

  const bedrooms = search.min_bedrooms == null ? null : Number(search.min_bedrooms);
  if (bedrooms !== null && Number.isFinite(bedrooms)) parts.push(`${bedrooms}+ bedrooms`);

  return parts.length ? parts.join(" · ") : "No extra filters";
}

export default async function SavedPage() {
  const auth = await requireUser();
  const canList = auth.profile.primary_role === "owner" || auth.profile.primary_role === "agent";
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const [{ data: savedRows }, { data: searches }] = await Promise.all([
    supabase.from("saved_properties").select("property_id, created_at").eq("user_id", auth.userId).order("created_at", { ascending: false }),
    supabase.from("saved_searches").select("id, name, center_lat, center_long, radius_km, min_rent, max_rent, tenant_type, min_bedrooms, updated_at").eq("user_id", auth.userId).order("updated_at", { ascending: false }),
  ]);

  const matchStateEntries = await Promise.all((searches ?? []).map(async (search) => {
    const { data, error } = await supabase.rpc("count_saved_search_matches", {
      center_lat: Number(search.center_lat),
      center_long: Number(search.center_long),
      radius_km: search.radius_km == null ? null : Number(search.radius_km),
      min_rent: search.min_rent == null ? null : Number(search.min_rent),
      max_rent: search.max_rent == null ? null : Number(search.max_rent),
      renter_tenant_type: normalizeTenantType(search.tenant_type),
      min_bedrooms: search.min_bedrooms == null ? null : Number(search.min_bedrooms),
      changed_since: search.updated_at,
    });
    const row = (data?.[0] ?? null) as SavedSearchMatchRow | null;
    return [search.id as string, error || !row ? null : { currentCount: Number(row.current_count), newCount: Number(row.new_count) }] as const;
  }));
  const matchStateBySearch = new Map(matchStateEntries);
  const newMatchCount = Array.from(matchStateBySearch.values()).reduce((total, state) => total + (state?.newCount ?? 0), 0);
  const orderedSearches = [...(searches ?? [])].sort((a, b) => (matchStateBySearch.get(b.id as string)?.newCount ?? 0) - (matchStateBySearch.get(a.id as string)?.newCount ?? 0));

  const propertyIds = (savedRows ?? []).map((row) => row.property_id as string);
  const [{ data: properties }, { data: mediaRows }, { data: tenantRows }] = propertyIds.length
    ? await Promise.all([
        supabase.from("properties").select("id, title, address_text, rent_bdt, bedrooms, bathrooms, size_sqft, furnishing, property_type, status").in("id", propertyIds),
        supabase.from("property_media").select("property_id, storage_path, media_type, sort_order").in("property_id", propertyIds).eq("media_type", "photo").order("sort_order", { ascending: true }),
        supabase.from("property_tenant_types").select("property_id, tenant_type").in("property_id", propertyIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const propertyMap = new Map((properties ?? []).map((property) => [property.id as string, property]));
  const availableSavedRows = (savedRows ?? []).filter((saved) => propertyMap.has(saved.property_id as string));
  const unavailableSavedRows = (savedRows ?? []).filter((saved) => !propertyMap.has(saved.property_id as string));

  const coverPathByProperty = new Map<string, string>();
  for (const media of mediaRows ?? []) {
    const propertyId = media.property_id as string;
    if (!coverPathByProperty.has(propertyId) && media.storage_path) coverPathByProperty.set(propertyId, media.storage_path as string);
  }

  const coverEntries = await Promise.all(
    Array.from(coverPathByProperty.entries()).map(async ([propertyId, storagePath]) => {
      const { data } = await supabase.storage.from("property-media").createSignedUrl(storagePath, SAVED_HOME_MEDIA_TTL_SECONDS);
      return [propertyId, data?.signedUrl ?? null] as const;
    }),
  );
  const coverUrlByProperty = new Map(coverEntries);

  const renterFitByProperty = new Map<string, string[]>();
  for (const row of tenantRows ?? []) {
    const propertyId = row.property_id as string;
    const tenantLabel = renterTypeLabel(row.tenant_type);
    if (!tenantLabel) continue;
    const current = renterFitByProperty.get(propertyId) ?? [];
    if (!current.includes(tenantLabel)) current.push(tenantLabel);
    renterFitByProperty.set(propertyId, current);
  }

  const availableHomes: SavedHome[] = availableSavedRows.map((saved) => {
    const propertyId = saved.property_id as string;
    const property = propertyMap.get(propertyId)!;
    return {
      id: propertyId,
      title: (property.title as string | null) || "Rental property",
      address: (property.address_text as string | null) || "Location shown on map",
      rentBdt: property.rent_bdt == null ? null : Number(property.rent_bdt),
      bedrooms: property.bedrooms == null ? null : Number(property.bedrooms),
      bathrooms: property.bathrooms == null ? null : Number(property.bathrooms),
      sizeSqft: property.size_sqft == null ? null : Number(property.size_sqft),
      propertyType: propertyLabel(property.property_type),
      furnishing: propertyLabel(property.furnishing),
      renterFit: renterFitByProperty.get(propertyId) ?? [],
      coverUrl: coverUrlByProperty.get(propertyId) ?? null,
    };
  });

  return (
    <main className="saved-page">
      <ProductNavigation authenticated canList={canList} current="saved" />

      <div className="saved-shell">
        <div className="saved-hero">
          <p className="eyebrow">Shortlist workspace</p>
          <h1>Saved homes & searches</h1>
          <p className="intro">Compare the homes you already like, keep unavailable ones out of the way, and return first to searches with new matches.</p>
          <div className="saved-hero-metrics" aria-label="Saved workspace summary">
            <div><strong>{availableHomes.length}</strong><span>homes live</span></div>
            <div><strong>{searches?.length ?? 0}</strong><span>saved searches</span></div>
            <div className={newMatchCount > 0 ? "has-new" : undefined}><strong>{newMatchCount}</strong><span>new matches</span></div>
          </div>
        </div>

        <nav className="saved-workspace-nav" aria-label="Saved workspace sections">
          <a href="#saved-homes"><span>Homes</span><strong>{availableHomes.length}</strong></a>
          <a href="#saved-searches"><span>Searches</span><strong>{searches?.length ?? 0}</strong>{newMatchCount > 0 && <small>{newMatchCount} new</small>}</a>
        </nav>

        <section className="saved-section" id="saved-homes">
          <div className="saved-section-heading">
            <div><h2>Your shortlist</h2><p>Select two to four live homes to compare rent, size, furnishing, location, and renter fit side by side.</p></div>
            <span>{availableHomes.length}</span>
          </div>
          <SavedHomesWorkspace
            userId={auth.userId}
            homes={availableHomes}
            unavailablePropertyIds={unavailableSavedRows.map((saved) => saved.property_id as string)}
          />
        </section>

        <section className="saved-section" id="saved-searches">
          <div className="saved-section-heading">
            <div><h2>Saved searches</h2><p>Searches with new matches rise to the top so you can reopen the most useful areas first.</p></div>
            <div className="saved-section-counts"><span>{searches?.length ?? 0}</span>{newMatchCount > 0 && <small>{newMatchCount} new</small>}</div>
          </div>
          {!searches?.length ? (
            <div className="saved-empty"><strong>No saved searches yet.</strong><span>Save a radius, budget, bedrooms, and renter-fit combination from the live map.</span><Link className="primary-button link-button" href="/homes">Explore the map</Link></div>
          ) : (
            <div className="saved-search-list">
              {orderedSearches.map((search) => (
                <SavedSearchCard
                  key={search.id as string}
                  userId={auth.userId}
                  runHref={searchHref(search as never)}
                  displayTitle={savedSearchTitle(search)}
                  displayArea={savedSearchArea(search)}
                  displayFilters={savedSearchFilters(search)}
                  matchState={matchStateBySearch.get(search.id as string) ?? null}
                  search={{
                    id: search.id as string,
                    name: search.name as string,
                    center_lat: Number(search.center_lat),
                    center_long: Number(search.center_long),
                    radius_km: search.radius_km == null ? null : Number(search.radius_km),
                    min_rent: search.min_rent == null ? null : Number(search.min_rent),
                    max_rent: search.max_rent == null ? null : Number(search.max_rent),
                    tenant_type: normalizeTenantType(search.tenant_type) as TenantType | null,
                    min_bedrooms: search.min_bedrooms == null ? null : Number(search.min_bedrooms),
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
