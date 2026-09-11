import type { Locale } from "@/i18n/config";

const en = {
  rentalProperty: "Rental property",
  locationOnMap: "Location available on map",
  matchesType: "✓ Matches your renter type",
  differentType: "This owner prefers a different renter type.",
  rentOnRequest: "Rent on request",
  bed: "bed",
  bath: "bath",
  metersAway: "{distance} m away",
  kilometersAway: "{distance} km away",
  shownOnMap: "Shown on map",
  showOnMap: "Show on map",
  noCustomAreaResults: "No available homes fall inside this custom area. Try expanding the shape or radius.",
  noResults: "No available homes match these filters yet.",
};

type RenterResultsCopy = { [K in keyof typeof en]: string };

const bn: RenterResultsCopy = {
  rentalProperty: "ভাড়ার প্রপার্টি",
  locationOnMap: "লোকেশন ম্যাপে দেখানো আছে",
  matchesType: "✓ আপনার ভাড়াটিয়া ধরনের সঙ্গে মিল আছে",
  differentType: "এই মালিক ভিন্ন ধরনের ভাড়াটিয়া পছন্দ করেন।",
  rentOnRequest: "ভাড়া জানতে যোগাযোগ করুন",
  bed: "বেড",
  bath: "বাথ",
  metersAway: "{distance} মিটার দূরে",
  kilometersAway: "{distance} কিমি দূরে",
  shownOnMap: "ম্যাপে দেখানো হচ্ছে",
  showOnMap: "ম্যাপে দেখুন",
  noCustomAreaResults: "এই আঁকা এলাকার ভেতরে কোনো উপলভ্য বাসা নেই। এলাকা বা ব্যাসার্ধ বাড়িয়ে দেখুন।",
  noResults: "এই ফিল্টারে এখনো কোনো উপলভ্য বাসা নেই।",
};

export function getRenterResultsCopy(locale: Locale): RenterResultsCopy {
  return locale === "bn" ? bn : en;
}
