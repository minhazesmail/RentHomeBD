import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireContract(source, contract, file) {
  if (!source.includes(contract)) {
    throw new Error(`${file} is missing required F12/F13 contract: ${contract}`);
  }
}

const detailFile = "src/app/homes/[id]/page.tsx";
const mapSearchFile = "src/components/renter-map-workspace.tsx";
const redirectFile = "src/lib/safe-redirect.ts";
const defaultsFile = "src/lib/search-defaults.ts";
const savedSearchFile = "src/components/saved-search-card.tsx";
const boundsMigrationFile = "supabase/migrations/20260828222137_bound_public_map_search_cost.sql";

const detail = read(detailFile);
const mapSearch = read(mapSearchFile);
const redirects = read(redirectFile);
const defaults = read(defaultsFile);
const savedSearch = read(savedSearchFile);
const boundsMigration = read(boundsMigrationFile).toLowerCase();

// F12: the map serializes its current center/filter/sort/selection into returnTo.
// The redesigned workspace also adds result-list scroll position. The detail route
// must consume the value, restrict it to /homes, and feed the complete relative
// URL (including query/hash) back to Next Link. Link copy may be localized.
for (const contract of [
  "searchReturnPath(propertyId)",
  "returnTo=${encodeURIComponent(searchReturnPath(propertyId))}",
  'params: Promise<{ id: string }>;',
  "searchParams: Promise<Record<string, string | string[] | undefined>>;",
  'typeof query.returnTo === "string" ? query.returnTo : null',
  "safeHomesReturnPath",
  'href={returnTo}>{copy.nav.backToMap}</Link>',
]) {
  requireContract(contract.includes("searchReturnPath") || contract.includes("returnTo=${") ? mapSearch : detail, contract, contract.includes("searchReturnPath") || contract.includes("returnTo=${") ? mapSearchFile : detailFile);
}

if (detail.includes('href="/homes">Back to map</Link>')) {
  throw new Error(`${detailFile} still hardcodes the Back to map destination.`);
}

for (const contract of [
  "export function safeHomesReturnPath",
  'const fallback = "/homes"',
  "const candidate = safeRelativePath(value, fallback)",
  'parsed.pathname === "/homes" || parsed.pathname === "/homes/"',
  "? candidate : fallback",
]) {
  requireContract(redirects, contract, redirectFile);
}

// F13: keep the editor and database on the same public-search bounds. A radius
// is mandatory, bedrooms are capped at 20, and the editor recovers legacy-null
// radius rows to the normal 15 km default instead of submitting NULL again.
for (const contract of [
  "DEFAULT_RENTER_SEARCH_RADIUS_KM = 15",
  "MIN_RENTER_SEARCH_RADIUS_KM = 0.5",
  "MAX_RENTER_SEARCH_RADIUS_KM = 100",
  "MAX_RENTER_SEARCH_BEDROOMS = 20",
  "MAX_RENTER_SEARCH_RENT_BDT = 10_000_000",
]) {
  requireContract(defaults, contract, defaultsFile);
}

for (const contract of [
  "search.radius_km == null ? DEFAULT_RENTER_SEARCH_RADIUS : String(search.radius_km)",
  "radius === null || !Number.isFinite(radius)",
  "radius < MIN_RENTER_SEARCH_RADIUS_KM || radius > MAX_RENTER_SEARCH_RADIUS_KM",
  "bedroomCount > MAX_RENTER_SEARCH_BEDROOMS",
  "radius_km: Number(radiusKm)",
  "min={MIN_RENTER_SEARCH_RADIUS_KM}",
  "max={MAX_RENTER_SEARCH_RADIUS_KM}",
  "placeholder={DEFAULT_RENTER_SEARCH_RADIUS} required",
  "max={MAX_RENTER_SEARCH_BEDROOMS}",
]) {
  requireContract(savedSearch, contract, savedSearchFile);
}

for (const retiredPattern of [
  'radiusKm === "" ? null : Number(radiusKm),\n        min_rent',
  "bedroomCount > 99",
  'max="99"',
  'placeholder="Any" required',
]) {
  if (savedSearch.includes(retiredPattern)) {
    throw new Error(`${savedSearchFile} still contains the invalid F13 editor behavior: ${retiredPattern}`);
  }
}

for (const contract of [
  "check (radius_km is not null and radius_km between 0.5 and 100)",
  "check (min_bedrooms is null or min_bedrooms between 0 and 20)",
  "check (min_rent is null or min_rent between 0 and 10000000)",
  "check (max_rent is null or max_rent between 0 and 10000000)",
]) {
  requireContract(boundsMigration, contract, boundsMigrationFile);
}

console.log("F12/F13 QA passed: property details restore validated map context and saved-search edits honor database search bounds.");
