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

function requireText(relativePath, text, label = text) {
  if (!read(relativePath).includes(text)) failures.push(`${relativePath}: missing ${label}`);
}

function forbidText(relativePath, text, label = text) {
  if (read(relativePath).includes(text)) failures.push(`${relativePath}: ${label}`);
}

const routeThemes = [
  ["src/app/landing-theme.css", "src/app/landing-styles.css", "landing-theme.css"],
  ["src/app/homes/homes-theme.css", "src/app/homes/styles.css", "homes-theme.css"],
  ["src/app/saved/saved-theme.css", "src/app/saved/styles.css", "saved-theme.css"],
  ["src/app/messages/messages-theme.css", "src/app/messages/styles.css", "messages-theme.css"],
  ["src/app/dashboard/dashboard-theme.css", "src/app/dashboard/styles.css", "dashboard-theme.css"],
  ["src/app/owner/owner-theme.css", "src/app/owner/styles.css", "owner-theme.css"],
  ["src/app/moderation/moderation-theme.css", "src/app/moderation/styles.css", "moderation-theme.css"],
  ["src/app/information-theme.css", "src/app/information-styles.css", "information-theme.css"],
  ["src/app/auth-theme.css", "src/app/auth-styles.css", "auth-theme.css"],
];

for (const file of [
  "src/theme/config.ts",
  "src/theme/get-theme.ts",
  "src/theme/theme-provider.tsx",
  "src/theme/use-theme.ts",
  "src/theme/copy.ts",
  "src/components/theme-switcher.tsx",
  "src/components/theme-switcher.module.css",
  "src/app/theme-tokens.css",
  "src/app/theme.css",
  "src/app/theme-dark-compat.css",
  "src/app/landing-how-theme.css",
  "scripts/check-theme-browser.mjs",
  "scripts/check-how-theme-browser.mjs",
  ...routeThemes.map(([themeFile]) => themeFile),
]) {
  read(file);
}

/* Preference/state contract */
requireText("src/theme/config.ts", '["system", "light", "dark"]', "system/light/dark preference contract");
requireText("src/theme/config.ts", 'THEME_COOKIE_NAME = "nb_theme"', "theme cookie name");
requireText("src/theme/get-theme.ts", "await cookies()", "server cookie resolution");
requireText("src/app/layout.tsx", "getThemePreference()", "server theme preference read");
requireText("src/app/layout.tsx", "data-theme={themePreference}", "SSR preference attribute");
requireText("src/app/layout.tsx", "data-resolved-theme={initialResolvedTheme}", "SSR resolved-theme attribute");
requireText("src/app/layout.tsx", "suppressHydrationWarning", "prepaint system hydration safety");
requireText("src/app/layout.tsx", "themeBootstrap", "prepaint system appearance bootstrap");
requireText("src/app/layout.tsx", 'matchMedia("(prefers-color-scheme: dark)")', "bootstrap OS appearance resolution");
requireText("src/app/layout.tsx", "themeReady", "bootstrap readiness marker");
requireText("src/app/layout.tsx", "<ThemeProvider initialPreference={themePreference}>", "theme provider");

requireText("src/theme/theme-provider.tsx", 'matchMedia("(prefers-color-scheme: dark)")', "live system preference listener");
requireText("src/theme/theme-provider.tsx", "currentDocumentTheme", "hydration from prepaint resolved appearance");
requireText("src/theme/theme-provider.tsx", "document.documentElement.dataset.theme = nextPreference", "instant preference update");
requireText("src/theme/theme-provider.tsx", "document.documentElement.dataset.resolvedTheme = theme", "resolved visual mode update");
requireText("src/theme/theme-provider.tsx", "dataset.themeReady", "resolved readiness marker");
requireText("src/theme/theme-provider.tsx", "SameSite=Lax", "theme cookie safety attributes");
forbidText("src/theme/theme-provider.tsx", "router.refresh()", "theme changes must not force route refreshes");

/* Accessible switcher */
requireText("src/components/theme-switcher.tsx", 'role="menuitemradio"', "radio semantics for appearance options");
requireText("src/components/theme-switcher.tsx", "aria-checked={active}", "selected appearance semantics");
requireText("src/components/theme-switcher.tsx", 'event.key === "Escape"', "Escape dismissal");
requireText("src/components/theme-switcher.module.css", ".root:not([open]) .menu", "closed appearance menu hiding contract");
requireText("src/components/marketing-navigation.tsx", "<ThemeSwitcher compact />", "marketing appearance control");
requireText("src/components/product-navigation.tsx", "<ThemeSwitcher compact />", "product appearance control");
requireText("src/app/login/page.tsx", "<ThemeSwitcher compact />", "login appearance control");
requireText("src/app/account/phone/page.tsx", "<ThemeSwitcher compact />", "phone verification appearance control");

