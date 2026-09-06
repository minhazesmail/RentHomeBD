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
]) {
  read(file);
}

requireText("src/theme/config.ts", '["system", "light", "dark"]', "system/light/dark preference contract");
requireText("src/theme/config.ts", 'THEME_COOKIE_NAME = "nb_theme"', "theme cookie name");
requireText("src/theme/get-theme.ts", "await cookies()", "server cookie resolution");
requireText("src/app/layout.tsx", "getThemePreference()", "server theme preference read");
requireText("src/app/layout.tsx", "data-theme={themePreference}", "SSR preference attribute");
requireText("src/app/layout.tsx", "data-resolved-theme={initialResolvedTheme}", "SSR resolved-theme attribute");
requireText("src/app/layout.tsx", "<ThemeProvider initialPreference={themePreference}>", "theme provider");

requireText("src/theme/theme-provider.tsx", 'matchMedia("(prefers-color-scheme: dark)")', "live system preference listener");
requireText("src/theme/theme-provider.tsx", "document.documentElement.dataset.theme = nextPreference", "instant preference update");
requireText("src/theme/theme-provider.tsx", "document.documentElement.dataset.resolvedTheme = theme", "resolved visual mode update");
requireText("src/theme/theme-provider.tsx", "SameSite=Lax", "theme cookie safety attributes");
forbidText("src/theme/theme-provider.tsx", "router.refresh()", "theme changes must not force route refreshes");

requireText("src/components/theme-switcher.tsx", 'role="menuitemradio"', "radio semantics for appearance options");
requireText("src/components/theme-switcher.tsx", "aria-checked={active}", "selected appearance semantics");
requireText("src/components/theme-switcher.tsx", 'event.key === "Escape"', "Escape dismissal");
requireText("src/components/marketing-navigation.tsx", "<ThemeSwitcher compact />", "marketing appearance control");
requireText("src/components/product-navigation.tsx", "<ThemeSwitcher compact />", "product appearance control");
requireText("src/app/login/page.tsx", "<ThemeSwitcher compact />", "login appearance control");
requireText("src/app/account/phone/page.tsx", "<ThemeSwitcher compact />", "phone verification appearance control");

requireText("src/app/styles.css", "theme-tokens.css", "semantic theme-token import");
requireText("src/app/styles.css", "theme.css", "final dark theme layer import");
requireText("src/app/styles.css", "route-atmosphere, theme;", "theme as final cascade layer");
forbidText("src/app/styles.css", "theme-compat.css", "unscoped legacy theme compatibility must not load globally");
forbidText("src/app/styles.css", "theme-module-overrides.css", "unscoped CSS-module repaint overrides must not load globally");

requireText("src/app/theme-tokens.css", 'html[data-resolved-theme="dark"]', "resolved dark palette");
requireText("src/app/theme-tokens.css", 'html[data-theme="system"]', "system palette fallback");
requireText("src/app/theme-tokens.css", "color-scheme: light dark", "native system color scheme");
requireText("src/app/theme-tokens.css", "--map-area-stroke", "theme-aware map vector color");

const themeTokens = read("src/app/theme-tokens.css");
const rootTokenBlock = themeTokens.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
for (const token of ["--background:", "--foreground:", "--ink:", "--surface:", "--surface-solid:", "--border:", "--accent:"]) {
  if (rootTokenBlock.includes(token)) {
    failures.push(`src/app/theme-tokens.css: light-mode core token ${token} must remain owned by tokens.css`);
  }
}

requireText("src/app/theme.css", 'html[data-resolved-theme="dark"]', "dark-only visual scope");
requireText("src/app/theme.css", ".leaflet-popup-content-wrapper", "Leaflet popup theming");
requireText("src/app/theme.css", "raster OSM tiles remain untouched", "explicit basemap strategy");
forbidText("src/app/theme.css", "\nbody {", "unscoped body theme rule is forbidden");
forbidText("src/app/theme.css", "\nhtml {", "unscoped html theme rule is forbidden");

requireText("src/components/brand-logo.tsx", '"brand-logo"', "stable brand-logo theme hook");
requireText("src/app/theme.css", 'content: url("/nearbasha-logo-on-dark.svg")', "dark logo asset swap");
requireText("src/components/product-navigation.module.css", "var(--nav-background)", "semantic product-nav background");
requireText("src/components/marketing-navigation.module.css", "var(--nav-border)", "semantic marketing-nav border");
requireText("src/components/language-switcher.module.css", "var(--control-background)", "semantic language-switcher surface");
requireText("src/components/mobile-map-model.module.css", "var(--surface-elevated)", "semantic mobile map surface");
requireText("src/components/listing-workflow-nav.module.css", "var(--surface-elevated)", "semantic listing workflow surface");
requireText("src/components/owner-portfolio-controls.module.css", "var(--control-background)", "semantic owner controls");

if (failures.length) {
  console.error("Theme regression check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Theme regression check passed.");
