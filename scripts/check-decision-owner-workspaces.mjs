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

const savedCard = read("src/components/saved-search-card.tsx");
const savedCopy = read("src/i18n/saved-decision-copy.ts");
const ownerPage = read("src/app/owner/page.tsx");
const ownerControls = read("src/components/owner-portfolio-controls.tsx");
const freshness = read("src/components/listing-freshness-actions.tsx");
const ownerCopy = read("src/i18n/owner-portfolio-copy.ts");
const docs = read("docs/decision-owner-workspaces.md");

expect(savedCard, 'type SearchTenantType = Exclude<TenantType, "everyone">;', "saved search renter identity must exclude everyone");
expect(savedCard, 'const SEARCH_TENANT_TYPES: SearchTenantType[] = ["family", "bachelor", "student", "job_holder"]', "saved search must offer exactly the four renter identities");
expect(savedCard, 'if (!validSearchTenant(tenantType)) return decisionCopy.tenantValidation;', "saved search edit validation must require renter identity");
expect(savedCard, 'const requiresTenantType = !validSearchTenant(search.tenant_type);', "legacy invalid saved searches must be detected");
expect(savedCard, 'requiresTenantType ? (', "legacy invalid saved searches must have a dedicated repair state");
expect(savedCard, 'decisionCopy.editTenant', "legacy invalid saved searches must offer renter-type repair before running");
expect(savedCard, 'min={MIN_RENTER_SEARCH_RADIUS_KM}', "saved search radius lower bound must remain enforced");
expect(savedCard, 'max={MAX_RENTER_SEARCH_RENT_BDT}', "saved search rent upper bound must remain enforced");
expect(savedCard, 'max={MAX_RENTER_SEARCH_BEDROOMS}', "saved search bedroom upper bound must remain enforced");
reject(savedCard, '<option value="everyone"', "Everyone must not appear as a renter identity option");
expect(savedCopy, 'en: {', "saved decision copy must include English");
expect(savedCopy, 'bn: {', "saved decision copy must include Bangla");

expect(ownerPage, 'getOwnerPortfolioCopy(locale)', "owner page must use localized portfolio copy");
expect(ownerPage, 'const RECONFIRM_SOON_DAYS = 3;', "owner attention horizon must remain explicit");
expect(ownerPage, 'function listingNeedsAttention', "owner portfolio must centralize attention logic");
expect(ownerPage, 'property.status !== "available"', "owner attention logic must consider live listings separately");
expect(ownerPage, 'days <= RECONFIRM_SOON_DAYS', "live listings nearing expiry must enter attention state");
expect(ownerPage, 'listings.filter((property) => listingNeedsAttention(property, now))', "attention summary/queue must use the shared attention predicate");
expect(ownerPage, 'status === "attention" ? listingNeedsAttention(listing, now)', "attention filter must use the same shared predicate");
expect(ownerPage, 'formatCurrency(property.rent_bdt, locale)', "owner rent display must be locale-aware");
expect(ownerPage, 'formatDate(new Date(property.updated_at), locale', "owner updated date must be locale-aware");
expect(ownerPage, 'formatNumber(attentionCount, locale)', "owner summary counts must be locale-aware");
expect(ownerControls, 'getOwnerPortfolioCopy(locale).controls', "owner portfolio controls must use localized copy");
expect(ownerControls, 'useLocale()', "owner portfolio controls must react to locale changes");
expect(freshness, 'getOwnerPortfolioCopy(locale).actions', "owner freshness actions must use localized copy");
expect(freshness, 'useLocale()', "owner freshness actions must react to locale changes");
expect(ownerCopy, 'en: {', "owner portfolio copy must include English");
expect(ownerCopy, 'bn: {', "owner portfolio copy must include Bangla");
reject(ownerPage, '>Manage your properties<', "owner page must not hard-code English heading copy");
reject(ownerControls, 'label: "Needs action"', "owner filters must not hard-code English labels");
reject(freshness, '"Could not reconfirm this listing. Please try again."', "freshness errors must not be hard-coded English");
expect(docs, "`Everyone` remains a listing-policy value", "workspace contract must document renter identity vs listing policy");
expect(docs, "available` listings whose confirmation expires within 3 days", "workspace contract must document proactive owner freshness attention");

if (failures.length) {
  console.error("Task 8/9 workspace QA failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Task 8/9 workspace QA passed: saved-search tenant enforcement and localized owner action-queue contracts are intact.");
