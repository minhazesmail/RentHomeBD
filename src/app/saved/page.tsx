import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { DeleteSavedSearchButton } from "@/components/delete-saved-search-button";
import { SaveHomeButton } from "@/components/save-home-button";
import { requireUser } from "@/lib/auth";
import { describeMapCenter } from "@/lib/location-presets";
import { createClient } from "@/lib/supabase/server";
import { normalizeTenantType, TENANT_PROFILE_LABELS } from "@/lib/tenant-match";
export const dynamic = "force-dynamic";

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

export default async function SavedPage() {
  const auth = await requireUser();
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const [{ data: savedRows }, { data: searches }] = await Promise.all([
    supabase.from("saved_properties").select("property_id, created_at").eq("user_id", auth.userId).order("created_at", { ascending: false }),
    supabase.from("saved_searches").select("id, name, center_lat, center_long, radius_km, min_rent, max_rent, tenant_type, min_bedrooms, updated_at").eq("user_id", auth.userId).order("updated_at", { ascending: false }),
  ]);

  const propertyIds = (savedRows ?? []).map((row) => row.property_id as string);
  const { data: properties } = propertyIds.length
    ? await supabase.from("properties").select("id, title, address_text, rent_bdt, bedrooms, bathrooms, status").in("id", propertyIds)
    : { data: [] };
  const propertyMap = new Map((properties ?? []).map((property) => [property.id as string, property]));

  return (
    <main className="saved-page">
      <header className="saved-topbar">
        <Link className="homes-brand" href="/">NearBasha</Link>
        <nav><Link className="text-link" href="/homes">Map search</Link><Link className="text-link" href="/messages">Messages</Link><Link className="text-link" href="/dashboard">Dashboard</Link></nav>
      </header>

      <div className="saved-shell">
        <div className="saved-hero">
          <p className="eyebrow">Renter workspace</p>
          <h1>Saved homes & searches</h1>
          <p className="intro">Keep interesting listings in one place and reopen your favorite map filters without rebuilding them.</p>
        </div>

        <section className="saved-section">
          <div className="saved-section-heading"><div><h2>Saved homes</h2><p>Only homes that are still publicly available are shown.</p></div><span>{propertyMap.size}</span></div>
          {!savedRows?.length ? (
            <div className="saved-empty">No saved homes yet. Use the heart on any map result or property page.</div>
          ) : (
            <div className="saved-home-grid">
              {savedRows.map((saved) => {
                const property = propertyMap.get(saved.property_id as string);
                if (!property) {
                  return <div className="saved-home-card unavailable" key={saved.property_id}><div><strong>No longer available</strong><span>This saved listing is currently hidden or has expired.</span></div><SaveHomeButton propertyId={saved.property_id as string} userId={auth.userId} initialSaved /></div>;
                }
                return (
                  <div className="saved-home-card" key={property.id as string}>
                    <Link href={`/homes/${property.id}`}>
                      <strong>{property.title || "Rental property"}</strong>
                      <span>{property.address_text || "Location shown on map"}</span>
                      <small>{property.rent_bdt ? `৳${Number(property.rent_bdt).toLocaleString("en-BD")}/mo` : "Rent on request"} · {property.bedrooms ?? "—"} bed · {property.bathrooms ?? "—"} bath</small>
                    </Link>
                    <SaveHomeButton propertyId={property.id as string} userId={auth.userId} initialSaved compact />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="saved-section">
          <div className="saved-section-heading"><div><h2>Saved searches</h2><p>Each preset stores its map area and active filters.</p></div><span>{searches?.length ?? 0}</span></div>
          {!searches?.length ? (
            <div className="saved-empty">No saved searches yet. Name a filter set from the map page and save it.</div>
          ) : (
            <div className="saved-search-list">
              {searches.map((search) => {
                const renterType = renterTypeLabel(search.tenant_type);
                return (
                  <div className="saved-search-card" key={search.id as string}>
                    <div>
                      <strong>{search.name as string}</strong>
                      <span>{search.radius_km ? `${search.radius_km} km radius` : "Any distance"}{search.min_rent || search.max_rent ? ` · ৳${search.min_rent ?? 0}–${search.max_rent ?? "any"}` : ""}{renterType ? ` · ${renterType}` : ""}{search.min_bedrooms ? ` · ${search.min_bedrooms}+ bed` : ""}</span>
                      <small>{describeMapCenter(Number(search.center_lat), Number(search.center_long))}</small>
                    </div>
                    <div className="saved-search-actions"><Link className="primary-button link-button" href={searchHref(search as never)}>Run search</Link><DeleteSavedSearchButton searchId={search.id as string} userId={auth.userId} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
