import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const appDir = path.resolve("src/app");

function cssFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return cssFiles(file);
    return entry.isFile() && entry.name.endsWith(".css") ? [file] : [];
  });
}

const owners = new Map();

for (const file of cssFiles(appDir)) {
  const relativeFile = path.relative(appDir, file).replaceAll("\\", "/");
  const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });

  root.walkRules((rule) => {
    for (const selector of rule.selectors) {
      const classes = [...selector.matchAll(/\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g)];
      if (!classes.length) continue;

      // The rightmost class is the component/state being styled. Ancestor
      // classes only scope that definition to a page or component variant.
      const className = `.${classes.at(-1)[1]}`;
      if (!owners.has(className)) owners.set(className, new Set());
      owners.get(className).add(relativeFile);
    }
  });
}

const collisions = [...owners]
  .filter(([, files]) => files.size > 1)
  .sort(([left], [right]) => left.localeCompare(right));

if (collisions.length) {
  console.error("CSS class ownership collisions found:\n");
  for (const [className, files] of collisions) {
    console.error(`  ${className}: ${[...files].sort().join(", ")}`);
  }
  console.error("\nMove every rule targeting a class into one canonical stylesheet.");
  process.exit(1);
}

console.log(`CSS ownership check passed (${owners.size} classes across ${cssFiles(appDir).length} files).`);
