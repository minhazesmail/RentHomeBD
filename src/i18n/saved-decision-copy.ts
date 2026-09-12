import type { Locale } from "@/i18n/config";

const savedDecisionCopy = {
  en: {
    requiredTenant: "Renter type required",
    requiredTenantHint: "Choose Family, Bachelor, Student, or Job holder before running this saved search. NearBasha does not relax renter compatibility for saved searches.",
    chooseTenant: "Choose renter type",
    tenantValidation: "Choose a renter type before saving these search changes.",
    editTenant: "Set renter type",
  },
  bn: {
    requiredTenant: "ভাড়াটিয়ার ধরন প্রয়োজন",
    requiredTenantHint: "এই সেভ করা সার্চ চালানোর আগে Family, Bachelor, Student অথবা Job holder বেছে নিন। সেভ করা সার্চে NearBasha ভাড়াটিয়া উপযোগিতার শর্ত শিথিল করে না।",
    chooseTenant: "ভাড়াটিয়ার ধরন বেছে নিন",
    tenantValidation: "সার্চের পরিবর্তন সেভ করার আগে ভাড়াটিয়ার ধরন বেছে নিন।",
    editTenant: "ভাড়াটিয়ার ধরন সেট করুন",
  },
} as const;

export function getSavedDecisionCopy(locale: Locale) {
  return savedDecisionCopy[locale];
}
