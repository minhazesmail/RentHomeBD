import administrativeLocations from "./bangladesh-locations.json" with { type: "json" };

export type LocationPreset = {
  label: string;
  labelBn?: string;
  id?: string;
  kind?: string;
  district?: string;
  division?: string;
  latitude: number;
  longitude: number;
  aliases?: string[];
};

const CURATED_LOCATIONS: LocationPreset[] = [
  { label: "Dhanmondi, Dhaka", latitude: 23.7465, longitude: 90.376, aliases: ["dhanmondi", "dhanmondi road 8", "road 8 dhanmondi", "ধানমন্ডি, ঢাকা", "ধানমন্ডি"] },
  { label: "Banani, Dhaka", latitude: 23.7937, longitude: 90.4066, aliases: ["banani", "banani 11", "banani road 11", "বনানী, ঢাকা", "বনানী"] },
  { label: "Gulshan, Dhaka", latitude: 23.7925, longitude: 90.4078, aliases: ["gulshan", "gulshan 1", "gulshan 2", "গুলশান, ঢাকা", "গুলশান"] },
  { label: "Bashundhara R/A, Dhaka", latitude: 23.8133, longitude: 90.4315, aliases: ["bashundhara", "bashundhara r/a", "bashundhara residential area", "বসুন্ধরা আবাসিক এলাকা, ঢাকা", "বসুন্ধরা আবাসিক এলাকা"] },
  { label: "Mirpur, Dhaka", latitude: 23.8223, longitude: 90.3654, aliases: ["mirpur", "mirpur 10", "mirpur 11", "mirpur 12", "মিরপুর, ঢাকা", "মিরপুর"] },
  { label: "Uttara, Dhaka", latitude: 23.8759, longitude: 90.3795, aliases: ["uttara", "uttara sector 7", "uttara sector 10", "উত্তরা, ঢাকা", "উত্তরা"] },
  { label: "Mohammadpur, Dhaka", latitude: 23.7658, longitude: 90.3584, aliases: ["mohammadpur", "মোহাম্মদপুর, ঢাকা", "মোহাম্মদপুর"] },
  { label: "Farmgate, Dhaka", latitude: 23.7588, longitude: 90.3897, aliases: ["farmgate", "ফার্মগেট, ঢাকা", "ফার্মগেট"] },
  { label: "Karwan Bazar, Dhaka", latitude: 23.7516, longitude: 90.3934, aliases: ["karwan bazar", "kawran bazar", "কারওয়ান বাজার, ঢাকা", "কারওয়ান বাজার"] },
  { label: "Dhaka University", latitude: 23.7339, longitude: 90.3929, aliases: ["dhaka university", "university of dhaka", "du", "ঢাকা বিশ্ববিদ্যালয়"] },
  { label: "BUET", latitude: 23.7268, longitude: 90.3925, aliases: ["buet", "bangladesh university of engineering and technology", "বুয়েট"] },
  { label: "North South University", latitude: 23.8158, longitude: 90.4255, aliases: ["north south university", "nsu", "নর্থ সাউথ ইউনিভার্সিটি"] },
  { label: "BRAC University", latitude: 23.7801, longitude: 90.4071, aliases: ["brac university", "bracu", "ব্র্যাক ইউনিভার্সিটি"] },
  { label: "Dhaka", latitude: 23.710396, longitude: 90.407438, aliases: ["dhaka city", "ঢাকা"] },
  { label: "Paltan, Dhaka", latitude: 23.73625, longitude: 90.41426, aliases: ["paltan", "পল্টন", "পল্টন, ঢাকা"] },
  { label: "Savar, Dhaka", latitude: 23.848585, longitude: 90.25002, aliases: ["savar", "সাভার", "সাভার, ঢাকা"] },
  { label: "Jatrabari, Dhaka", latitude: 23.71025, longitude: 90.434583, aliases: ["jatrabari", "যাত্রাবাড়ী", "যাত্রাবাড়ী, ঢাকা"] },
  { label: "Demra Staff Quarter, Dhaka", latitude: 23.7198604, longitude: 90.4904441, aliases: ["demra", "demra staff quarter", "ডেমরা", "ডেমরা স্টাফ কোয়ার্টার, ঢাকা"] },
  { label: "Sarulia Bazar, Dhaka", latitude: 23.7125556, longitude: 90.4988608, aliases: ["sarulia", "sarulia bazar", "সারুলিয়া", "সারুলিয়া বাজার, ঢাকা"] },
  { label: "Khilkhet, Dhaka", latitude: 23.8379719, longitude: 90.4180827, aliases: ["khilkhet", "খিলক্ষেত", "খিলক্ষেত, ঢাকা"] },
  { label: "Abdullahpur Bus Stand, Dhaka", latitude: 23.8795549, longitude: 90.4013056, aliases: ["abdullahpur", "abdullahpur bus stand", "আব্দুল্লাহপুর", "আব্দুল্লাহপুর বাসস্ট্যান্ড, ঢাকা"] },
  { label: "Narayanganj", latitude: 23.613516, longitude: 90.502977, aliases: ["narayanganj city", "narayangonj", "নারায়ণগঞ্জ", "নারায়ণগঞ্জ"] },
  { label: "Sonargaon, Narayanganj", latitude: 23.65, longitude: 90.6166667, aliases: ["sonargaon", "sonargaon narayangonj", "সোনারগাঁও", "সোনারগাঁও, নারায়ণগঞ্জ"] },
  { label: "Shimrail, Narayanganj", latitude: 23.6966386, longitude: 90.5103056, aliases: ["shimrail", "chittagong road", "শিমরাইল", "চিটাগাং রোড", "শিমরাইল, নারায়ণগঞ্জ"] },
  { label: "Siddhirganj Bridge, Narayanganj", latitude: 23.6886663, longitude: 90.514, aliases: ["siddhirganj", "siddhirganj bridge", "সিদ্ধিরগঞ্জ", "সিদ্ধিরগঞ্জ ব্রিজ, নারায়ণগঞ্জ"] },
  { label: "Narsingdi", latitude: 23.922976, longitude: 90.717676, aliases: ["narsingdi city", "narsinghdi", "narshingdi", "norsingdi", "নরসিংদী"] },
  { label: "Shaheed Moyez Uddin Bridge, Ghorashal", latitude: 23.9395552, longitude: 90.6185549, aliases: ["ghorashal bridge", "gorashal bridge", "moyez uddin bridge", "ghorashal", "ঘোড়াশাল", "ঘোড়াশাল", "ময়েজ উদ্দিন সেতু", "শহীদ ময়েজ উদ্দিন সেতু, ঘোড়াশাল"] },
  { label: "Gazipur", latitude: 23.99844, longitude: 90.422344, aliases: ["gazipur city", "gajipur", "joydebpur", "jaydebpur", "জয়দেবপুর", "জয়দেবপুর", "গাজীপুর"] },
  { label: "Tongi, Gazipur", latitude: 23.891535, longitude: 90.402324, aliases: ["tongi", "tangi", "tungi", "টঙ্গী", "টঙ্গী, গাজীপুর"] },
  { label: "Board Bazar, Gazipur", latitude: 23.9451941, longitude: 90.3827771, aliases: ["board bazar", "boardbazar", "board bazaar", "বোর্ড বাজার", "বোর্ড বাজার, গাজীপুর"] },
  { label: "Gazipur Chowrasta", latitude: 23.9894997, longitude: 90.3818049, aliases: ["joydebpur chowrasta", "gazipur chourasta", "jagroto chouronggi", "chowrasta gazipur", "জয়দেবপুর চৌরাস্তা", "জাগ্রত চৌরঙ্গী", "গাজীপুর চৌরাস্তা"] },
  { label: "Kaliganj, Gazipur", latitude: 23.9272771, longitude: 90.5451663, aliases: ["kaliganj gazipur", "কালীগঞ্জ", "কালীগঞ্জ, গাজীপুর"] },
  { label: "Panchdona, Narsingdi", latitude: 23.8933608, longitude: 90.6646944, aliases: ["panchdona", "pachdona", "পাঁচদোনা", "পাঁচদোনা, নরসিংদী"] },
  { label: "Madhabdi, Narsingdi", latitude: 23.8517, longitude: 90.6737, aliases: ["madhabdi", "মাধবদী", "মাধবদী, নরসিংদী"] },
];

