"use client";

import { useEffect, useMemo, useState } from "react";

import { MobileMapModel } from "@/components/mobile-map-model";
import { ProductNavigation } from "@/components/product-navigation";
import { RenterMapSearch } from "@/components/renter-map-search";
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
  savedPropertyIds: string[];
  preferredTenantType?: TenantType;
  canList: boolean;
};

const EMPTY_PERSONALIZATION: PersonalizationState = {
  userId: null,
  savedPropertyIds: [],
  preferredTenantType: undefined,
  canList: false,
};

export function HomesSearchExperience({ initialSearch }: { initialSearch: InitialSearch }) {
  const supabase = useMemo(() => createClient(), []);
  const [personalization, setPersonalization] = useState<PersonalizationState>(EMPTY_PERSONALIZATION);

  useEffect(() => {
    let cancelled = false;

    async function loadPersonalization() {
      const { data: claimsData } = await supabase.auth.getClaims();
      const userId = claimsData?.claims?.sub;
      if (!userId || cancelled) return;

      setPersonalization((current) => ({ ...current, userId }));

      const [{ data: savedRows }, { data: profile }] = await Promise.all([
        supabase.from("saved_properties").select("property_id").eq("user_id", userId),
        supabase.from("profiles").select("primary_role, preferred_tenant_type").eq("id", userId).maybeSingle(),
      ]);

      if (cancelled) return;
      setPersonalization({
        userId,
        savedPropertyIds: (savedRows ?? []).map((row) => row.property_id),
        preferredTenantType: normalizeTenantType(profile?.preferred_tenant_type),
        canList: profile?.primary_role === "owner" || profile?.primary_role === "agent",
      });
    }

    void loadPersonalization();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <>
      <ProductNavigation authenticated={Boolean(personalization.userId)} canList={personalization.canList} current="explore" />
      <MobileMapModel>
        <RenterMapSearch
          userId={personalization.userId}
          initialSavedPropertyIds={personalization.savedPropertyIds}
          initialSearch={initialSearch}
          preferredTenantType={personalization.preferredTenantType}
        />
      </MobileMapModel>
    </>
  );
}
