import type { TenantType } from "@/lib/tenant-match";

export type SearchTenantType = Exclude<TenantType, "everyone">;

export const BUDGET_PRESETS = [15_000, 25_000, 40_000, 60_000] as const;
export const MIN_CUSTOM_BUDGET = 1_000;
export const MAX_CUSTOM_BUDGET = 10_000_000;
export const CUSTOM_BUDGET_STEP = 500;
export const RADIUS_OPTIONS = ["2", "5", "10", "15", "25"] as const;


export function buildHomesHref({
  area,
  tenant,
  maxRent,
  bedrooms,
  radius,
}: {
  area: string;
  tenant: SearchTenantType | "";
  maxRent: string;
  bedrooms: string;
  radius: string;
}) {
  const params = new URLSearchParams();
  if (area) params.set("area", area);
  if (tenant) params.set("tenant", tenant);
  if (maxRent) params.set("maxRent", maxRent);
  if (bedrooms) params.set("bedrooms", bedrooms);
  if (radius) params.set("radius", radius);
  return `/homes?${params.toString()}`;
}

export function isCustomBudgetReady(budgetChoice: string, customBudget: string) {
  const amount = Number(customBudget);
  return budgetChoice !== "custom" || (
    customBudget.trim().length > 0
    && Number.isFinite(amount)
    && amount >= MIN_CUSTOM_BUDGET
    && amount <= MAX_CUSTOM_BUDGET
    && (amount - MIN_CUSTOM_BUDGET) % CUSTOM_BUDGET_STEP === 0
  );
}