export function normalizeLocationQuery(value: string) {
  return value.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

const normalize = normalizeLocationQuery;
const administrativeByLabel = new Map(administrativeLocations.map(location => [location.label, location]));
const curatedLabels = new Set(CURATED_LOCATIONS.map(location => location.label));
export const LOCATION_PRESETS: LocationPreset[] = [
  ...CURATED_LOCATIONS.map(location => {
    const administrative = administrativeByLabel.get(location.label);
    return { ...administrative, ...location,
      aliases: [...new Set([...(administrative?.aliases ?? []), ...(location.aliases ?? [])])] };
  }),
  ...administrativeLocations.filter(location => !curatedLabels.has(location.label)),
];
export const LOCATION_BY_LABEL = new Map(LOCATION_PRESETS.map(location => [location.label, location]));

// Build this once, not for every keystroke. Qualified names stay visible when names repeat.
const SEARCH_INDEX = LOCATION_PRESETS.map(preset => ({ preset,
  canonical: normalize(preset.label),
  candidates: [...new Set([preset.label, preset.labelBn ?? "", ...(preset.aliases ?? [])].filter(Boolean).map(normalize))],
}));

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

export function searchLocationPresets(value: string, limit = 6) {
  const query = normalize(value);
  if (!query) return [];
  const tokens = query.split(" ");
  return SEARCH_INDEX.map(({ preset, canonical, candidates }, index) => {
    const score = Math.min(...candidates.map(candidate => {
      if (candidate === query) return canonical === query ? -1 : 0;
      if (candidate.startsWith(query)) return 1;
      if (tokens.every(token => candidate.split(" ").some(word => word.startsWith(token)))) return 2;
      return Infinity;
    }));
    return { preset, score, index };
  }).filter(item => Number.isFinite(item.score))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, limit).map(item => item.preset);
}

