import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ProductNavigation } from "@/components/product-navigation";
import { SavedHomesWorkspace, type SavedHome } from "@/components/saved-homes-workspace";
import { SavedSearchCard } from "@/components/saved-search-card";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatCurrency, formatNumber } from "@/i18n/format";
import { getLocale } from "@/i18n/get-locale";
import { formatWorkflowText, getWorkflowCopy, type WorkflowCopy } from "@/i18n/workflow-copy";
import { requireUser } from "@/lib/auth";
import { describeMapCenter } from "@/lib/location-presets";
import { createClient } from "@/lib/supabase/server";
import { normalizeTenantType, type TenantType } from "@/lib/tenant-match";
export const dynamic = "force-dynamic";

const SAVED_HOME_MEDIA_TTL_SECONDS = 300;

type SavedSearchMatchRow = {
  current_count: number | string;
  new_count: number | string;
};

type SavedCopy = WorkflowCopy["saved"];

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

function renterTypeLabel(value: unknown, dictionary: ReturnType<typeof getDictionary>) {
  const type = normalizeTenantType(value);
  if (!type) return null;
  const labels: Record<TenantType, string> = {
    family: dictionary.common.tenant.family,
    bachelor: dictionary.common.tenant.bachelor,
    student: dictionary.common.tenant.student,
    job_holder: dictionary.common.tenant.jobHolder,
    everyone: dictionary.common.tenant.everyone,
  };
  return labels[type];
}

function propertyLabel(value: unknown, copy: WorkflowCopy["owner"]["form"]) {
  const labels: Record<string, string> = {
    apartment: copy.apartment,
    house: copy.house,
    room_share: copy.roomShare,
    sublet: copy.sublet,
    hostel_seat: copy.hostelSeat,
  };
  return typeof value === "string" && labels[value] ? labels[value] : null;
}

function furnishingLabel(value: unknown, dictionary: ReturnType<typeof getDictionary>) {
  if (value === "furnished") return dictionary.common.furnishing.furnished;
  if (value === "semi_furnished") return dictionary.common.furnishing.semiFurnished;
  if (value === "unfurnished") return dictionary.common.furnishing.unfurnished;
  return dictionary.common.furnishing.unspecified;
}

function savedSearchLocation(search: { center_lat: unknown; center_long: unknown }) {
  return describeMapCenter(Number(search.center_lat), Number(search.center_long));
}

function savedSearchTitle(search: { name: unknown; center_lat: unknown; center_long: unknown }, copy: SavedCopy) {
  const name = typeof search.name === "string" ? search.name.trim() : "";
  const location = savedSearchLocation(search);
  const genericName = !name || /^(my\s+)?(saved\s+)?search(?:\s+\d+)?$/i.test(name);
  return genericName ? formatWorkflowText(copy.page.genericSearchTitle, { location }) : name;
}

function savedSearchArea(
  search: { center_lat: unknown; center_long: unknown; radius_km: unknown },
  copy: SavedCopy,
  locale: Awaited<ReturnType<typeof getLocale>>,
) {
  const location = savedSearchLocation(search);
  const radius = search.radius_km == null ? null : Number(search.radius_km);
  return radius !== null && Number.isFinite(radius)
    ? formatWorkflowText(copy.page.aroundWithRadius, { location, radius: formatNumber(radius, locale) })
    : formatWorkflowText(copy.page.around, { location });
}

function savedSearchFilters(
  search: {
    min_rent: unknown;
    max_rent: unknown;
    tenant_type: unknown;
    min_bedrooms: unknown;
  },
  copy: SavedCopy,
  locale: Awaited<ReturnType<typeof getLocale>>,
  dictionary: ReturnType<typeof getDictionary>,
) {
  const parts: string[] = [];
  const minRent = search.min_rent == null ? null : Number(search.min_rent);
  const maxRent = search.max_rent == null ? null : Number(search.max_rent);

  if (minRent !== null || maxRent !== null) {
    const minimum = minRent !== null && Number.isFinite(minRent) ? formatCurrency(minRent, locale) : copy.common.any;
    const maximum = maxRent !== null && Number.isFinite(maxRent) ? formatCurrency(maxRent, locale) : copy.common.any;
    parts.push(formatWorkflowText(copy.page.rentFilter, { minimum, maximum }));
  }

  const renterType = renterTypeLabel(search.tenant_type, dictionary);
  if (renterType) parts.push(formatWorkflowText(copy.page.renterTypeFilter, { type: renterType }));

  const bedrooms = search.min_bedrooms == null ? null : Number(search.min_bedrooms);
  if (bedrooms !== null && Number.isFinite(bedrooms)) {
    parts.push(formatWorkflowText(copy.page.bedroomsFilter, { count: formatNumber(bedrooms, locale) }));
  }

  return parts.length ? parts.join(" · ") : copy.common.noExtraFilters;
}

