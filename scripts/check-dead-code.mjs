import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const publicRoot = path.join(root, "public");
const moduleExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"];
const textExtensions = new Set([...moduleExtensions, ".json", ".md", ".yml", ".yaml", ".html"]);
const publicAssetExtensions = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

const sourceFiles = walk(srcRoot).filter((file) => moduleExtensions.includes(path.extname(file)));
const sourceSet = new Set(sourceFiles.map((file) => path.resolve(file)));

function isNextEntry(file) {
  const rel = relative(file);
  if (rel === "src/proxy.ts" || rel.endsWith(".d.ts")) return true;
  if (!rel.startsWith("src/app/")) return false;
  const base = path.basename(rel);
  return /^(page|layout|route|error|loading|not-found|global-error|template|default)\.(?:ts|tsx|js|jsx)$/.test(base)
    || /^(robots|sitemap|manifest|icon|apple-icon|opengraph-image|twitter-image)\.(?:ts|tsx|js|jsx)$/.test(base);
}

function resolveModule(fromFile, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null;
  const start = specifier.startsWith("@/")
    ? path.join(srcRoot, specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);
  const candidates = [start];
  for (const ext of moduleExtensions) candidates.push(`${start}${ext}`);
  for (const ext of moduleExtensions) candidates.push(path.join(start, `index${ext}`));
  return candidates.map((candidate) => path.resolve(candidate)).find((candidate) => sourceSet.has(candidate)) ?? null;
}

function importsFor(file) {
  const text = fs.readFileSync(file, "utf8");
  const specs = new Set();
  const patterns = [
    /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
    /@import\s+(?:url\()?\s*["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) specs.add(match[1]);
  }
  return [...specs].map((specifier) => resolveModule(file, specifier)).filter(Boolean);
}

const roots = sourceFiles.filter(isNextEntry);
const reachable = new Set();
const queue = [...roots];
while (queue.length) {
  const file = queue.pop();
  if (!file || reachable.has(file)) continue;
  reachable.add(file);
  for (const imported of importsFor(file)) {
    if (!reachable.has(imported)) queue.push(imported);
  }
}

const unreachable = sourceFiles
  .filter((file) => !reachable.has(path.resolve(file)))
  .map(relative)
  .sort();

const repositoryText = walk(root)
  .filter((file) => !relative(file).startsWith(".git/"))
  .filter((file) => textExtensions.has(path.extname(file)))
  .map((file) => {
    try { return fs.readFileSync(file, "utf8"); } catch { return ""; }
  })
  .join("\n");

const publicAssets = walk(publicRoot)
  .filter((file) => publicAssetExtensions.has(path.extname(file).toLowerCase()));
const unusedAssets = publicAssets
  .filter((file) => {
    const publicPath = `/${path.relative(publicRoot, file).split(path.sep).join("/")}`;
    return !repositoryText.includes(publicPath);
  })
  .map(relative)
  .sort();

if (!unreachable.length && !unusedAssets.length) {
  console.log(`Dead-code check passed (${reachable.size} reachable source modules, ${publicAssets.length} public assets checked).`);
  process.exit(0);
}

if (unreachable.length) {
  console.error("Unreachable source files:");
  for (const file of unreachable) console.error(`  - ${file}`);
}
if (unusedAssets.length) {
  console.error("Unreferenced public assets:");
  for (const file of unusedAssets) console.error(`  - ${file}`);
}
console.error("Remove these files or connect them to a real runtime entry point.");
process.exit(1);