export function resolveExactLocationPreset(value: string) {
  const query = normalize(value);
  if (!query) return undefined;
  const canonical = SEARCH_INDEX.find(item => item.canonical === query || (item.preset.labelBn && normalize(item.preset.labelBn) === query));
  if (canonical) return canonical.preset;
  const matches = SEARCH_INDEX.filter(item => item.candidates.includes(query));
  return matches.length === 1 ? matches[0].preset : undefined;
}

export function resolveLocationPreset(value?: string) {
  const query = normalize(value ?? "");
  if (!query) return undefined;
  const resolved = resolveExactLocationPreset(query);
  if (resolved) return resolved;
  const exact = SEARCH_INDEX.filter(item => item.candidates.includes(query));
  if (exact.length) return exact.length === 1 ? exact[0].preset : undefined;
  const partial = searchLocationPresets(query, 2);
  if (partial.length) return partial.length === 1 ? partial[0] : undefined;
  // Prefer the most specific whole phrase in an address, never a short acronym inside a word.
  const addressMatches = SEARCH_INDEX.flatMap(({ preset, candidates }) => candidates
    .filter(candidate => candidate.length > 2 && (" " + query + " ").includes(" " + candidate + " "))
    .map(candidate => ({ preset, length: candidate.length })));
  addressMatches.sort((a, b) => b.length - a.length);
  const longest = addressMatches[0]?.length;
  const best = new Set(addressMatches.filter(match => match.length === longest).map(match => match.preset));
  return best.size === 1 ? best.values().next().value : undefined;
}

export function describeMapCenter(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "Custom map area";

  const nearest = LOCATION_PRESETS
    .map((preset) => ({ preset, distance: distanceKm(latitude, longitude, preset) }))
    .sort((a, b) => a.distance - b.distance)[0];

  if (nearest && nearest.distance <= 0.35) return nearest.preset.label;
  if (nearest && nearest.distance <= 5) return `Near ${nearest.preset.label}`;

  return "Custom map area";
}
