import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const configPath = path.join(root, "src", "lib", "supabase", "config.ts");
const source = fs.readFileSync(configPath, "utf8");
const landingInventoryPath = path.join(root, "src", "lib", "landing-inventory.ts");
const landingInventorySource = fs.readFileSync(landingInventoryPath, "utf8");

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

if (!landingInventorySource.includes('.rpc("get_public_landing_inventory"')) {
  throw new Error(
    `${landingInventoryPath} must load public landing coordinates through get_public_landing_inventory.`,
  );
}

if (
  landingInventorySource.includes(
    '.select("id, title, address_text, property_type, rent_bdt, bedrooms, bathrooms, furnishing, available_from, latitude, longitude, published_at")',
  )
) {
  throw new Error(
    `${landingInventoryPath} must not select public latitude/longitude directly from properties.`,
  );
}

console.log(
  `Supabase public access QA passed: ${requiredPublicVariables.length} browser variables use static process.env references and landing inventory uses the public RPC.`,
);
