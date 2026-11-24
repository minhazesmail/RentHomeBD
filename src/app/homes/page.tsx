import { HomesSearchExperience } from "@/components/homes-search-experience";
import { resolveLocationPreset } from "@/lib/location-presets";
import { publicMetadata } from "@/lib/site-metadata";
import { getLocale } from "@/i18n/get-locale";

type Query = Record<string, string | string[] | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) {
  const params = await searchParams;
  return publicMetadata("/homes", await getLocale(), Object.keys(params).length === 0);
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function HomesPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const rawParams = await searchParams;
  const params = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => [key, first(value)]));
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
    privateRoomsOnly: params.rental === "private_room",
    selectedId: params.selected,
    sort: params.sort,
    listScroll: params.listScroll,
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
            “{params.area}” could not be matched to a unique location. Choose an upazila with its district name, or move the map manually. The map currently shows the default Dhaka center.
          </div>
        )}
      </HomesSearchExperience>
    </main>
  );
}
