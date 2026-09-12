import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

for (const file of [
  "src/app/landing-redesign-v2.css",
  "src/app/landing-styles.css",
  "src/app/homes/map-workspace-v2.css",
  "src/app/homes/homes-spacing-fixes.css",
]) {
  if (exists(file)) failures.push(`retired temporary stylesheet returned: ${file}`);
}

for (const file of [
  "src/app/landing.css",
  "src/app/landing-foundation.css",
  "src/app/landing-foundation-base.css",
  "src/app/landing-theme.css",
  "src/app/landing-how-theme.css",
  "src/app/homes/map-workspace.css",
]) {
  if (!exists(file)) failures.push(`canonical redesign stylesheet is missing: ${file}`);
}

const rootManifest = read("src/app/styles.css");
const landingFoundation = read("src/app/landing-foundation.css");
const landingAtmosphere = read("src/components/landing-scroll-atmosphere.tsx");
const homesManifest = read("src/app/homes/styles.css");
const packageJson = JSON.parse(read("package.json"));

if (!rootManifest.includes('@import "./landing.css" layer(component-appearance);')) failures.push("root manifest must load canonical final landing.css");
if (!landingAtmosphere.includes('import "@/app/landing-foundation.css";')) failures.push("landing atmosphere must load the canonical foundation manifest");
if (!landingFoundation.includes('@import "./landing-foundation-base.css" layer(route-base);')) failures.push("landing foundation must preserve the route-base layer");
if (!landingFoundation.includes('@import "./landing-faq-redesign.css" layer(route-atmosphere);')) failures.push("landing foundation must preserve the final historical atmosphere layer");
if (!homesManifest.includes('@import "./map-workspace.css" layer(component-appearance);')) failures.push("homes manifest must load canonical map-workspace.css");
if (homesManifest.includes("map-workspace-v2.css")) failures.push("homes manifest still references temporary map v2 file");
if (homesManifest.includes("homes-spacing-fixes.css")) failures.push("homes manifest still loads retired map-era spacing fixes");
if (packageJson.scripts?.releaseqa !== "node scripts/check-redesign-release.mjs") failures.push("release QA script is not registered");
if (!packageJson.scripts?.uiqa?.includes("node scripts/check-redesign-release.mjs")) failures.push("release QA is not part of the standard UI validation path");

const landingBytes = fs.statSync(path.join(root, "src/app/landing.css")).size;
const mapBytes = fs.statSync(path.join(root, "src/app/homes/map-workspace.css")).size;
if (landingBytes > 14_000) failures.push(`final landing appearance CSS exceeded 14 KB source budget (${landingBytes} bytes)`);
if (mapBytes > 24_000) failures.push(`canonical map workspace CSS exceeded 24 KB source budget (${mapBytes} bytes)`);

if (failures.length) {
  console.error("Redesign release QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Redesign release QA passed: canonical entrypoints are wired, temporary v2 files are retired, and final appearance budgets hold (landing ${landingBytes} B, map ${mapBytes} B).`);
