import type { Locale } from "@/i18n/config";

const en = {
  eyebrow: "Search by area",
  title: "Choose an area",
  mapLabel: "Rental area map",
  loading: "Loading the neighborhood map…",
  areas: "Explore neighborhoods",
  selectedArea: "Selected area",
  explore: "Search this neighborhood",
  hint: "Choose your tenant type in the full map to find matching homes.",
  inventory: "Nearby rentals within 5 km",
  inventoryLoading: "Finding nearby rentals…",
  inventoryUnavailable: "Nearby rentals could not load.",
  inventoryEmpty: "No available rentals within 5 km.",
  retryInventory: "Try again",
  tenantHint: "Choose who is moving in to see matching homes.",
  searchTitle: "Search rental homes",
  searchHint: "Choose an area and tenant type, then explore the map.",
  pickerLabel: "Exact property location picker",
  pickerArea: "Map centered near the typed area",
  pickerPlaced: "Exact pin placed",
  pickerPlace: "Place the property pin",
  pickerLocked: "Location is locked for this listing.",
  pickerApprox: "This is an approximate area. Click the building entrance to place the exact pin.",
  pickerDrag: "Drag the pin to the building gate, or click elsewhere on the map.",
  pickerClick: "Click the map where the building entrance is located.",
} as const;

type Copy = { [K in keyof typeof en]: string };
const bn: Copy = {
  eyebrow: "এলাকা অনুযায়ী খুঁজুন",
  title: "এলাকা বেছে নিন",
  mapLabel: "ভাড়ার বাসার এলাকার ম্যাপ",
  loading: "এলাকার ম্যাপ লোড হচ্ছে…",
  areas: "এলাকা ঘুরে দেখুন",
  selectedArea: "বাছাই করা এলাকা",
  explore: "এই এলাকায় বাসা খুঁজুন",
  hint: "মানানসই বাসা খুঁজতে পূর্ণ ম্যাপে ভাড়াটিয়ার ধরন বেছে নিন।",
  inventory: "৫ কিমির মধ্যে ভাড়ার বাসা",
  inventoryLoading: "কাছাকাছি বাসা খোঁজা হচ্ছে…",
  inventoryUnavailable: "কাছাকাছি বাসার তালিকা লোড করা যায়নি।",
  inventoryEmpty: "৫ কিমির মধ্যে এখন কোনো ভাড়ার বাসা নেই।",
  retryInventory: "আবার চেষ্টা করুন",
  tenantHint: "মানানসই বাসা দেখতে ভাড়াটিয়ার ধরন বেছে নিন।",
  searchTitle: "ভাড়ার বাসা খুঁজুন",
  searchHint: "এলাকা ও ভাড়াটিয়ার ধরন বেছে ম্যাপে খুঁজুন।",
  pickerLabel: "বাসার সঠিক লোকেশন বাছাই",
  pickerArea: "লেখা এলাকার কাছে ম্যাপ দেখানো হচ্ছে",
  pickerPlaced: "সঠিক পিন বসানো হয়েছে",
  pickerPlace: "বাসার পিন বসান",
  pickerLocked: "এই তালিকার লোকেশন পরিবর্তন করা যাবে না।",
  pickerApprox: "এটি আনুমানিক এলাকা। সঠিক পিন বসাতে ভবনের প্রবেশপথে ক্লিক করুন।",
  pickerDrag: "পিনটি ভবনের গেটে টেনে নিন, অথবা ম্যাপের অন্য জায়গায় ক্লিক করুন।",
  pickerClick: "ভবনের প্রবেশপথ যেখানে, ম্যাপে সেখানে ক্লিক করুন।",
};

export function getMapExperienceCopy(locale: Locale): Copy {
  return locale === "bn" ? bn : en;
}
