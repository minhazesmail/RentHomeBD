export type TenantType = "family" | "bachelor" | "student" | "job_holder" | "everyone";

export type TenantTone = "family" | "bachelor" | "student" | "everyone" | "neutral";

export const TENANT_LABELS: Record<TenantType, string> = {
  family: "Family friendly",
  bachelor: "Bachelor friendly",
  student: "Student friendly",
  job_holder: "Professional friendly",
  everyone: "Open to everyone",
};

export const TENANT_COLORS: Record<TenantTone, { stroke: string; fill: string }> = {
  family: { stroke: "#1f7a4c", fill: "#2f9a63" },
  bachelor: { stroke: "#315f9d", fill: "#4f7db8" },
  student: { stroke: "#7452a3", fill: "#956fc2" },
  everyone: { stroke: "#5c755f", fill: "#78937b" },
  neutral: { stroke: "#49645a", fill: "#6f8a80" },
};

export function normalizeTenantTypes(value: unknown): TenantType[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is TenantType =>
    item === "family" || item === "bachelor" || item === "student" || item === "job_holder" || item === "everyone"
  );
}

export function tenantTone(types: TenantType[]): TenantTone {
  if (types.includes("everyone")) return "everyone";
  if (types.includes("family")) return "family";
  if (types.includes("bachelor") || types.includes("job_holder")) return "bachelor";
  if (types.includes("student")) return "student";
  return "neutral";
}

export function tenantSummary(types: TenantType[]) {
  if (types.length === 0) return "Tenant fit not specified";
  if (types.includes("everyone")) return TENANT_LABELS.everyone;
  if (types.length === 1) return TENANT_LABELS[types[0]];
  return types.map((type) => TENANT_LABELS[type].replace(" friendly", "")).join(" · ");
}