/* Cascade ownership: route-wide appearance resolves in theme; complete local
   component contracts may resolve one final step later. */
requireText("src/app/styles.css", 'route-atmosphere, theme, component-appearance;', "component appearance as final cascade layer");
requireText("src/app/styles.css", '@import "./theme-tokens.css" layer(theme);', "appearance tokens in route-wide theme layer");
requireText("src/app/styles.css", '@import "./theme.css" layer(theme);', "global appearance behavior in route-wide theme layer");
requireText("src/app/styles.css", '@import "./landing-theme.css" layer(theme);', "root landing appearance bridge");
requireText("src/app/styles.css", '@import "./landing-how-theme.css" layer(component-appearance);', "journey component appearance ownership");
forbidText("src/app/styles.css", '@import "./theme-tokens.css" layer(tokens);', "theme tokens must not load before globals");
forbidText("src/app/styles.css", "theme-compat.css", "unscoped legacy theme compatibility must not load globally");
forbidText("src/app/styles.css", "theme-module-overrides.css", "unscoped CSS-module repaint overrides must not load globally");

/* Complete semantic token contract. */
for (const token of [
  "--surface-elevated:",
  "--surface-inverse:",
  "--surface-input:",
  "--surface-hover:",
  "--surface-selected:",
  "--surface-overlay:",
  "--text-primary:",
  "--text-secondary:",
  "--text-inverse:",
  "--control-background:",
  "--control-border:",
  "--accent-contrast:",
  "--accent-soft-strong:",
  "--focus-ring:",
]) {
  requireText("src/app/theme-tokens.css", token, `semantic token ${token}`);
}

const themeTokens = read("src/app/theme-tokens.css");
const lightRoot = themeTokens.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
for (const legacy of ["--nb-ink:", "--nb-emerald:", "--nb-ivory:", "--nb-paper:", "--nb-line:"]) {
  if (lightRoot.includes(legacy)) failures.push(`src/app/theme-tokens.css: light :root must not remap legacy alias ${legacy}`);
}

requireText("src/app/theme-tokens.css", 'html[data-resolved-theme="dark"]', "resolved dark palette");
requireText("src/app/theme-tokens.css", '@media (prefers-color-scheme: dark)', "system no-JS/pre-hydration fallback");
requireText("src/app/theme-tokens.css", 'html[data-theme="system"]', "system palette fallback");
requireText("src/app/theme-tokens.css", "color-scheme: light dark", "native system color scheme");
requireText("src/app/theme-tokens.css", "--map-area-stroke", "theme-aware map vector color");
for (const legacy of ["--nb-ink:", "--nb-emerald:", "--nb-sage-soft:", "--nb-ivory:", "--nb-paper:", "--nb-line:"]) {
  requireText("src/app/theme-tokens.css", legacy, `dark compatibility alias ${legacy}`);
}

/* The global theme sheet must stay route agnostic. The shared marketing nav may
   reference `.landing-nav`, but route content surfaces must remain local. */
requireText("src/app/theme.css", 'html[data-resolved-theme="dark"]', "dark-only visual scope");
requireText("src/app/theme.css", ".leaflet-popup-content-wrapper", "Leaflet popup theming");
requireText("src/app/theme.css", "Raster OSM tiles remain", "explicit basemap strategy");
forbidText("src/app/theme.css", "\nbody {", "unscoped body theme rule is forbidden");
forbidText("src/app/theme.css", "\nhtml {", "unscoped html theme rule is forbidden");
for (const routeSelector of [
  ".landing-shell",
  ".landing-search-",
  ".landing-how-",
  ".landing-listing-",
  ".homes-",
  ".renter-",
  ".property-detail-",
  ".saved-",
  ".messages-",
  ".dashboard-",
  ".owner-",
  ".moderation-",
  ".auth-",
  ".info-",
]) {
  forbidText("src/app/theme.css", routeSelector, `global theme sheet must not own route selector ${routeSelector}`);
}

/* Every major route family owns its appearance bridge in the route-wide theme layer. */
for (const [themeFile, manifest, importName] of routeThemes) {
  requireText(themeFile, 'html[data-resolved-theme="dark"]', `${themeFile} dark scope`);
  requireText(manifest, `@import "./${importName}" layer(theme);`, `${manifest} route-owned appearance import`);
}

/* The How-it-works component owns a complete semantic surface contract in the
   final component layer so Light controls cannot leak into Dark content. */
