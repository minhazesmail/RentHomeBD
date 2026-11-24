import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import ts from "typescript";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireText(source, text, label) {
  if (!source.includes(text)) failures.push(`missing ${label}`);
}

function requirePattern(source, pattern, label) {
  if (!pattern.test(source)) failures.push(`missing ${label}`);
}

function forbidText(source, text, label) {
  if (source.includes(text)) failures.push(label);
}

const page = read("src/app/page.tsx");
const hero = read("src/components/landing-hero-search.tsx");
const searchProvider = read("src/components/landing-search-provider.tsx");
const searchModel = read("src/lib/landing-search.ts");
const mobileHero = read("src/components/mobile-landing-experience.tsx");
const mobileCss = read("src/components/mobile-landing-experience.module.css");
const copy = read("src/i18n/landing-redesign-copy.ts");
const css = read("src/app/landing.css");
const manifest = read("src/app/styles.css");
const baseline = read("docs/redesign-system.md");

requireText(page, "<MobileLandingExperience />", "dedicated mobile landing composition");
requireText(page, 'className="landing-desktop-primary"', "desktop-only primary wrapper");
requireText(page, "<LandingHeroSearch>", "desktop landing hero search composition");
requireText(page, "<LandingMapPreview />", "real desktop landing map preview composition");
requireText(page, "dictionary.landing", "existing landing dictionary usage");
forbidText(page, 'name="bedrooms"', "bedrooms must not remain a primary landing-page field");

