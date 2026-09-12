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

const manifest = read("src/app/homes/styles.css");
const baseCss = read("src/app/homes/homes.css");
const workspaceCss = read("src/app/homes/map-workspace.css");
const fixesCss = read("src/app/homes/map-workspace-layout-fixes.css");
const packageJson = read("package.json");
const ci = read(".github/workflows/ci.yml");
const browserQa = read("scripts/check-map-workspace-browser.mjs");

// This guard exists because the route-base stylesheet still contains the old
// side-by-side search shell. The redesigned workspace must explicitly collapse
// that inherited column before laying out toolbar -> results/map vertically.
requirePattern(
  baseCss,
  /\.renter-search-shell\s*\{[^}]*grid-template-columns:\s*minmax\([^;]+\)\s+1fr/s,
  "legacy route-base two-column search shell fixture",
);
requireText(
  workspaceCss,
  "grid-template-rows: auto minmax(0, 1fr);",
  "redesigned workspace vertical row contract",
);
requireText(
  fixesCss,
  "grid-template-columns: minmax(0, 1fr);",
  "desktop shell column reset",
);
requireText(fixesCss, "grid-column: 1 / -1;", "toolbar/workspace full-span guard");
requireText(fixesCss, "grid-auto-flow: row;", "desktop row flow guard");
requirePattern(
  fixesCss,
  /\.nb-global-shell--renter \.renter-search-toolbar\s*\{[^}]*grid-row:\s*1;/s,
  "toolbar explicit desktop grid row",
);
requirePattern(
  fixesCss,
  /\.nb-global-shell--renter \.renter-workspace\s*\{[^}]*grid-row:\s*2;/s,
  "workspace explicit desktop grid row",
);

// The toolbar currently carries the historic renter-filter-panel class for
// shared form styling. These geometry resets must remain explicit so the old
// rounded-card margin/border does not reappear on desktop.
requirePattern(
  baseCss,
  /\.renter-filter-panel\s*\{[^}]*margin-top:\s*\d+px;[^}]*border-radius:/s,
  "legacy filter-card geometry fixture",
);
requirePattern(
  fixesCss,
  /\.nb-global-shell--renter \.renter-search-toolbar\s*\{[^}]*margin:\s*0;[^}]*border:\s*0;[^}]*border-bottom:[^;]+;[^}]*border-radius:\s*0;/s,
  "toolbar legacy-card geometry reset",
);

// The guard belongs to route-fixes: later than the legacy route-base declarations
// it neutralizes, but earlier than the canonical component-appearance stylesheet.
// This avoids duplicate component ownership while preserving the intended cascade.
requireText(
  manifest,
  '@import "./property-detail-spacing-fixes.css" layer(route-fixes);\n@import "./map-workspace-layout-fixes.css" layer(route-fixes);',
  "map workspace residual guard route-fixes ownership",
);
requireText(
  manifest,
  '@import "./map-workspace.css" layer(component-appearance);',
  "canonical map workspace component-appearance ownership",
);

// Keep a rendered geometry check in CI. Static selector checks alone cannot catch
// this regression because all individual declarations can exist while the final
// computed grid still places the toolbar and workspace side-by-side.
requireText(
  packageJson,
  '"mapworkspacebrowser": "node scripts/check-map-workspace-browser.mjs"',
  "map workspace browser QA package script",
);
requireText(ci, "- name: Map workspace geometry QA", "dedicated rendered map workspace CI step");
requireText(ci, "run: npm run mapworkspacebrowser", "rendered map workspace CI command");
requireText(browserQa, 'name: "reported-desktop", width: 1272, height: 638', "reported desktop viewport coverage");
requireText(browserQa, 'const scenarios = ["light", "dark"]', "light/dark geometry coverage");
requireText(browserQa, "toolbar does not span the full renter search shell", "toolbar full-span rendered assertion");
requireText(browserQa, 'toolbar.gridRowStart !== "1"', "toolbar rendered grid-row assertion");
requireText(browserQa, 'workspace.gridRowStart !== "2"', "workspace rendered grid-row assertion");
requireText(browserQa, "The toolbar is sticky", "sticky geometry regression rationale");

if (failures.length) {
  console.error("Map workspace layout contract QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Map workspace layout contract QA passed: legacy grid/card geometry is neutralized and rendered coverage is wired into CI.");
