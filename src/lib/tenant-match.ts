export type TenantType = "family" | "bachelor" | "student" | "job_holder" | "everyone";

export type TenantTone = "family" | "bachelor" | "student" | "everyone" | "neutral";
export type TenantCompatibility = "match" | "mismatch" | "neutral";

export const TENANT_PROFILE_LABELS: Record<TenantType, string> = {
  family: "Family",
  bachelor: "Bachelor",
  student: "Student",
  job_holder: "Job holder",
  everyone: "Everyone",
};

// Keep one canonical set of user-facing renter-type names across search, profiles,
// listing creation, map markers, and property details.
export const TENANT_LABELS = TENANT_PROFILE_LABELS;

export const TENANT_COLORS: Record<TenantTone, { stroke: string; fill: string }> = {
  family: { stroke: "#145c43", fill: "#20795a" },
  bachelor: { stroke: "#315f9d", fill: "#4f7db8" },
  student: { stroke: "#7452a3", fill: "#956fc2" },
  everyone: { stroke: "#3f7467", fill: "#5e9184" },
  neutral: { stroke: "#49645a", fill: "#6f8a80" },
};

export function normalizeTenantTypes(value: unknown): TenantType[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is TenantType =>
    item === "family" || item === "bachelor" || item === "student" || item === "job_holder" || item === "everyone"
  );
}

export function normalizeTenantType(value: unknown): TenantType | undefined {
  return value === "family" || value === "bachelor" || value === "student" || value === "job_holder" || value === "everyone"
    ? value
    : undefined;
}

export function tenantTone(types: TenantType[]): TenantTone {
  if (types.includes("everyone")) return "everyone";
  if (types.includes("family")) return "family";
  if (types.includes("bachelor") || types.includes("job_holder")) return "bachelor";
  if (types.includes("student")) return "student";
  return "neutral";
}

export function tenantCompatibility(types: TenantType[], preference?: TenantType): TenantCompatibility {
  if (!preference || preference === "everyone" || types.length === 0) return "neutral";
  if (types.includes("everyone") || types.includes(preference)) return "match";
  return "mismatch";
}

export function tenantSummary(types: TenantType[]) {
  if (types.length === 0) return "Renter type not specified";
  if (types.includes("everyone")) return TENANT_PROFILE_LABELS.everyone;
  return types.map((type) => TENANT_PROFILE_LABELS[type]).join(" · ");
}
