import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { RenterMapSearch } from "@/components/renter-map-search";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import "./homes.css";

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

  let savedPropertyIds: string[] = [];
  if (auth) {
    const { data } = await supabase.from("saved_properties").select("property_id").eq("user_id", auth.userId);
    savedPropertyIds = (data ?? []).map((row) => row.property_id as string);
  }

  const initialSearch = {
    centerLat: numberParam(params.lat),
    centerLong: numberParam(params.lng),
    radiusKm: params.radius,
    minRent: params.minRent,
    maxRent: params.maxRent,
    tenantType: params.tenant,
    bedrooms: params.bedrooms,
  };

  return (
    <main className="homes-page">
      <header className="homes-topbar">
        <Link className="homes-brand" href="/">RentHomeBD</Link>
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
