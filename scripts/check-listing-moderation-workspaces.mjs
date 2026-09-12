import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
function expect(source, pattern, message) { const matched = typeof pattern === "string" ? source.includes(pattern) : pattern.test(source); if (!matched) failures.push(message); }
function reject(source, pattern, message) { const matched = typeof pattern === "string" ? source.includes(pattern) : pattern.test(source); if (matched) failures.push(message); }

const policy = read("src/lib/listing-tenant-policy.ts");
const readiness = read("src/components/listing-readiness.tsx");
const policyCopy = read("src/i18n/listing-tenant-policy-copy.ts");
const migration = read("supabase/migrations/20260912170000_enforce_listing_tenant_policy_exclusivity.sql");
const sqlQa = read("supabase/tests/f27_listing_tenant_policy.sql");
const moderationCopy = read("src/i18n/moderation-copy.ts");
const moderationNav = read("src/components/moderation-workbench-nav.tsx");
const listingQueue = read("src/app/moderation/page.tsx");
const listingDetail = read("src/app/moderation/[id]/page.tsx");
const listingDecision = read("src/components/moderation-decision-form.tsx");
const reportQueue = read("src/app/moderation/reports/page.tsx");
const reportDetail = read("src/app/moderation/reports/[id]/page.tsx");
const accountQueue = read("src/app/moderation/accounts/page.tsx");
const profileActions = read("src/components/profile-verification-actions.tsx");
const docs = read("docs/listing-moderation-workspaces.md");

expect(policy, 'return !unique.includes("everyone") || unique.length === 1;', "listing tenant policy must make Everyone exclusive");
expect(readiness, "isValidListingTenantPolicy(tenantTypes)", "listing readiness must use the canonical tenant policy invariant");
expect(readiness, "tenantPolicyValid", "listing readiness must expose invalid mixed policy as incomplete");
expect(policyCopy, "Everyone cannot be combined", "English owner copy must explain Everyone exclusivity");
expect(policyCopy, "একসঙ্গে বেছে নেওয়া যাবে না", "Bangla owner copy must explain Everyone exclusivity");
expect(migration, "property_tenant_types_enforce_exclusivity", "database must install a tenant policy exclusivity trigger");
expect(migration, "preferred tenant type policy cannot combine Everyone", "database violation must map to existing friendly renter-policy error handling");
expect(migration, "delete from public.property_tenant_types specific", "migration must normalize historical ambiguous policies");
expect(sqlQa, "multiple specific renter types should remain valid", "database QA must prove multi-specific policy remains valid");
expect(sqlQa, "Everyone must not be combined with specific renter types", "database QA must reject Everyone after specific types");
expect(sqlQa, "specific renter type must not be combined with Everyone", "database QA must reject specific types after Everyone");

expect(moderationCopy, "en: {", "moderation copy must include English");
expect(moderationCopy, "bn: {", "moderation copy must include Bangla");
expect(moderationCopy, "not proof of government identity, legal property ownership", "English moderation trust copy must disclaim legal/identity proof");
expect(moderationCopy, "সরকারি পরিচয়, আইনি সম্পত্তির মালিকানা", "Bangla moderation trust copy must disclaim legal/identity proof");
expect(moderationNav, "getModerationCopy(locale)", "moderation navigation must use localized copy");
expect(moderationNav, "formatNumber(counts[key], locale)", "moderation queue counts must localize numerals");
expect(listingQueue, "formatCurrency(listing.rent_bdt, locale)", "listing moderation queue must localize rent");
expect(listingDetail, "copy.common.phoneVerified", "listing review evidence must explicitly label phone verification");
expect(listingDetail, "copy.common.roleVerified", "listing review evidence must explicitly label role verification");
expect(listingDetail, "copy.common.legalDisclaimer", "listing review must display platform-signal disclaimer");
expect(listingDecision, "getModerationCopy(locale).decision", "listing decision controls must be localized");
expect(reportQueue, "getModerationCopy(locale)", "report queue must be localized");
expect(reportQueue, "formatDate(new Date(report.created_at), locale", "report queue dates must be localized");
expect(reportDetail, "formatCurrency(property.rent_bdt, locale)", "report detail rent must be localized");
expect(accountQueue, ".sort((a, b) =>", "account trust queue must explicitly order actionable accounts");
expect(accountQueue, "aVerified !== bVerified", "accounts without valid role badges must be prioritized");
expect(accountQueue, "copy.common.phoneVerified", "account trust evidence must explicitly label phone verification");
expect(accountQueue, "copy.common.legalDisclaimer", "account review must repeat legal-ownership disclaimer");
expect(profileActions, "getModerationCopy(locale).profileActions", "profile verification actions must be localized");
reject(listingQueue, ">Review queue<", "listing queue must not hard-code its English title");
reject(listingDetail, '>Verified</strong>', "listing review must not use generic Verified evidence label");
reject(accountQueue, '"Phone verified"', "account trust queue must not hard-code English phone evidence");
expect(docs, "one unambiguous meaning", "workspace contract must document tenant policy semantics");
expect(docs, "phone verified", "workspace contract must document precise moderation evidence wording");

if (failures.length) {
  console.error("Task 12/13 listing and moderation QA failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Task 12/13 QA passed: listing tenant policy integrity and localized evidence-precise moderation contracts are intact.");
