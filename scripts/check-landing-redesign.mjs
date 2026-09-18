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
requireText(hero, 'params.set("radius", radius)', "selected radius URL handoff");
requireText(hero, 'name="radius"', "radius secondary filter");
requireText(hero, 'type="button"', "criteria-preserving popular-area controls");
requireText(hero, "customBudgetReady", "custom-budget validity gate");
requireText(hero, "const mapReady = Boolean(area && tenant && customBudgetReady)", "shared form/map minimum-criteria gate");

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

if (failures.length) {
  console.error("Landing redesign QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Landing redesign QA passed: desktop behavior and current mobile search contracts are intact.");
