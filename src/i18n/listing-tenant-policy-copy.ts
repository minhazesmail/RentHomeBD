import type { Locale } from "@/i18n/config";

const copy = {
  en: {
    valid: ["Tenant policy is clear", "Choose Everyone by itself, or choose one or more specific renter types."],
    invalid: ["Fix renter policy", "Everyone cannot be combined with Family, Bachelor, Student, or Job holder."],
  },
  bn: {
    valid: ["ভাড়াটিয়া নীতি পরিষ্কার", "Everyone একাই বেছে নিন, অথবা এক বা একাধিক নির্দিষ্ট ভাড়াটিয়া ধরন বেছে নিন।"],
    invalid: ["ভাড়াটিয়া নীতি ঠিক করুন", "Everyone-এর সঙ্গে Family, Bachelor, Student বা Job holder একসঙ্গে বেছে নেওয়া যাবে না।"],
  },
} as const;

export function getListingTenantPolicyCopy(locale: Locale) {
  return copy[locale];
}
