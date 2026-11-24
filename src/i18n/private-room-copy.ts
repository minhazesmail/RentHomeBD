export const privateRoomCopy = {
  en: {
    label: "Private room",
    arrangement: "A private bedroom in a shared flat. Flatmates share the kitchen.",
    rent: "Monthly rent for this room",
    filter: "Private rooms only",
    amenities: { "attached-bathroom": "Attached bathroom", "attached-balcony": "Attached balcony" },
  },
  bn: {
    label: "আলাদা রুম",
    arrangement: "শেয়ার করা ফ্ল্যাটে নিজের জন্য আলাদা রুম। রান্নাঘর ফ্ল্যাটের সবার জন্য।",
    rent: "এই রুমের মাসিক ভাড়া",
    filter: "শুধু আলাদা রুম",
    amenities: { "attached-bathroom": "রুমের সঙ্গে বাথরুম", "attached-balcony": "রুমের সঙ্গে বারান্দা" },
  },
};

export function isRoomAmenity(slug: string): slug is "attached-bathroom" | "attached-balcony" {
  return slug === "attached-bathroom" || slug === "attached-balcony";
}
