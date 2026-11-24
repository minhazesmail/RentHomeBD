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
  return fs.readFileSync(fullPath, "utf8").replaceAll("\r\n", "\n");
}

function requireText(source, text, label) {
  if (!source.includes(text)) failures.push(`missing ${label}`);
}

const manifest = read("src/app/homes/styles.css");
const workspaceCss = read("src/app/homes/map-workspace.css");
const packageJson = read("package.json");
const ci = read(".github/workflows/ci.yml");
const browserQa = read("scripts/check-map-workspace-browser.mjs");
const areaSearchBrowserQa = read("scripts/check-map-area-search-browser.mjs");

// Geometry must be validated in the rendered browser, rather than preserving
// historical stylesheet declarations that happen to be overridden.
requireText(workspaceCss, "grid-template-rows: auto minmax(0, 1fr);", "workspace row contract");
requireText(manifest, '@import "./map-workspace.css" layer(component-appearance);', "canonical workspace stylesheet");
if (manifest.includes("map-workspace-layout-fixes.css")) failures.push("retired layout guard is still loaded");

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
requireText(packageJson, '"mapareasearchbrowser": "node scripts/check-map-area-search-browser.mjs"', "map area search browser QA package script");
requireText(ci, "- name: Map area search state QA", "dedicated map area search CI step");
requireText(ci, "run: npm run mapareasearchbrowser", "map area search browser CI command");
requireText(areaSearchBrowserQa, "zoom-only interaction incorrectly exposes Search this area", "zoom no-op regression coverage");
requireText(areaSearchBrowserQa, "successful map-area search URL did not change after panning", "applied URL regression coverage");
requireText(areaSearchBrowserQa, "failed map-area search should remain retryable", "map error recovery regression coverage");
requireText(browserQa, 'name: "reported-desktop", width: 1272, height: 638', "reported desktop viewport coverage");
requireText(browserQa, 'const scenarios = ["light", "dark"]', "light/dark geometry coverage");
requireText(browserQa, "toolbar does not span the inset search content", "toolbar content-span rendered assertion");
requireText(browserQa, 'toolbar.gridRowStart !== "1"', "toolbar rendered grid-row assertion");
requireText(browserQa, 'workspace.gridRowStart !== "2"', "workspace rendered grid-row assertion");
requireText(browserQa, "The toolbar is sticky", "sticky geometry regression rationale");

if (failures.length) {
  console.error("Map workspace layout contract QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Map workspace layout contract QA passed: rendered geometry coverage is wired into CI.");
