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
  noResultsTitle: "No matching homes here yet",
  noCustomAreaTitle: "No homes inside this drawn area",
  broadenSearch: "Clear optional filters",
  searchErrorTitle: "We could not refresh these homes",
  retrySearch: "Try search again",
  slowSearchTitle: "This search is taking longer",
  slowSearchHint: "We are still checking available homes. You can keep this screen open while the search finishes.",
  mapUnavailableTitle: "The map could not load",
  mapUnavailableHint: "Your search results are still available in the list. Retry the map when your connection is stable.",
  retryMap: "Retry map",
  locationUnavailableTitle: "Location is unavailable",
  tryLocationAgain: "Try location again",
  useMapInstead: "Use the map instead",
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
  noResultsTitle: "এখানে এখনো মানানসই বাসা নেই",
  noCustomAreaTitle: "আঁকা এলাকার ভেতরে কোনো বাসা নেই",
  broadenSearch: "ঐচ্ছিক ফিল্টার মুছুন",
  searchErrorTitle: "বাসার ফলাফল আপডেট করা যায়নি",
  retrySearch: "আবার সার্চ করুন",
  slowSearchTitle: "সার্চে একটু বেশি সময় লাগছে",
  slowSearchHint: "উপলভ্য বাসা খোঁজা এখনো চলছে। সার্চ শেষ হওয়া পর্যন্ত এই স্ক্রিন খোলা রাখতে পারেন।",
  mapUnavailableTitle: "ম্যাপ লোড করা যায়নি",
  mapUnavailableHint: "আপনার সার্চের ফলাফল লিস্টে দেখা যাবে। সংযোগ স্থির হলে ম্যাপ আবার চেষ্টা করুন।",
  retryMap: "ম্যাপ আবার চেষ্টা করুন",
  locationUnavailableTitle: "লোকেশন পাওয়া যাচ্ছে না",
  tryLocationAgain: "লোকেশন আবার চেষ্টা করুন",
  useMapInstead: "ম্যাপ ব্যবহার করুন",
};

export function getRenterResultsCopy(locale: Locale): RenterResultsCopy {
  return locale === "bn" ? bn : en;
}
