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
  throw new Error(`${formPath} must keep existing and newly uploaded media on bounded 0..9 positions.`);
}

const retiredSequentialSaveHelpers = [
  "async function syncRelations",
  "async function removeDeletedMedia",
  "async function uploadNewMedia",
  "async function finalizeExistingMediaOrder",
];
for (const helper of retiredSequentialSaveHelpers) {
  if (formSource.includes(helper)) {
    throw new Error(`${formPath} still contains the partial-commit save helper: ${helper}`);
  }
}

const retrySafeFormContracts = [
  "stableMediaId",
  "draftId",
  'rpc("ensure_property_draft"',
  'rpc("save_property_draft"',
  'rpc("submit_property_for_review"',
  "prepareMediaForAtomicSave",
  "cleanupRemovedStorage",
  'rpc("begin_property_edit"',
];
for (const contract of retrySafeFormContracts) {
  if (!formSource.includes(contract)) {
    throw new Error(`${formPath} is missing retry-safe listing contract: ${contract}`);
  }
}

const snapshotMigrationPath = path.join(
  root,
  "supabase",
  "migrations",
  "20260909203500_refresh_public_owner_snapshots.sql",
);
const snapshotMigrationSource = fs.readFileSync(snapshotMigrationPath, "utf8");

const snapshotColumns = [
  "public_owner_display_name",
  "public_owner_role",
  "public_owner_phone_verified_at",
  "public_owner_role_verified_at",
  "public_owner_role_verified_role",
];

for (const column of snapshotColumns) {
  if (!snapshotMigrationSource.includes(column)) {
    throw new Error(`${snapshotMigrationPath} must refresh ${column} at publication/reconfirmation.`);
  }
}

const snapshotContracts = [
  "security definer",
  "set search_path = ''",
  "new.status = 'available'::public.listing_status",
  "new.last_confirmed_at is distinct from old.last_confirmed_at",
  "properties_refresh_public_owner_snapshot",
  "revoke all on function private.refresh_property_owner_snapshot() from public",
  "'pending_confirmation'::public.listing_status",
];

for (const contract of snapshotContracts) {
  if (!snapshotMigrationSource.toLowerCase().includes(contract.toLowerCase())) {
    throw new Error(`${snapshotMigrationPath} is missing required owner snapshot contract: ${contract}`);
  }
}

const atomicMigrationPath = path.join(
  root,
  "supabase",
  "migrations",
  "20260911023000_atomic_listing_save_and_relist.sql",
);
const atomicMigrationSource = fs.readFileSync(atomicMigrationPath, "utf8");
const atomicContracts = [
  "public.ensure_property_draft",
  "public.save_property_draft",
  "public.submit_property_for_review",
  "public.begin_property_edit",
  "security definer",
  "for update",
  "jsonb_to_recordset(media_items)",
  "Existing media identity cannot be rebound",
  "'rented'::public.listing_status",
  "'expired'::public.listing_status",
  "new.published_at := null",
  "new.last_confirmed_at := null",
  "new.expires_at := null",
  "grant execute on function public.begin_property_edit(uuid) to authenticated",
];
for (const contract of atomicContracts) {
  if (!atomicMigrationSource.toLowerCase().includes(contract.toLowerCase())) {
    throw new Error(`${atomicMigrationPath} is missing F06/F07 database contract: ${contract}`);
  }
}

const newPagePath = path.join(root, "src", "app", "owner", "properties", "new", "page.tsx");
const newPageSource = fs.readFileSync(newPagePath, "utf8");
for (const contract of ["randomUUID()", "?draft=", "existingDraft", "propertyId={draftId}", "draftId={draftId}"]) {
  if (!newPageSource.includes(contract)) {
    throw new Error(`${newPagePath} is missing stable new-draft identity contract: ${contract}`);
  }
}

const actionsPath = path.join(root, "src", "components", "listing-freshness-actions.tsx");
const actionsSource = fs.readFileSync(actionsPath, "utf8");
for (const contract of ['"begin_property_edit"', '"Relist as draft"', '"Edit & re-review"']) {
  if (!actionsSource.includes(contract)) {
    throw new Error(`${actionsPath} is missing owner edit/relist action: ${contract}`);
  }
}

console.log(
  `Listing workflow QA passed: bounded media ordering, ${snapshotColumns.length} owner snapshot fields, retry-safe atomic saves, and edit/relist lifecycle contracts are present.`,
);