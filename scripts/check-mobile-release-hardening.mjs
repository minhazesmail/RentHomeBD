import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
const expect = (source, text, message) => { if (!source.includes(text)) failures.push(message); };
const reject = (source, text, message) => { if (source.includes(text)) failures.push(message); };

const mobile = read("src/app/mobile-app.css");
const accessibility = read("src/app/accessibility-audit.css");
const responsive = read("src/app/responsive-audit.css");
const productNav = read("src/components/product-navigation.module.css");
const productNavTsx = read("src/components/product-navigation.tsx");
const language = read("src/components/language-switcher.module.css");
const theme = read("src/components/theme-switcher.module.css");
const packageJson = JSON.parse(read("package.json"));
const ci = read(".github/workflows/ci.yml");
const mobileWorkflow = read(".github/workflows/mobile-concept.yml");
const releaseBrowser = read("scripts/check-mobile-release-browser.mjs");
const mobileLanding = read("src/components/mobile-landing-experience.tsx");
const homesMobileAlignment = read("src/app/homes/mobile-concept-alignment.css");
const globalTheme = read("src/app/theme.css");

expect(mobile, "--mobile-app-topbar-height: calc(58px + env(safe-area-inset-top));", "mobile topbar token must include top safe area");
expect(mobile, "--mobile-app-tabbar-height: calc(64px + env(safe-area-inset-bottom));", "mobile tabbar token must include bottom safe area");
expect(mobile, "--mobile-app-control-height: 48px;", "mobile primary control token");
expect(mobileLanding, "data-mobile-explore-map", "mobile landing Explore this area must remain an actionable link");
expect(mobileLanding, "<Link href={mapHref} data-mobile-explore-map>", "mobile landing map CTA must always render as a Link");
reject(mobileLanding, "mapReady ?", "mobile landing map CTA must not be replaced by a disabled non-action");
expect(mobile, "--mobile-app-hit-target: 44px;", "mobile hit-target token");
expect(productNav, "min-height: var(--mobile-app-topbar-height", "authenticated mobile topbar must consume shared safe-area height");
expect(productNav, "padding: calc(7px + env(safe-area-inset-top))", "authenticated mobile topbar must pad around the notch");
expect(productNav, "@media (max-width: 1040px)", "product navigation must collapse before tablet/laptop collision");
expect(productNav, "min-height: 44px", "product navigation must keep touch-safe targets through tablet");
expect(productNavTsx, "data-mobile-primary-tabs", "stable primary mobile tab marker");
expect(productNavTsx, "data-mobile-tabs={showMobileTabs ? \"true\" : \"false\"}", "contextual routes must still suppress primary tabs");

expect(language, "@media (max-width: 1040px)", "language control must remain touch-safe through tablet");
expect(language, "min-height: 44px", "language controls must meet 44px target");
expect(theme, "@media (max-width: 1040px)", "appearance control must remain touch-safe through tablet");
expect(theme, "width: 44px", "compact appearance trigger must be a 44px target");
expect(theme, ".option {\n    min-height: 44px;", "appearance menu options must be 44px targets");

expect(accessibility, "Task 10 — final mobile accessibility seam hardening", "Task 10 accessibility seam contract");
expect(accessibility, "scroll-margin-block-start: calc(var(--mobile-app-topbar-height", "focus targets must clear sticky top chrome");
expect(accessibility, "scroll-margin-block-end: calc(var(--mobile-app-tabbar-height", "focus targets must clear bottom tabs");
expect(accessibility, "[data-mobile-moderation-nav]", "reduced-transparency and forced-colors coverage must include moderator nav");
expect(accessibility, "[data-mobile-listing-workflow]", "accessibility coverage must include listing workflow");
expect(accessibility, "@media (forced-colors: active)", "forced-colors contract must remain");
expect(accessibility, "@media (prefers-reduced-motion: reduce)", "reduced-motion contract must remain");
expect(accessibility, "@media (prefers-reduced-transparency: reduce)", "reduced-transparency contract must remain");
expect(responsive, ".information-nav .primary-button {\n    min-height: 44px;", "small-phone navigation CTAs must stay 44px");
expect(read("src/components/mobile-landing-experience.module.css"), ".areaField input {\n    width: 100%;\n    min-height: 44px;", "mobile landing area input must remain 44px");
expect(read("src/components/mobile-landing-experience.module.css"), ".fieldBody select {\n    width: 100%;\n    min-height: 44px;", "mobile landing direct selects must remain 44px");
expect(read("src/app/homes/map-workspace.css"), "min-height: 44px;", "mobile map quick actions must retain 44px targets");
expect(read("src/app/auth-verification-redesign.css"), ".auth-tabs button {\n  min-height: 44px;", "final auth method tabs must remain 44px");
reject(homesMobileAlignment, 'content: url("/nearbasha-logo-on-dark.svg")', "light mobile /homes must not force the on-dark brand asset");
expect(globalTheme, 'html[data-resolved-theme="dark"] .brand-logo img {\n  content: url("/nearbasha-logo-on-dark.svg");', "dark theme must retain the on-dark brand asset");

