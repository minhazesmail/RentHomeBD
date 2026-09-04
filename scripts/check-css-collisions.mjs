import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const appDir = path.resolve("src/app");
const requiredLayerOrder = [
  "tokens",
  "globals",
  "primitives",
  "foundation",
  "shells",
  "brand",
  "route-base",
  "route-polish",
  "route-redesign",
  "route-detail",
  "motion",
  "responsive",
  "accessibility",
  "performance",
  "cleanup",
];
const allowedLayers = new Set(requiredLayerOrder);

function cssFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return cssFiles(file);
    return entry.isFile() && entry.name.endsWith(".css") ? [file] : [];
  });
}

function isCssModule(file) {
  return file.endsWith(".module.css");
}

function scopeForFile(relativeFile) {
  const parts = relativeFile.split("/");
  if (parts.length > 1) return parts[0];
  if (relativeFile.startsWith("landing")) return "landing";
  if (relativeFile.startsWith("auth")) return "auth";
  if (relativeFile.startsWith("information")) return "information";
  return "global";
}

function importedLayer(params) {
  const match = params.match(/^(?:url\()?\s*["']([^"']+\.css)["']\s*\)?\s+layer\(([-_a-zA-Z0-9.]+)\)/);
  return match ? { importPath: match[1], layer: match[2] } : null;
}

const files = cssFiles(appDir);
const parsed = new Map();
const layerByFile = new Map();
const errors = [];

for (const file of files) {
  if (isCssModule(file)) continue;
  const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  parsed.set(file, root);

  root.walkAtRules("import", (rule) => {
    const layeredImport = importedLayer(rule.params);
    if (!layeredImport) return;
    if (!allowedLayers.has(layeredImport.layer)) {
      errors.push(`Unknown CSS layer ${layeredImport.layer} in ${path.relative(appDir, file)}`);
      return;
    }

    const importedFile = path.resolve(path.dirname(file), layeredImport.importPath);
    if (!importedFile.startsWith(appDir) || !fs.existsSync(importedFile)) return;
    const previous = layerByFile.get(importedFile);
    if (previous && previous !== layeredImport.layer) {
      errors.push(`${path.relative(appDir, importedFile)} is imported into both ${previous} and ${layeredImport.layer}`);
      return;
    }
    layerByFile.set(importedFile, layeredImport.layer);
  });
}

const rootManifest = fs.readFileSync(path.join(appDir, "styles.css"), "utf8");
const expectedLayerStatement = `@layer ${requiredLayerOrder.join(", ")};`;
if (!rootManifest.includes(expectedLayerStatement)) {
  errors.push("src/app/styles.css does not declare the required cascade layer order");
}

const owners = new Map();
let classCount = 0;

for (const [file, root] of parsed) {
  let hasSelectors = false;
  root.walkRules((rule) => {
    hasSelectors = true;
    const layer = layerByFile.get(file);
    if (!layer) return;

    const relativeFile = path.relative(appDir, file).replaceAll("\\", "/");
    const scope = scopeForFile(relativeFile);
    for (const selector of rule.selectors) {
      const classes = [...selector.matchAll(/\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g)];
      if (!classes.length) continue;

      const className = `.${classes.at(-1)[1]}`;
      const ownershipKey = `${scope}\u0000${layer}\u0000${className}`;
      if (!owners.has(ownershipKey)) owners.set(ownershipKey, new Set());
      owners.get(ownershipKey).add(relativeFile);
      classCount += 1;
    }
  });

  if (hasSelectors && !layerByFile.has(file)) {
    errors.push(`Unlayered global stylesheet: ${path.relative(appDir, file).replaceAll("\\", "/")}`);
  }
}

const collisions = [...owners]
  .filter(([, ownerFiles]) => ownerFiles.size > 1)
  .map(([key, ownerFiles]) => {
    const [scope, layer, className] = key.split("\u0000");
    return { scope, layer, className, ownerFiles: [...ownerFiles].sort() };
  })
  .sort((left, right) => left.className.localeCompare(right.className));

if (collisions.length) {
  errors.push("CSS class ownership collisions found inside the same architectural layer:");
  for (const collision of collisions) {
    errors.push(`  ${collision.className} [${collision.scope}/${collision.layer}]: ${collision.ownerFiles.join(", ")}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`CSS layer ownership check passed (${classCount} class selectors across ${files.length} stylesheets).`);