requirePattern(hero, /<input[\s\S]*?type="search"[\s\S]*?list="landing-location-options"[\s\S]*?required/, "required searchable area input");
requireText(hero, '<datalist id="landing-location-options">', "supported location suggestions");
requireText(hero, 'name="area" value={area}', "canonical area URL handoff");
requireText(searchProvider, "setCustomValidity", "shared unsupported-area native validation");
requireText(page, "<LandingSearchProvider>", "one shared responsive search provider");
requireText(hero, "useLandingSearch(areaInputRef)", "desktop shared search");
requireText(mobileHero, "useLandingSearch(areaInputRef)", "mobile shared search");
requirePattern(hero, /<select[\s\S]*?name="tenant"[\s\S]*?required/, "required tenant selector");
requireText(searchProvider, '{ value: "family"', "family renter option");
requireText(searchProvider, '{ value: "bachelor"', "bachelor renter option");
requireText(searchProvider, '{ value: "student"', "student renter option");
requireText(searchProvider, '{ value: "job_holder"', "job-holder renter option");
requireText(hero, '<details className="landing-search-more">', "secondary More filters disclosure");
requireText(hero, 'name="bedrooms"', "bedrooms secondary filter");
requireText(searchModel, 'params.set("tenant", tenant)', "tenant URL handoff");
requireText(searchModel, 'params.set("maxRent", maxRent)', "budget URL handoff");
requireText(searchModel, 'params.set("bedrooms", bedrooms)', "bedroom URL handoff");
requireText(searchModel, 'params.set("radius", radius)', "selected radius URL handoff");
requireText(hero, 'name="radius"', "radius secondary filter");
requireText(hero, 'type="button"', "criteria-preserving popular-area controls");
// Exercise the shared implementation rather than require a discarded local variable.
const compiledSearch = { exports: {} };
new Function("exports", ts.transpileModule(searchModel, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(compiledSearch.exports);
const { isCustomBudgetReady, buildHomesHref } = compiledSearch.exports;
for (const budget of ["", "999", "1250", "10000500", "Infinity", "not a number"]) {
  assert.equal(isCustomBudgetReady("custom", budget), false, "Invalid custom budget: " + budget);
}
for (const budget of ["1000", "1500", "30000", "10000000"]) {
  assert.equal(isCustomBudgetReady("custom", budget), true, "Valid custom budget: " + budget);
}
assert.equal(isCustomBudgetReady("15000", ""), true);
assert.deepEqual(Object.fromEntries(new URL(buildHomesHref({ area: "Banani, Dhaka", tenant: "family", maxRent: "30000", bedrooms: "4", radius: "10" }), "https://example.invalid").searchParams), {
  area: "Banani, Dhaka", tenant: "family", maxRent: "30000", bedrooms: "4", radius: "10",
});
assert.equal(buildHomesHref({ area: "", tenant: "", maxRent: "", bedrooms: "", radius: "15" }), "/homes?radius=15");
requireText(searchProvider, "const mapReady = Boolean(area && tenant && customBudgetReady)", "shared form/map minimum-criteria gate");

requireText(mobileHero, "mobileTitleLead", "mobile editorial headline lead");
requireText(mobileHero, "mobileTitleAccent", "mobile editorial italic headline accent");
requireText(mobileHero, "data-mobile-entry-search", "mobile primary entry search");
requireText(mobileHero, 'data-mobile-search-field="area"', "mobile direct area field");
requireText(mobileHero, 'data-mobile-search-field="tenant"', "mobile direct required tenant field");
requireText(mobileHero, 'data-mobile-search-field="budget"', "mobile direct optional budget field");
requireText(mobileHero, "data-mobile-more-filters", "mobile secondary More filters disclosure");
requireText(mobileHero, 'name="bedrooms"', "mobile bedrooms secondary filter");
requireText(mobileHero, 'name="radius"', "mobile radius secondary filter");
requireText(mobileHero, 'name="tenant"', "mobile tenant URL handoff");
requireText(mobileHero, 'name="area" value={area}', "mobile canonical area URL handoff");
requireText(mobileHero, 'name="maxRent"', "mobile budget URL handoff");
forbidText(mobileHero, "showModal()", "mobile entry search must not hide primary criteria in modal sheets");
forbidText(mobileHero, "openFilter(", "mobile primary search still uses filter-pill modal flow");
forbidText(mobileHero, "Property type", "mobile landing must not invent unsupported property type filtering");
forbidText(mobileHero, "Room type", "mobile landing must not invent unsupported room type filtering");

requireText(mobileCss, "@media (max-width: 820px)", "mobile/tablet concept breakpoint");
requireText(mobileCss, ".primaryFields", "direct mobile primary-field stack");
requireText(mobileCss, ".moreFilters", "mobile More filters disclosure styling");
requireText(mobileCss, ':global(html[data-resolved-theme="dark"]) .root', "mobile concept dark appearance");
requireText(mobileCss, "@media (prefers-reduced-motion: reduce)", "mobile concept reduced-motion handling");

requireText(copy, "const enLandingRedesignCopy", "English redesign copy");
requireText(copy, "const bnLandingRedesignCopy", "Bangla redesign copy");
requireText(copy, "Find a home that fits.", "planned hero message");
requireText(copy, "আপনার জন্য মানানসই বাসা খুঁজুন।", "localized planned hero message");
requireText(copy, "mobileSearchHomes", "localized mobile search CTA");
requireText(copy, "unsupportedArea", "localized supported-area validation copy");

requireText(css, "--landing-v2-primary: #0b4f3c", "deep emerald primary token");
requireText(css, "--landing-v2-background: #f7f5ef", "warm ivory background token");
requireText(css, "--landing-v2-sand: #e8dfcf", "sand accent token");
requireText(css, "grid-template-columns: minmax(0, 0.82fr) minmax(500px, 1fr)", "45/55 desktop hero balance");
requireText(css, '[data-resolved-theme="dark"] .landing-shell', "dark appearance contract");
requireText(css, "@media (prefers-reduced-motion: reduce)", "reduced-motion contract");
requireText(manifest, '@import "./landing.css" layer(component-appearance);', "canonical final landing style layer");
requireText(baseline, "Tenant type is therefore a primary search input", "documented tenant-first product rule");


const inventorySource = read("src/lib/landing-inventory.ts");
const compiledInventory = ts.transpileModule(inventorySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
async function runInventoryCase(countResult, propertyResult) {
  const compiledModule = { exports: {} };
  const mockClient = {
    from: table => {
      if (table !== "properties") throw new Error("Unexpected query: " + table);
      return { select: () => ({ eq: () => Promise.resolve(countResult) }) };
    },
    rpc: () => Promise.resolve(propertyResult),
  };
  const imports = {
    react: { cache: fn => fn },
    "@supabase/supabase-js": { createClient: () => mockClient },
    "@/lib/supabase/config": { SUPABASE_URL: "https://example.invalid", SUPABASE_PUBLISHABLE_KEY: "test" },
    "@/lib/tenant-match": { tenantSummary: () => "" },
  };
  new Function("require", "module", "exports", compiledInventory)(name => {
    if (!(name in imports)) throw new Error("Unexpected import: " + name);
    return imports[name];
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports.getLandingInventory();
}
const empty = await runInventoryCase({ count: 0, error: null }, { data: [], error: null });
assert.deepEqual(empty, { availableCount: 0, status: "ready", featuredListings: [] });
for (const [count, rows] of [
  [{ count: null, error: { message: "count failed" } }, { data: [], error: null }],
  [{ count: 0, error: null }, { data: null, error: { message: "inventory failed" } }],
  [{ count: 3, error: null }, { data: [], error: null }],
  [{ count: 0, error: null }, { data: null, error: null }],
]) {
  const unavailable = await runInventoryCase(count, rows);
  assert.deepEqual(unavailable, { availableCount: null, status: "unavailable", featuredListings: [] });
}
console.log("Landing inventory QA passed: confirmed empty, count failure, inventory failure, and inconsistent snapshots remain distinct.");

if (failures.length) {
  console.error("Landing redesign QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Landing redesign QA passed: desktop behavior and current mobile search contracts are intact.");