const taskContracts = [
  ["scripts/check-mobile-foundation.mjs", "Task 1"],
  ["scripts/check-mobile-cards-recovery.mjs", "Task 4"],
  ["scripts/check-mobile-property-detail.mjs", "Task 5"],
  ["scripts/check-mobile-renter-workspaces.mjs", "Task 6"],
  ["scripts/check-mobile-owner-portfolio.mjs", "Task 7"],
  ["scripts/check-mobile-listing-editor.mjs", "Task 8"],
  ["scripts/check-mobile-moderator.mjs", "Task 9"],
];
for (const [file, label] of taskContracts) { if (!fs.existsSync(path.join(root, file))) failures.push(`${label} regression gate is missing: ${file}`); }

for (const command of [
  "node scripts/check-mobile-foundation.mjs",
  "node scripts/check-mobile-cards-recovery.mjs",
  "node scripts/check-mobile-property-detail.mjs",
  "node scripts/check-mobile-renter-workspaces.mjs",
  "node scripts/check-mobile-owner-portfolio.mjs",
  "node scripts/check-mobile-listing-editor.mjs",
  "node scripts/check-mobile-moderator.mjs",
]) { if (!packageJson.scripts?.uiqa?.includes(command)) failures.push(`uiqa lost prior mobile contract: ${command}`); }

expect(read("src/app/owner/properties/listing-mobile-editor.css"), "env(safe-area-inset-bottom)", "listing editor bottom actions must remain safe-area aware");
expect(read("src/app/homes/property-detail-flow-redesign.css"), "env(safe-area-inset-bottom)", "property detail contact dock must remain safe-area aware");
expect(read("src/app/saved/saved-workspace-redesign.css"), "--mobile-app-topbar-height", "Saved sticky workspace must keep shared topbar offset");
expect(read("src/app/messages/messages-workspace-redesign.css"), "--mobile-app-tabbar-height", "Messages inbox must reserve primary tabs");
expect(read("src/app/moderation/moderation-mobile.css"), "min-height: 48px", "Moderator decisions must retain 48px actions");
reject(mobile, "--mobile-app-topbar-height: 58px;", "hard-coded topbar height returned without safe area");
for (const breakpoint of ["320x568", "360x800", "390x844", "430x932", "768x1024", "960x900"]) {
  expect(releaseBrowser, breakpoint, `release browser matrix is missing ${breakpoint}`);
}
expect(releaseBrowser, 'reducedMotion: "reduce"', "release browser matrix must exercise reduced motion");
expect(releaseBrowser, 'forcedColors: "active"', "release browser matrix must exercise forced colors");
expect(ci, "Release hardening browser QA", "full CI must run release browser QA");
expect(ci, "npm run releasebrowserqa", "full CI must invoke release browser script");
expect(mobileWorkflow, "Validate release breakpoint and accessibility matrix", "mobile workflow must run final release matrix");
expect(mobileWorkflow, "artifacts/release-hardening", "mobile workflow must preserve release screenshots");

if (failures.length) {
  console.error("Task 10 release hardening QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("Task 10 release hardening QA passed: safe areas, touch targets, accessibility preferences, and Tasks 1–9 mobile contracts remain consolidated.");
