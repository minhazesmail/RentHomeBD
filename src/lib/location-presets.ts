export type LocationPreset = {
  label: string;
  latitude: number;
  longitude: number;
  aliases?: string[];
};

export const LOCATION_PRESETS: LocationPreset[] = [
  { label: "Dhanmondi, Dhaka", latitude: 23.7465, longitude: 90.376, aliases: ["dhanmondi", "dhanmondi road 8", "road 8 dhanmondi"] },
  { label: "Banani, Dhaka", latitude: 23.7937, longitude: 90.4066, aliases: ["banani", "banani 11", "banani road 11"] },
  { label: "Gulshan, Dhaka", latitude: 23.7925, longitude: 90.4078, aliases: ["gulshan", "gulshan 1", "gulshan 2"] },
  { label: "Bashundhara R/A, Dhaka", latitude: 23.8133, longitude: 90.4315, aliases: ["bashundhara", "bashundhara r/a", "bashundhara residential area"] },
  { label: "Mirpur, Dhaka", latitude: 23.8223, longitude: 90.3654, aliases: ["mirpur", "mirpur 10", "mirpur 11", "mirpur 12"] },
  { label: "Uttara, Dhaka", latitude: 23.8759, longitude: 90.3795, aliases: ["uttara", "uttara sector 7", "uttara sector 10"] },
  { label: "Mohammadpur, Dhaka", latitude: 23.7658, longitude: 90.3584, aliases: ["mohammadpur"] },
  { label: "Farmgate, Dhaka", latitude: 23.7588, longitude: 90.3897, aliases: ["farmgate"] },
  { label: "Karwan Bazar, Dhaka", latitude: 23.7516, longitude: 90.3934, aliases: ["karwan bazar", "kawran bazar"] },
  { label: "Dhaka University", latitude: 23.7339, longitude: 90.3929, aliases: ["dhaka university", "university of dhaka", "du"] },
  { label: "BUET", latitude: 23.7268, longitude: 90.3925, aliases: ["buet", "bangladesh university of engineering and technology"] },
  { label: "North South University", latitude: 23.8158, longitude: 90.4255, aliases: ["north south university", "nsu"] },
  { label: "BRAC University", latitude: 23.7801, longitude: 90.4071, aliases: ["brac university", "bracu"] },
];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function distanceKm(latitude: number, longitude: number, preset: LocationPreset) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const lat1 = toRadians(latitude);
  const lat2 = toRadians(preset.latitude);
  const deltaLat = toRadians(preset.latitude - latitude);
  const deltaLong = toRadians(preset.longitude - longitude);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLong / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function resolveLocationPreset(value?: string) {
  if (!value) return undefined;
  const query = normalize(value);
  if (!query) return undefined;

  return LOCATION_PRESETS.find((preset) => {
    const candidates = [preset.label, ...(preset.aliases ?? [])].map(normalize);
    return candidates.some((candidate) => candidate === query || candidate.includes(query) || query.includes(candidate));
  });
}

export function describeMapCenter(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "Custom map area";

  const nearest = LOCATION_PRESETS
    .map((preset) => ({ preset, distance: distanceKm(latitude, longitude, preset) }))
    .sort((a, b) => a.distance - b.distance)[0];

  if (nearest && nearest.distance <= 0.35) return nearest.preset.label;
  if (nearest && nearest.distance <= 5) return `Near ${nearest.preset.label}`;

  const inDhakaMetro = latitude >= 23.62 && latitude <= 24.02 && longitude >= 90.20 && longitude <= 90.62;
  return inDhakaMetro ? "Custom area in Dhaka" : "Custom map area";
}
