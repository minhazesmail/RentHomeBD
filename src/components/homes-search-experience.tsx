"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MobileMapModel } from "@/components/mobile-map-model";
import { ProductNavigation } from "@/components/product-navigation";
import { RenterMapSearch } from "@/components/renter-map-search";
import { SavedHomesProvider } from "@/components/saved-homes-state";
import { normalizeTenantType, type TenantType } from "@/lib/tenant-match";
import { createClient } from "@/lib/supabase/client";

type InitialSearch = {
  centerLat?: number;
  centerLong?: number;
  radiusKm?: string;
  minRent?: string;
  maxRent?: string;
  tenantType?: string;
  bedrooms?: string;
  selectedId?: string;
  sort?: string;
};

type PersonalizationState = {
  userId: string | null;
  preferredTenantType?: TenantType;
  canList: boolean;
  authReady: boolean;
};

const EMPTY_PERSONALIZATION: PersonalizationState = {
  userId: null,
  preferredTenantType: undefined,
  canList: false,
  authReady: false,
};

export function HomesSearchExperience({ children, initialSearch }: { children: ReactNode; initialSearch: InitialSearch }) {
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [personalization, setPersonalization] = useState<PersonalizationState>(EMPTY_PERSONALIZATION);

  useEffect(() => {
    let cancelled = false;

    async function loadPersonalization() {
      const { data: claimsData } = await supabase.auth.getClaims();
      const userId = claimsData?.claims?.sub;
      if (cancelled) return;

      if (!userId) {
        setPersonalization({ ...EMPTY_PERSONALIZATION, authReady: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("primary_role, preferred_tenant_type")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;
      setPersonalization({
        userId,
        preferredTenantType: normalizeTenantType(profile?.preferred_tenant_type),
        canList: profile?.primary_role === "owner" || profile?.primary_role === "agent",
        authReady: true,
      });
    }

    void loadPersonalization();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const savedStoreKey = personalization.authReady
    ? personalization.userId ?? "anonymous"
    : "auth-loading";

  return (
    <>
      <ProductNavigation authenticated={Boolean(personalization.userId)} canList={personalization.canList} current="explore" />
      {children}
      <MobileMapModel>
        <SavedHomesProvider
          key={savedStoreKey}
          userId={personalization.userId}
          authReady={personalization.authReady}
        >
          <RenterMapSearch
            userId={personalization.userId}
            initialSearch={initialSearch}
            preferredTenantType={personalization.preferredTenantType}
          />
        </SavedHomesProvider>
      </MobileMapModel>
    </>
  );
}
