import type { TenantType } from "@/lib/tenant-match";

const LISTING_TENANT_TYPES: TenantType[] = ["family", "bachelor", "student", "job_holder", "everyone"];

export function isValidListingTenantPolicy(values: string[]) {
  if (!values.length) return false;
  const unique = [...new Set(values)];
  if (unique.some((value) => !LISTING_TENANT_TYPES.includes(value as TenantType))) return false;
  return !unique.includes("everyone") || unique.length === 1;
}