for (const token of [
  "--journey-shell-color:",
  "--journey-control-color:",
  "--journey-panel-color:",
  "--journey-text:",
  "--journey-muted:",
  "--journey-active-foreground:",
]) {
  requireText("src/app/landing-how-theme.css", token, `journey semantic token ${token}`);
}
requireText("src/app/landing-how-theme.css", 'html[data-resolved-theme="dark"] main.landing-shell .landing-how-tabs-shell', "resolved-dark journey contract");
requireText("src/app/landing-how-theme.css", '.landing-how-tabs-shell.owner', "owner journey variant");
requireText("src/app/landing-how-theme.css", ".landing-how-panel-heading h3", "journey heading foreground ownership");
requireText("src/app/landing-how-theme.css", ".landing-step-cards > li", "connected journey step ownership");

/* CSS Modules must consume semantic tokens themselves rather than depending on
   global specificity battles. */
requireText("src/components/saved-homes-workspace.module.css", "var(--surface-solid)", "semantic saved card surface");
requireText("src/components/saved-homes-workspace.module.css", "var(--control-background)", "semantic saved control surface");
requireText("src/components/saved-homes-workspace.module.css", "var(--accent-contrast)", "semantic saved accent text");
forbidText("src/components/saved-homes-workspace.module.css", "background: #fff;", "saved module contains fixed white surface");
forbidText("src/components/saved-homes-workspace.module.css", "background: #f6f8f3;", "saved module contains fixed light toolbar surface");
requireText("src/components/listing-workflow-nav.module.css", "color: var(--accent-contrast);", "semantic completed listing-step contrast");
requireText("src/components/property-location-actions.module.css", "color: var(--muted);", "semantic property-location helper text");
forbidText("src/components/property-location-actions.module.css", "--color-text-muted", "undefined property-location text token fallback");
requireText("src/components/marketing-navigation.module.css", ':global(html[data-resolved-theme="dark"]) .actions :global(.primary-button)', "module-owned dark marketing CTA contrast");

requireText("src/components/brand-logo.tsx", '"brand-logo"', "stable brand-logo theme hook");
requireText("src/app/theme.css", 'content: url("/nearbasha-logo-on-dark.svg")', "dark logo asset swap");
requireText("src/components/product-navigation.module.css", "var(--nav-background)", "semantic product-nav background");
requireText("src/components/marketing-navigation.module.css", "var(--nav-border)", "semantic marketing-nav border");
requireText("src/components/language-switcher.module.css", "var(--control-background)", "semantic language-switcher surface");
requireText("src/components/mobile-map-model.module.css", "var(--surface-elevated)", "semantic mobile map surface");
requireText("src/components/listing-workflow-nav.module.css", "var(--surface-elevated)", "semantic listing workflow surface");
requireText("src/components/owner-portfolio-controls.module.css", "var(--control-background)", "semantic owner controls");

/* Rendered QA must remain in CI. */
requireText("package.json", '"themebrowser": "node scripts/check-theme-browser.mjs"', "theme browser script");
requireText("package.json", '"playwright": "1.63.0"', "pinned Playwright browser dependency");
requireText(".github/workflows/ci.yml", "Rendered theme QA", "rendered theme CI step");
requireText(".github/workflows/ci.yml", "How-it-works dark theme QA", "journey interaction CI step");
requireText(".github/workflows/ci.yml", "playwright install --with-deps chromium", "Chromium install for rendered theme QA");
requireText("scripts/check-theme-browser.mjs", 'preference: "system", colorScheme: "dark", expected: "dark"', "System dark browser scenario");
requireText("scripts/check-theme-browser.mjs", 'preference: "system", colorScheme: "light", expected: "light"', "System light browser scenario");
requireText("scripts/check-theme-browser.mjs", "contrastRatio", "computed contrast checks");
requireText("scripts/check-theme-browser.mjs", "complexBackground", "gradient-aware contrast handling");
requireText("scripts/check-theme-browser.mjs", "closed appearance menu is still visibly rendered", "closed disclosure browser assertion");
requireText("scripts/check-theme-browser.mjs", "computed-theme-snapshots.json", "computed appearance artifact");
requireText("scripts/check-how-theme-browser.mjs", 'const locales = ["en", "bn"]', "journey locale matrix");
requireText("scripts/check-how-theme-browser.mjs", 'preference: "system", colorScheme: "dark"', "journey System-dark scenario");
requireText("scripts/check-how-theme-browser.mjs", '#landing-persona-tab-owner', "owner journey interaction coverage");
requireText("scripts/check-how-theme-browser.mjs", "computed-how-theme-snapshots.json", "journey computed appearance artifact");

if (failures.length) {
  console.error("Theme regression check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Theme regression check passed.");
