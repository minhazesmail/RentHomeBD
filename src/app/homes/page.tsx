import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { BrandLogo } from "@/components/brand-logo";
import { RenterMapSearch } from "@/components/renter-map-search";
import { getAuthContext } from "@/lib/auth";
import { resolveLocationPreset } from "@/lib/location-presets";
import { createClient } from "@/lib/supabase/server";
import "./homes.css";
import "./mobile-map-sheet.css";
import "./custom-area.css";
import "./tenant-match.css";

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

  let savedPropertyIds: string[] = [];
  let preferredTenantType: string | undefined;
  if (auth) {
    const [{ data: savedRows }, { data: profilePreference }] = await Promise.all([
      supabase.from("saved_properties").select("property_id").eq("user_id", auth.userId),
      supabase.from("profiles").select("preferred_tenant_type").eq("id", auth.userId).maybeSingle(),
    ]);
    savedPropertyIds = (savedRows ?? []).map((row) => row.property_id as string);
    preferredTenantType = typeof profilePreference?.preferred_tenant_type === "string"
      ? profilePreference.preferred_tenant_type
      : undefined;
  }

  const initialSearch = {
    centerLat: numberParam(params.lat) ?? areaPreset?.latitude,
    centerLong: numberParam(params.lng) ?? areaPreset?.longitude,
    radiusKm: params.radius,
    minRent: params.minRent,
    maxRent: params.maxRent,
    tenantType: params.tenant ?? preferredTenantType,
    bedrooms: params.bedrooms,
  };

  return (
    <main className="homes-page">
      <header className="homes-topbar">
        <BrandLogo className="homes-brand-logo" />
        <div className="homes-topbar-actions">
          <span>Verified availability · exact pins</span>
          {auth ? <Link className="text-link" href="/saved">Saved</Link> : null}
          <Link className="text-link" href={auth ? "/dashboard" : "/login"}>{auth ? "Dashboard" : "Sign in"}</Link>
        </div>
      </header>
      <RenterMapSearch userId={auth?.userId ?? null} initialSavedPropertyIds={savedPropertyIds} initialSearch={initialSearch} />
    </main>
  );
}
