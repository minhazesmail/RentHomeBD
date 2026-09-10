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
    throw new Error(`${file} is missing required F10/F11 contract: ${contract}`);
  }
}

const mapSearchFile = "src/components/renter-map-search.tsx";
const migrationFile = "supabase/migrations/20260911040000_server_side_polygon_search.sql";
const mapSearch = read(mapSearchFile);
const migration = read(migrationFile).toLowerCase();

// F10: a finished/edited polygon must become part of the server request. The
// old browser-only point-in-polygon filter must not survive, because it can only
// filter the already-truncated radius response.
for (const contract of [
  "customAreaGeoJson",
  "search_polygon: searchPolygon",
  "void runSearch(center, sortOption, customArea)",
  "void runSearch(center, sortOption, points)",
  "void runSearch(center, sortOption, null)",
  "const visibleListings = orderedListings",
  "customAreaActive={customAreaActive}",
]) {
  requireContract(mapSearch, contract, mapSearchFile);
}

if (mapSearch.includes("pointInPolygon(")) {
  throw new Error(`${mapSearchFile} still filters drawn areas only in the browser.`);
}

for (const contract of [
  "search_polygon jsonb default null",
  "extensions.st_geomfromgeojson(search_polygon)",
  "extensions.st_isvalid(polygon_geometry)",
  "search_polygon is null",
  "extensions.st_dwithin(",
  "search_polygon is not null",
  "extensions.st_intersects(",
  "polygon_point_count < 4 or polygon_point_count > 101",
  "round(p.latitude::numeric, 3)",
  "round(p.longitude::numeric, 3)",
  "where ranked.result_rank <= 200",
  "security definer",
  "set search_path = ''",
]) {
  requireContract(migration, contract, migrationFile);
}

const radiusPredicate = migration.indexOf("search_polygon is null");
const polygonPredicate = migration.indexOf("search_polygon is not null");
const candidateLimit = migration.indexOf("where ranked.result_rank <= 200");
if (radiusPredicate < 0 || polygonPredicate < 0 || candidateLimit < polygonPredicate) {
  throw new Error(`${migrationFile} must choose radius/polygon membership before the bounded result cap.`);
}

// F11: every run invalidates and aborts the previous request, and stale work is
// checked after each async stage before it can commit results. This protects
// sort changes, GPS refreshes, polygon edits and rapid manual searches.
for (const contract of [
  "const searchRequestIdRef = useRef(0)",
  "const searchAbortRef = useRef<AbortController | null>(null)",
  "const requestId = ++searchRequestIdRef.current",
  "searchAbortRef.current?.abort()",
  "const isCurrentSearch = () => searchRequestIdRef.current === requestId && !searchController.signal.aborted",
  ").abortSignal(searchController.signal)",
  "cancelActiveSearch()",
  "searchRequestIdRef.current += 1",
]) {
  requireContract(mapSearch, contract, mapSearchFile);
}

const staleChecks = mapSearch.match(/if \(!isCurrentSearch\(\)\) return;/g)?.length ?? 0;
if (staleChecks < 4) {
  throw new Error(`${mapSearchFile} must guard every async search stage; found only ${staleChecks} stale-request checks.`);
}

const finalGuard = mapSearch.lastIndexOf("if (!isCurrentSearch()) return;");
const resultCommit = mapSearch.indexOf("setListings(hydrated)");
if (finalGuard < 0 || resultCommit < finalGuard) {
  throw new Error(`${mapSearchFile} must verify request freshness immediately before committing listings.`);
}

console.log("F10/F11 QA passed: custom areas are server-queried and stale searches cannot overwrite newer results.");
