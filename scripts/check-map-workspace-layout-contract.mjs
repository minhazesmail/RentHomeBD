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

// The guard must load after the canonical workspace stylesheet in the same
// component-appearance layer so it can neutralize declarations inherited from
// route-base without escalating specificity or using !important.
requireText(
  manifest,
  '@import "./map-workspace.css" layer(component-appearance);\n@import "./map-workspace-layout-fixes.css" layer(component-appearance);',
  "map workspace layout guard import order",
);

if (failures.length) {
  console.error("Map workspace layout contract QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Map workspace layout contract QA passed: legacy grid/card geometry is neutralized.");
