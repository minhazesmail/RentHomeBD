export type HomesSearchUrlState = {
  centerLat: number;
  centerLong: number;
  radiusKm: string;
  minRent?: string;
  maxRent?: string;
  tenantType?: string;
  bedrooms?: string;
  selectedId?: string | null;
  sort: string;
};

export function buildHomesSearchPath(state: HomesSearchUrlState) {
  const params = new URLSearchParams({
    lat: state.centerLat.toFixed(6),
    lng: state.centerLong.toFixed(6),
    radius: state.radiusKm,
    sort: state.sort,
  });

  if (state.minRent) params.set("minRent", state.minRent);
  if (state.maxRent) params.set("maxRent", state.maxRent);
  if (state.tenantType) params.set("tenant", state.tenantType);
  if (state.bedrooms) params.set("bedrooms", state.bedrooms);
  if (state.selectedId) params.set("selected", state.selectedId);

  return `/homes?${params.toString()}`;
}