export default async function SavedPage() {
  const [auth, locale] = await Promise.all([requireUser(), getLocale()]);
  const canList = auth.profile.primary_role === "owner" || auth.profile.primary_role === "agent";
  const dictionary = getDictionary(locale);
  const workflow = getWorkflowCopy(locale);
  const copy = workflow.saved;
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
    const tenantLabel = renterTypeLabel(row.tenant_type, dictionary);
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
      title: (property.title as string | null) || copy.common.rentalProperty,
      address: (property.address_text as string | null) || copy.common.locationOnMap,
      rentBdt: property.rent_bdt == null ? null : Number(property.rent_bdt),
      bedrooms: property.bedrooms == null ? null : Number(property.bedrooms),
      bathrooms: property.bathrooms == null ? null : Number(property.bathrooms),
      sizeSqft: property.size_sqft == null ? null : Number(property.size_sqft),
      propertyType: propertyLabel(property.property_type, workflow.owner.form) ?? copy.common.notListed,
      furnishing: furnishingLabel(property.furnishing, dictionary),
      renterFit: renterFitByProperty.get(propertyId) ?? [],
      coverUrl: coverUrlByProperty.get(propertyId) ?? null,
    };
  });

  return (
    <main className="saved-page">
      <ProductNavigation authenticated canList={canList} current="saved" />

      <div className="saved-shell">
        <div className="saved-hero">
          <p className="eyebrow">{copy.page.eyebrow}</p>
          <h1>{copy.page.title}</h1>
          <p className="intro">{copy.page.description}</p>
          <div className="saved-hero-metrics" aria-label={copy.page.summaryAria}>
            <div><strong>{formatNumber(availableHomes.length, locale)}</strong><span>{copy.page.homesLive}</span></div>
            <div><strong>{formatNumber(searches?.length ?? 0, locale)}</strong><span>{copy.page.savedSearches}</span></div>
            <div className={newMatchCount > 0 ? "has-new" : undefined}><strong>{formatNumber(newMatchCount, locale)}</strong><span>{copy.page.newMatches}</span></div>
          </div>
        </div>

        <nav className="saved-workspace-nav" aria-label={copy.page.sectionsAria}>
          <a href="#saved-homes"><span>{copy.page.homes}</span><strong>{formatNumber(availableHomes.length, locale)}</strong></a>
          <a href="#saved-searches"><span>{copy.page.searches}</span><strong>{formatNumber(searches?.length ?? 0, locale)}</strong>{newMatchCount > 0 && <small>{formatNumber(newMatchCount, locale)} {copy.common.new}</small>}</a>
        </nav>

        <section className="saved-section" id="saved-homes">
          <div className="saved-section-heading">
            <div><h2>{copy.page.shortlistTitle}</h2><p>{copy.page.shortlistDescription}</p></div>
            <span>{formatNumber(availableHomes.length, locale)}</span>
          </div>
          <SavedHomesWorkspace
            userId={auth.userId}
            homes={availableHomes}
            unavailablePropertyIds={unavailableSavedRows.map((saved) => saved.property_id as string)}
          />
        </section>

        <section className="saved-section" id="saved-searches">
          <div className="saved-section-heading">
            <div><h2>{copy.page.searchesTitle}</h2><p>{copy.page.searchesDescription}</p></div>
            <div className="saved-section-counts"><span>{formatNumber(searches?.length ?? 0, locale)}</span>{newMatchCount > 0 && <small>{formatNumber(newMatchCount, locale)} {copy.common.new}</small>}</div>
          </div>
          {!searches?.length ? (
            <div className="saved-empty"><strong>{copy.page.noSearches}</strong><span>{copy.page.noSearchesHint}</span><Link className="primary-button link-button" href="/homes">{copy.page.exploreMap}</Link></div>
          ) : (
            <div className="saved-search-list">
              {orderedSearches.map((search) => (
                <SavedSearchCard
                  key={search.id as string}
                  userId={auth.userId}
                  runHref={searchHref(search as never)}
                  displayTitle={savedSearchTitle(search, copy)}
                  displayArea={savedSearchArea(search, copy, locale)}
                  displayFilters={savedSearchFilters(search, copy, locale, dictionary)}
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
