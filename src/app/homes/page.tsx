import { HomesSearchExperience } from "@/components/homes-search-experience";
import { resolveLocationPreset } from "@/lib/location-presets";

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
  const areaPreset = resolveLocationPreset(params.area);
  const unsupportedArea = Boolean(params.area && !areaPreset && numberParam(params.lat) === undefined && numberParam(params.lng) === undefined);

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

  return (
    <main className="homes-page">
      <HomesSearchExperience initialSearch={initialSearch}>
        <div className="mobile-homes-intro">
          <strong>Search by exact location</strong>
          <span>Explore the map, then refine results with the filters below.</span>
        </div>
        {unsupportedArea && (
          <div className="auth-message compact-message" role="status">
            “{params.area}” is not one of the supported quick-search locations yet. The map opened at the default Dhaka center instead. Move the map manually to the area you want, then choose Search map.
          </div>
        )}
      </HomesSearchExperience>
    </main>
  );
}
