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
    throw new Error(`${file} is missing required F08/F09 contract: ${contract}`);
  }
}

const saveButtonFile = "src/components/save-home-button.tsx";
const savedStateFile = "src/components/saved-homes-state.tsx";
const experienceFile = "src/components/homes-search-experience.tsx";
const mapSearchFile = "src/components/renter-map-workspace.tsx";
const resultsFile = "src/components/renter-results-list.tsx";
const migrationFile = "supabase/migrations/20260911033000_server_side_search_ordering.sql";

const saveButton = read(saveButtonFile);
const savedState = read(savedStateFile);
const experience = read(experienceFile);
const mapSearch = read(mapSearchFile);
const results = read(resultsFile);
const migration = read(migrationFile).toLowerCase();

// F08: one controller must own saved IDs, loading, pending mutations and rollback.
for (const contract of [
  "SavedHomesContext",
  "savedPropertyIds",
  "pendingPropertyIds",
  "errorByPropertyId",
  "setSavedPropertyIds((current) => setMembership(current, propertyId, nextSaved))",
  "setSavedPropertyIds((current) => setMembership(current, propertyId, wasSaved))",
  '.from("saved_properties")',
]) {
  requireContract(savedState, contract, savedStateFile);
}

for (const retiredPattern of ["useState(initialSaved)", "useOptimistic(saved", "startTransition(async"] ) {
  if (saveButton.includes(retiredPattern)) {
    throw new Error(`${saveButtonFile} still owns independent stale saved state: ${retiredPattern}`);
  }
}

requireContract(saveButton, "useSavedHomesState()", saveButtonFile);
requireContract(saveButton, "SavedHomesProvider", saveButtonFile);
requireContract(experience, "<SavedHomesProvider", experienceFile);
requireContract(experience, "authReady={personalization.authReady}", experienceFile);
if (experience.includes('.from("saved_properties")')) {
  throw new Error(`${experienceFile} must not maintain a second saved-properties cache outside SavedHomesProvider.`);
}

for (const retiredPattern of ["initialSavedPropertyIds", "savedSet.has", "savedPropertyIds={savedSet}"]) {
  if (mapSearch.includes(retiredPattern)) {
    throw new Error(`${mapSearchFile} still passes stale per-button saved snapshots: ${retiredPattern}`);
  }
}
for (const retiredPattern of ["initiallySaved", "savedPropertyIds: Set<string>"]) {
  if (results.includes(retiredPattern)) {
    throw new Error(`${resultsFile} still carries independent saved snapshots: ${retiredPattern}`);
  }
}

// F09: the client must send ordering intent and the database must rank/count
// candidates before applying the bounded 200-row response. The redesign makes
// tenant identity explicit: a profile preference may prefill the selector, but
// the selected tenant type is the server filter and no secondary ranking hint is sent.
for (const contract of [
  "sort_mode: requestedSort",
  "renter_tenant_type: tenantType",
  "preferred_tenant_type: null",
  "total_matches",
  "results_truncated",
  "void runSearch(center, nextSort)",
]) {
  requireContract(mapSearch, contract, mapSearchFile);
}

for (const contract of [
  "sort_mode text default 'distance'",
  "preferred_tenant_type public.tenant_type default null",
  "count(*) over () as total_matches",
  "row_number() over",
  "where ranked.result_rank <= 200",
  "ranked.total_matches > 200 as results_truncated",
  "sort_mode = 'rent-asc'",
  "sort_mode = 'rent-desc'",
  "sort_mode = 'recommended'",
  "round(p.latitude::numeric, 3)",
  "round(p.longitude::numeric, 3)",
  "security definer",
  "set search_path = ''",
]) {
  requireContract(migration, contract, migrationFile);
}

const limitIndex = migration.indexOf("where ranked.result_rank <= 200");
const rankingIndex = migration.indexOf("row_number() over");
if (rankingIndex < 0 || limitIndex < rankingIndex) {
  throw new Error(`${migrationFile} must rank candidates before applying the 200-row bound.`);
}

console.log("F08/F09 QA passed: saved-home state is shared/reconciled and search ordering happens before the bounded result cap.");
