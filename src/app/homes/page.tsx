import type { SupabaseClient } from "@supabase/supabase-js";

import { MobileMapModel } from "@/components/mobile-map-model";
import { ProductNavigation } from "@/components/product-navigation";
import { RenterMapSearch } from "@/components/renter-map-search";
import { getAuthContext } from "@/lib/auth";
import { resolveLocationPreset } from "@/lib/location-presets";
import { normalizeTenantType } from "@/lib/tenant-match";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

function numberParam(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function HomesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const auth = await getAuthContext();
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const areaPreset = resolveLocationPreset(params.area);
  const unsupportedArea = Boolean(params.area && !areaPreset && numberParam(params.lat) === undefined && numberParam(params.lng) === undefined);

  let savedPropertyIds: string[] = [];
  let preferredTenantType;
  if (auth) {
    const [{ data: savedRows }, { data: profilePreference }] = await Promise.all([
      supabase.from("saved_properties").select("property_id").eq("user_id", auth.userId),
      supabase.from("profiles").select("preferred_tenant_type").eq("id", auth.userId).maybeSingle(),
    ]);
    savedPropertyIds = (savedRows ?? []).map((row) => row.property_id as string);
    preferredTenantType = normalizeTenantType(profilePreference?.preferred_tenant_type);
  }

  const initialSearch = {
    centerLat: numberParam(params.lat) ?? areaPreset?.latitude,
    centerLong: numberParam(params.lng) ?? areaPreset?.longitude,
    radiusKm: params.radius,
    minRent: params.minRent,
    maxRent: params.maxRent,
    tenantType: params.tenant,
    bedrooms: params.bedrooms,
    selectedId: params.selected,
    sort: params.sort,
  };

  const canList = auth?.profile.primary_role === "owner" || auth?.profile.primary_role === "agent";

  return (
    <main className="homes-page">
      <ProductNavigation authenticated={Boolean(auth)} canList={canList} current="explore" />
      <div className="mobile-homes-intro">
        <strong>Search by exact location</strong>
        <span>Explore the map, then refine results with the filters below.</span>
      </div>
      {unsupportedArea && (
        <div className="auth-message compact-message" role="status">
          “{params.area}” is not one of the supported quick-search locations yet. The map opened at the default Dhaka center instead. Move the map manually to the area you want, then choose Search map.
        </div>
      )}
      <MobileMapModel>
        <RenterMapSearch
          userId={auth?.userId ?? null}
          initialSavedPropertyIds={savedPropertyIds}
          initialSearch={initialSearch}
          preferredTenantType={preferredTenantType}
        />
      </MobileMapModel>
    </main>
  );
}
