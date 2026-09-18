import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireText(source, text, label) {
  if (!source.includes(text)) failures.push(`missing ${label}`);
}

function forbidText(source, text, label) {
  if (source.includes(text)) failures.push(label);
}

const propertyCard = read("src/components/property-card.tsx");
const results = read("src/components/renter-results-list.tsx");
const saved = read("src/components/saved-homes-workspace.tsx");
const recovery = read("src/components/search-recovery-state.tsx");
const workspace = read("src/components/renter-map-workspace.tsx");
const leaflet = read("src/components/leaflet-map.tsx");
const mobileModel = read("src/components/mobile-map-model.tsx");
const copy = read("src/i18n/renter-results-copy.ts");

requireText(propertyCard, "data-property-card", "shared PropertyCard marker");
requireText(results, "<PropertyCard", "shared PropertyCard in live results");
requireText(saved, "<PropertyCard", "shared PropertyCard in Saved homes");
requireText(results, 'data-shared-property-results', "shared result-list marker");
requireText(saved, "home.bedrooms != null", "known-only Saved bedroom fact");
requireText(saved, "home.bathrooms != null", "known-only Saved bathroom fact");
requireText(saved, "home.sizeSqft != null", "known-only Saved size fact");
forbidText(results, 'const bedrooms = listing.bedrooms == null ? "—"', "live result cards still fabricate missing bedroom placeholders");
forbidText(results, 'const bathrooms = listing.bathrooms == null ? "—"', "live result cards still fabricate missing bathroom placeholders");

for (const variant of ["empty", "error", "location", "map", "slow"]) {
  requireText(recovery, `"${variant}"`, `${variant} recovery variant`);
}
requireText(recovery, "data-search-recovery", "recovery-state test marker");
requireText(copy, "noResultsTitle", "localized no-results title");
requireText(copy, "searchErrorTitle", "localized search-error title");
requireText(copy, "slowSearchTitle", "localized slow-search title");
requireText(copy, "mapUnavailableTitle", "localized map failure title");
requireText(copy, "locationUnavailableTitle", "localized location failure title");

requireText(workspace, "setSearchError", "dedicated search-error state");
requireText(workspace, "setSlowSearch", "slow-search timer state");
requireText(workspace, "setLocationRecovery", "location recovery state");
requireText(workspace, "handleMapTileFailure", "map tile failure handler");
requireText(workspace, "mobileMapModel.showList()", "tile failure list fallback");
requireText(workspace, "retryMapTiles", "map retry action");
requireText(workspace, "onTileFailure={handleMapTileFailure}", "Leaflet tile failure wiring");
requireText(workspace, "onTilesReady={() => setMapTileFailed(false)}", "tile recovery wiring");
requireText(workspace, 'variant="map"', "map recovery rendering");
requireText(workspace, 'variant="location"', "location recovery rendering");

requireText(leaflet, "tileErrorCountRef.current === 3", "repeated tile-error threshold");
requireText(leaflet, "tileRetryVersion", "tile retry remount version");
requireText(leaflet, "onTileFailure?.()", "tile failure callback");
requireText(leaflet, "onTilesReady?.()", "tile ready callback");
requireText(mobileModel, "useMobileMapModel", "mobile map recovery context");
requireText(mobileModel, 'showList: () => showView("list")', "programmatic list fallback");
requireText(mobileModel, 'showMap: () => showView("map")', "programmatic map retry");

if (failures.length) {
  console.error("Task 4 mobile cards/recovery QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Task 4 mobile cards/recovery QA passed: shared cards and no-results/search/location/tile recovery contracts are intact.");
