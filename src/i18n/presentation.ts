import type { TenantType } from "@/lib/tenant-match";
import type { Dictionary } from "./dictionaries/en";

const locationKeyByCanonical: Record<string, keyof Dictionary["common"]["locations"]> = {
  "Dhanmondi, Dhaka": "dhanmondiDhaka",
  "Banani, Dhaka": "bananiDhaka",
  "Gulshan, Dhaka": "gulshanDhaka",
  "Bashundhara R/A, Dhaka": "bashundharaDhaka",
  "Mirpur, Dhaka": "mirpurDhaka",
  "Uttara, Dhaka": "uttaraDhaka",
  "Mohammadpur, Dhaka": "mohammadpurDhaka",
  "Farmgate, Dhaka": "farmgateDhaka",
  "Karwan Bazar, Dhaka": "karwanBazarDhaka",
  "Dhaka University": "dhakaUniversity",
  "BUET": "buet",
  "North South University": "northSouthUniversity",
  "BRAC University": "bracUniversity",
  Dhanmondi: "dhanmondi",
  Banani: "banani",
  Gulshan: "gulshan",
  Tejgaon: "tejgaon",
  Uttara: "uttara",
  "Near BUET": "nearBuet",
};

export function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function localizeLocationLabel(value: string, dictionary: Dictionary) {
  const key = locationKeyByCanonical[value];
  return key ? dictionary.common.locations[key] : value;
}

export function localizeTenantType(type: TenantType, dictionary: Dictionary) {
  const tenant = dictionary.common.tenant;
  if (type === "family") return tenant.family;
  if (type === "bachelor") return tenant.bachelor;
  if (type === "student") return tenant.student;
  if (type === "job_holder") return tenant.jobHolder;
  return tenant.everyone;
}

export function localizeTenantSummary(types: TenantType[], dictionary: Dictionary) {
  if (!types.length) return dictionary.common.tenant.unspecified;
  if (types.includes("everyone")) return dictionary.common.tenant.everyone;
  return types.map((type) => localizeTenantType(type, dictionary)).join(" · ");
}

export function localizeFurnishing(value: string | null | undefined, dictionary: Dictionary) {
  if (!value) return dictionary.common.furnishing.unspecified;
  if (value === "furnished") return dictionary.common.furnishing.furnished;
  if (value === "semi_furnished") return dictionary.common.furnishing.semiFurnished;
  if (value === "unfurnished") return dictionary.common.furnishing.unfurnished;
  return value.replaceAll("_", " ");
}
