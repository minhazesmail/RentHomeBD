import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const retiredLandingFiles = [
  "src/app/landing-alignment.css",
  "src/app/landing-atmosphere.css",
  "src/app/landing-faq-open-contrast-fix.css",
  "src/app/landing-faq-redesign.css",
  "src/app/landing-footer-redesign.css",
  "src/app/landing-hero-spacing.css",
  "src/app/landing-how-redesign.css",
  "src/app/landing-inventory-redesign.css",
  "src/app/landing-pointed-fixes.css",
  "src/app/landing-redesign.css",
  "src/app/landing-redesign-v2.css",
  "src/app/landing-styles.css",
  "src/app/landing-trust-contrast-fix.css",
];

for (const file of retiredLandingFiles) {
  if (exists(file)) failures.push(`retired landing override returned: ${file}`);
}

for (const file of [
  "src/app/landing.css",
  "src/app/landing-theme.css",
  "src/app/landing-how-theme.css",
  "src/app/homes/map-workspace.css",
]) {
  if (!exists(file)) failures.push(`canonical redesign stylesheet is missing: ${file}`);
}

if (exists("src/app/homes/map-workspace-v2.css")) failures.push("temporary map-workspace-v2.css must not return");
if (exists("src/app/homes/homes-spacing-fixes.css")) failures.push("retired homes-spacing-fixes.css must not return");

const rootManifest = read("src/app/styles.css");
const homesManifest = read("src/app/homes/styles.css");
const packageJson = read("package.json");

if (!rootManifest.includes('@import "./landing.css" layer(component-appearance);')) failures.push("root manifest must load canonical landing.css");
if (rootManifest.includes("landing-redesign-v2.css")) failures.push("root manifest still references temporary landing v2 file");
if (!homesManifest.includes('@import "./map-workspace.css" layer(component-appearance);')) failures.push("homes manifest must load canonical map-workspace.css");
if (homesManifest.includes("map-workspace-v2.css")) failures.push("homes manifest still references temporary map v2 file");
if (homesManifest.includes("homes-spacing-fixes.css")) failures.push("homes manifest still loads retired map-era spacing fixes");
if (!packageJson.includes('"releaseqa": "node scripts/check-redesign-release.mjs"')) failures.push("release QA script is not registered");
if (!packageJson.includes("check-redesign-release.mjs")) failures.push("release QA is not part of the standard UI validation path");

const landingBytes = fs.statSync(path.join(root, "src/app/landing.css")).size;
const mapBytes = fs.statSync(path.join(root, "src/app/homes/map-workspace.css")).size;
if (landingBytes > 14_000) failures.push(`canonical landing CSS exceeded 14 KB source budget (${landingBytes} bytes)`);
if (mapBytes > 24_000) failures.push(`canonical map workspace CSS exceeded 24 KB source budget (${mapBytes} bytes)`);

if (failures.length) {
  console.error("Redesign release QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Redesign release QA passed: legacy landing overrides are retired and canonical CSS stays within source budgets (landing ${landingBytes} B, map ${mapBytes} B).`);
