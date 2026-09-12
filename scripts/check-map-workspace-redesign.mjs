import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: file is missing`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(source, text, label) {
  if (!source.includes(text)) failures.push(`missing ${label}`);
}

function requirePattern(source, pattern, label) {
  if (!pattern.test(source)) failures.push(`missing ${label}`);
}

function forbidPattern(source, pattern, label) {
  if (pattern.test(source)) failures.push(label);
}

const workspace = read("src/components/renter-map-workspace.tsx");
const map = read("src/components/leaflet-map.tsx");
const results = read("src/components/renter-results-list.tsx");
const mobile = read("src/components/mobile-map-model.tsx");
const mobileCss = read("src/components/mobile-map-model.module.css");
const css = read("src/app/homes/map-workspace.css");
const manifest = read("src/app/homes/styles.css");
const page = read("src/app/homes/page.tsx");
const copy = read("src/i18n/map-workspace-redesign-copy.ts");
const docs = read("docs/map-workspace-redesign.md");
const compatibilityEntry = read("src/components/renter-map-search.tsx");

// Desktop workspace composition and draft/apply contract.
requireText(compatibilityEntry, 'RenterMapWorkspace as RenterMapSearch', "existing renter search entrypoint routed through redesigned workspace");
requirePattern(workspace, /className="[^"]*\brenter-search-toolbar\b[^"]*"/, "persistent desktop search toolbar");
requireText(workspace, 'className="renter-workspace"', "map/results workspace split");
requireText(workspace, 'className="renter-results-pane"', "independently scrollable results pane");
requireText(css, "grid-template-columns: clamp(420px, 31vw, 480px) minmax(0, 1fr)", "420–480px result pane contract");
requireText(workspace, 'workspaceCopy.toolbar.tenantRequired', "required tenant-type validation");
requirePattern(workspace, /<select value=\{tenantType\} required/, "required tenant selector");
requireText(workspace, 'renter_tenant_type: tenantType', "tenant type sent to server search");
requireText(workspace, 'preferred_tenant_type: null', "explicit search tenant wins over soft preference");
requirePattern(workspace, /function clearFilters\(\)[\s\S]*?setMinRent\(""\)[\s\S]*?setMaxRent\(""\)[\s\S]*?setBedrooms\(""\)[\s\S]*?setRadiusKm\("15"\)/, "reset clears optional filters");
forbidPattern(workspace, /function clearFilters\(\)[\s\S]{0,500}?setTenantType\(""\)/, "clear filters must retain tenant type");
requireText(workspace, 'busy && visibleListings.length > 0', "stale-result preservation while updating");
requireText(workspace, 'workspaceCopy.results.updatingHint', "non-destructive update feedback");
requireText(workspace, 'mapDirty &&', "map dirty gate for search-this-area action");
requireText(workspace, 'workspaceCopy.map.searchThisArea', "Search this area control");
requirePattern(workspace, /function handleMapCenterChange[\s\S]*?setMapDirty\(true\)/, "map movement marks viewport dirty");

// Selection, hover/focus, exact-pin and return-state synchronization.
requireText(results, "onMouseEnter={() => onHighlight(listing.id)}", "result hover highlights marker");
requireText(results, "onFocusCapture={() => onHighlight(listing.id)}", "keyboard focus highlights marker");
requireText(results, "data-property-id={listing.id}", "addressable result cards for marker-to-list sync");
requireText(workspace, 'document.querySelector<HTMLElement>(`[data-property-id="${CSS.escape(propertyId)}"]`)', "marker selection scrolls result into view");
requireText(workspace, "setMapFocusVersion((version) => version + 1)", "show-on-map re-focus signal");
requireText(map, "function FocusListing", "intentional show-on-map viewport focus");
requireText(map, "function sameCoordinate", "identical-coordinate cluster detection");
requireText(map, 'className="map-cluster-chooser"', "identical-coordinate property chooser");
requireText(map, 'title={`${listing.title || copy.rentalProperty}. ${policy}`}', "tenant policy in accessible marker label");
requireText(workspace, 'listScroll: String(listScroll)', "list scroll serialized into detail return path");
requireText(page, "listScroll: params.listScroll", "list scroll restored from URL state");
requireText(workspace, "resultsPaneRef.current.scrollTop", "result pane scroll restoration");

// Mobile map-first model, three-position sheet, filter panel and Leaflet resize.
requireText(mobile, 'type SheetState = "collapsed" | "partial" | "expanded"', "three-position mobile result sheet state");
requireText(mobile, "data-mobile-sheet={sheet}", "mobile sheet state DOM contract");
requireText(mobile, 'const [view, setView] = useState<MobileView>("map")', "mobile map-first default");
requireText(mobile, "aria-pressed={sheet === \"collapsed\"}", "accessible sheet-position controls");
requireText(mobile, "aria-expanded={filtersOpen}", "accessible filter expansion state");
requireText(mobileCss, 'data-mobile-sheet="collapsed"', "collapsed mobile sheet layout");
requireText(mobileCss, 'data-mobile-sheet="expanded"', "expanded mobile sheet layout");
requireText(mobileCss, 'height: 100svh', "full-height mobile filters");
requireText(mobileCss, "env(safe-area-inset-bottom)", "mobile safe-area support");
requireText(workspace, 'className="mobile-search-summary"', "compact mobile search summary");
requireText(workspace, 'className="mobile-filter-footer"', "persistent mobile filter actions");
requireText(map, "function ResponsiveMapSize", "Leaflet resize synchronization");
requireText(map, 'attributeFilter: ["data-mobile-sheet", "data-mobile-view", "data-mobile-filters"]', "sheet/view resize observation");

// Visual/localization/architecture contract.
requireText(css, "--map-v2-primary: #0b4f3c", "deep emerald map token");
requireText(css, "--map-v2-background: #f7f5ef", "warm ivory map token");
requireText(css, "--map-v2-sand: #e8dfcf", "sand map token");
requireText(css, '[data-resolved-theme="dark"] .shell-renter .homes-page', "dark map workspace contract");
requireText(css, "@media (prefers-reduced-motion: reduce)", "map workspace reduced-motion contract");
requireText(manifest, '@import "./map-workspace.css" layer(component-appearance);', "final map workspace appearance layer");
requireText(copy, "const enMapWorkspaceRedesignCopy", "English map workspace copy");
requireText(copy, "const bnMapWorkspaceRedesignCopy", "Bangla map workspace copy");
requireText(docs, "Phase 3 — desktop map workspace", "desktop map workspace documentation");
requireText(docs, "Phase 4 — mobile map experience", "mobile map workspace documentation");

if (failures.length) {
  console.error("Map workspace redesign QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Map workspace redesign QA passed: desktop and mobile map contracts are intact.");
