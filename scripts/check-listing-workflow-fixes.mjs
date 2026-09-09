import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const formPath = path.join(root, "src", "components", "property-listing-form.tsx");
const formSource = fs.readFileSync(formPath, "utf8");

if (formSource.includes("stageExistingMediaOrder")) {
  throw new Error(`${formPath} must not stage existing media outside the database sort_order range.`);
}

if (/sort_order\s*:\s*(?:100|100\s*\+)/.test(formSource)) {
  throw new Error(`${formPath} contains an out-of-range property_media sort_order write.`);
}

const boundedOrderWrites = formSource.match(/sort_order\s*:\s*index/g) ?? [];
if (boundedOrderWrites.length < 2) {
  throw new Error(`${formPath} must keep new and existing property media writes on the bounded 0..9 index.`);
}

const migrationPath = path.join(
  root,
  "supabase",
  "migrations",
  "20260909203500_refresh_public_owner_snapshots.sql",
);
const migrationSource = fs.readFileSync(migrationPath, "utf8");

const snapshotColumns = [
  "public_owner_display_name",
  "public_owner_role",
  "public_owner_phone_verified_at",
  "public_owner_role_verified_at",
  "public_owner_role_verified_role",
];

for (const column of snapshotColumns) {
  if (!migrationSource.includes(column)) {
    throw new Error(`${migrationPath} must refresh ${column} at publication/reconfirmation.`);
  }
}

const requiredContracts = [
  "security definer",
  "set search_path = ''",
  "new.status = 'available'::public.listing_status",
  "new.last_confirmed_at is distinct from old.last_confirmed_at",
  "properties_refresh_public_owner_snapshot",
  "revoke all on function private.refresh_property_owner_snapshot() from public",
  "'pending_confirmation'::public.listing_status",
];

for (const contract of requiredContracts) {
  if (!migrationSource.toLowerCase().includes(contract.toLowerCase())) {
    throw new Error(`${migrationPath} is missing required owner snapshot contract: ${contract}`);
  }
}

console.log(
  `Listing workflow QA passed: media ordering stays bounded and ${snapshotColumns.length} public owner snapshot fields refresh on availability transitions.`,
);
