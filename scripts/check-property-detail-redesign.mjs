import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function expect(source, pattern, message) {
  const matched = typeof pattern === "string" ? source.includes(pattern) : pattern.test(source);
  if (!matched) failures.push(message);
}

function reject(source, pattern, message) {
  const matched = typeof pattern === "string" ? source.includes(pattern) : pattern.test(source);
  if (matched) failures.push(message);
}

const page = read("src/app/homes/[id]/page.tsx");
const copy = read("src/i18n/property-detail-copy.ts");
const gallery = read("src/components/property-media-gallery.tsx");
const locationActions = read("src/components/property-location-actions.tsx");
const share = read("src/components/property-share-button.tsx");
const conversation = read("src/components/start-conversation-button.tsx");
const phoneReveal = read("src/components/phone-reveal-button.tsx");
const report = read("src/components/report-listing-button.tsx");
const docs = read("docs/property-detail-experience.md");

expect(page, 'getPropertyDetailCopy(locale)', "property detail must use the shared localized copy source");
expect(page, 'getDictionary(locale)', "property detail must use localized tenant labels");
expect(page, 'tenantFromReturnPath(returnTo)', "property detail must recover search tenant type from the validated return path");
expect(page, 'const activeTenantType = searchTenantType ?? profileMatchTenant;', "search-specific tenant type must take precedence over the saved profile preference");
expect(page, 'tenantCompatibility(renterTypes, activeTenantType)', "property detail must use canonical tenant compatibility semantics");
expect(page, 'const showCompatibilityReturn = Boolean(searchTenantType && renterFit !== "match")', "stale or unknown search-specific compatibility must offer a return to compatible homes");
expect(page, 'returnTo !== "/homes" ? `?returnTo=${encodeURIComponent(returnTo)}`', "detail auth links must preserve validated map return state");
expect(page, '`${detailPath}#contact`', "contact sign-in must restore the contact anchor");
expect(page, '`${detailPath}#trust`', "report sign-in must restore the trust anchor");
expect(page, 'is-${renterFit}', "renter fit state must remain explicit in the detail composition");
expect(page, 'copy.renter.backToCompatibleHomes', "mismatch/unknown search context must expose a compatible-results route");
reject(page, "TENANT_PROFILE_LABELS", "property detail must not fall back to English-only tenant labels");
reject(page, '>Back to map<', "property detail navigation must not hard-code English copy");
reject(page, '>Trust & safety<', "property detail trust heading must not hard-code English copy");

expect(copy, 'en: {', "property detail copy must include English");
expect(copy, 'bn: {', "property detail copy must include Bangla");
expect(copy, 'do not prove legal ownership', "English trust copy must distinguish platform signals from legal ownership");
expect(copy, 'আইনি মালিকানা প্রমাণ', "Bangla trust copy must distinguish platform signals from legal ownership");
expect(copy, 'searchMatch:', "copy must explain search-specific tenant matches");
expect(copy, 'searchMismatch:', "copy must explain search-specific tenant mismatches");
expect(copy, 'searchUnknown:', "copy must explain missing tenant-policy information without treating it as a match");

for (const [name, source] of [
  ["gallery", gallery],
  ["share", share],
  ["conversation", conversation],
  ["phone reveal", phoneReveal],
  ["report", report],
]) {
  expect(source, "getPropertyDetailCopy(locale)", `${name} must use property-detail localized copy`);
  expect(source, "useLocale()", `${name} must react to the active locale`);
}

expect(locationActions, "getPropertyDetailCopy(locale)", "property map actions must use localized copy");
expect(locationActions, "locale: Locale", "property map actions must receive the server-resolved locale");
expect(gallery, "formatNumber", "property media counts must localize digits");
expect(report, "signInHref", "report sign-in flow must accept a state-preserving detail destination");
expect(phoneReveal, "viewerPhoneVerified", "phone reveal must retain viewer verification gating");
expect(phoneReveal, "ownerPhoneVerified", "phone reveal must retain owner verification gating");
expect(conversation, 'conversation start limit reached', "conversation action must retain abuse-limit friendly handling");
expect(docs, "Search-specific renter type", "property detail contract must document search-specific tenant precedence");
expect(docs, "Missing listing tenant policy remains `neutral`/unknown", "property detail contract must document missing-policy neutrality");

if (failures.length) {
  console.error("Property detail redesign QA failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Property detail redesign QA passed: localization, search-tenant continuity, trust wording and contact-state contracts are intact.");
