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

function requirePattern(source, pattern, label) {
  if (!pattern.test(source)) failures.push(`missing ${label}`);
}

function forbidText(source, text, label) {
  if (source.includes(text)) failures.push(label);
}

const page = read("src/app/page.tsx");
const hero = read("src/components/landing-hero-search.tsx");
const copy = read("src/i18n/landing-redesign-copy.ts");
const css = read("src/app/landing.css");
const manifest = read("src/app/styles.css");
const baseline = read("docs/redesign-system.md");

requireText(page, "<LandingHeroSearch>", "landing hero search composition");
requireText(page, "<LandingMapPreview />", "real landing map preview composition");
requireText(page, "dictionary.landing", "existing landing dictionary usage");
forbidText(page, 'name="bedrooms"', "bedrooms must not remain a primary landing-page field");

requirePattern(hero, /<input[\s\S]*?type="search"[\s\S]*?list="landing-location-options"[\s\S]*?required/, "required searchable area input");
requireText(hero, '<datalist id="landing-location-options">', "supported location suggestions");
requireText(hero, 'name="area" value={area}', "canonical area URL handoff");
requireText(hero, "setCustomValidity", "unsupported-area native validation");
requirePattern(hero, /<select[\s\S]*?name="tenant"[\s\S]*?required/, "required tenant selector");
requireText(hero, '{ value: "family"', "family renter option");
requireText(hero, '{ value: "bachelor"', "bachelor renter option");
requireText(hero, '{ value: "student"', "student renter option");
requireText(hero, '{ value: "job_holder"', "job-holder renter option");
requireText(hero, '<details className="landing-search-more">', "secondary More filters disclosure");
requireText(hero, 'name="bedrooms"', "bedrooms secondary filter");
requireText(hero, 'params.set("tenant", tenant)', "tenant URL handoff");
requireText(hero, 'params.set("maxRent", maxRent)', "budget URL handoff");
requireText(hero, 'params.set("bedrooms", bedrooms)', "bedroom URL handoff");
requireText(hero, 'params.set("radius", DEFAULT_RENTER_SEARCH_RADIUS)', "explicit radius handoff");
requireText(hero, 'type="button"', "criteria-preserving popular-area controls");
requireText(hero, "customBudgetReady", "custom-budget validity gate");
requireText(hero, "const mapReady = Boolean(area && tenant && customBudgetReady)", "shared form/map minimum-criteria gate");

requireText(copy, "const enLandingRedesignCopy", "English redesign copy");
requireText(copy, "const bnLandingRedesignCopy", "Bangla redesign copy");
requireText(copy, "Find a home that fits your life.", "planned hero message");
requireText(copy, "আপনার জীবনের সঙ্গে মানানসই বাসা খুঁজুন।", "localized planned hero message");
requireText(copy, "unsupportedArea", "localized supported-area validation copy");

requireText(css, "--landing-v2-primary: #0b4f3c", "deep emerald primary token");
requireText(css, "--landing-v2-background: #f7f5ef", "warm ivory background token");
requireText(css, "--landing-v2-sand: #e8dfcf", "sand accent token");
requireText(css, "grid-template-columns: minmax(0, 0.82fr) minmax(500px, 1fr)", "45/55 desktop hero balance");
requireText(css, '[data-resolved-theme="dark"] .landing-shell', "dark appearance contract");
requireText(css, "@media (prefers-reduced-motion: reduce)", "reduced-motion contract");
requireText(manifest, '@import "./landing.css" layer(component-appearance);', "canonical final landing style layer");
requireText(baseline, "Tenant type is therefore a primary search input", "documented tenant-first product rule");

if (failures.length) {
  console.error("Landing redesign QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Landing redesign QA passed: design-system and tenant-aware landing handoff contracts are intact.");
