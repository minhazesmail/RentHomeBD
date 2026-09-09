import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const configPath = path.join(root, "src", "lib", "supabase", "config.ts");
const source = fs.readFileSync(configPath, "utf8");

const requiredPublicVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

for (const variable of requiredPublicVariables) {
  const staticReference = `process.env.${variable}`;
  if (!source.includes(staticReference)) {
    throw new Error(
      `${configPath} must statically reference ${staticReference} so Next.js can inline it into browser bundles.`,
    );
  }
}

if (/process\.env\s*\[/.test(source)) {
  throw new Error(
    `${configPath} contains a computed process.env lookup. Browser-visible Next.js variables must use static property access.`,
  );
}

console.log(
  `Supabase browser env QA passed: ${requiredPublicVariables.length} public variables use static process.env references.`,
);
