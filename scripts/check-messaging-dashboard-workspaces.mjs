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

const messageNav = read("src/lib/message-navigation.ts");
const inboxPage = read("src/app/messages/page.tsx");
const inboxPane = read("src/components/messages-inbox-pane.tsx");
const threadPage = read("src/app/messages/[id]/page.tsx");
const dashboard = read("src/app/dashboard/page.tsx");
const dashboardCopy = read("src/i18n/dashboard-copy.ts");
const preference = read("src/components/renter-preference-form.tsx");
const freshness = read("src/lib/listing-freshness.ts");
const ownerPage = read("src/app/owner/page.tsx");
const docs = read("docs/messaging-dashboard-workspaces.md");

// Task 10: inbox/thread continuity and precise trust wording.
expect(messageNav, 'if (page > 1) params.set("page", String(page));', "message navigation must preserve inbox pagination");
expect(messageNav, 'params.set("q", normalizedQuery)', "message navigation must preserve inbox search");
expect(messageNav, 'params.set("filter", "unread")', "message navigation must preserve unread filtering");
expect(inboxPane, 'messageConversationHref({ id: conversation.id, page, query, unreadOnly })', "conversation links must carry page/search/filter context into the thread");
expect(threadPage, 'page?: string | string[]', "thread route must accept inbox page context");
expect(threadPage, 'const inboxHref = messageInboxHref({ page, query, unreadOnly });', "thread back navigation must restore inbox context");
expect(threadPage, 'page={page}', "open thread must keep the same inbox page in the side pane");
expect(inboxPage, 'const renderedAtMs = serverNowMs();', "inbox route must take one server request clock value");
expect(inboxPage, 'renderedAtMs={renderedAtMs}', "inbox relative timestamps must receive the request clock");
expect(threadPage, 'const nowMs = serverNowMs();', "thread route must take one server request clock value");
expect(threadPage, 'propertyAvailability(propertySummary?.available_from, locale, copy, nowMs)', "property availability must use the same request clock");
expect(threadPage, 'renderedAtMs={nowMs}', "thread inbox timestamps must use the same request clock as property availability");
expect(threadPage, '>{copy.phoneVerified}</span>', "message participant trust badge must say phone verified explicitly");
reject(threadPage, '>{copy.verified}</span>', "message participant must not be presented as generically verified from phone evidence alone");

// Task 11: dashboard localization, tenant default semantics, and owner freshness parity.
expect(dashboardCopy, 'en: {', "dashboard copy must include English");
expect(dashboardCopy, 'bn: {', "dashboard copy must include Bangla");
expect(dashboard, 'getDashboardCopy(locale)', "dashboard must use localized copy");
expect(dashboard, 'getDictionary(locale)', "dashboard tenant labels must use the localized dictionary");
expect(dashboard, 'formatNumber(', "dashboard counts must be locale-aware");
expect(dashboard, '.select("status, expires_at")', "dashboard owner summaries must load expiry state for proactive freshness attention");
expect(dashboard, 'ownerProperties.filter((row) => listingNeedsAttention(row, nowMs)).length', "dashboard owner attention count must use the shared freshness predicate");
expect(dashboard, 'const nowMs = serverNowMs();', "dashboard must consume one server-only request clock value");
reject(dashboard, 'Date.now()', "dashboard Server Component must not invoke an impure clock during render");
expect(dashboard, 'normalizedPreference !== "everyone"', "dashboard profile default must distinguish renter identity from Everyone listing policy");
reject(dashboard, '>Optional<', "dashboard must not describe renter type as an optional ranking-only field");
reject(dashboard, 'Used for ranking.', "dashboard must not reduce mandatory search tenant context to ranking only");

expect(preference, 'type SearchTenantType = Exclude<TenantType, "everyone">;', "profile renter default must exclude Everyone");
expect(preference, 'const tenantValues: SearchTenantType[] = ["family", "bachelor", "student", "job_holder"]', "profile renter default must offer exactly four renter identities");
expect(preference, '<option value="" disabled>{copy.choose}</option>', "unset legacy profile state must be a prompt, not a saved No preference option");
expect(preference, 'if (!validSearchTenant(preference))', "profile renter default must validate identity before save");
expect(preference, 'preferred_tenant_type: preference', "profile renter default save must persist a validated renter identity");
expect(preference, 'getDashboardCopy(locale).preference', "profile renter default controls must be localized");
expect(preference, 'dictionary.common.tenant.family', "profile renter labels must be localized");
reject(preference, '"No preference"', "profile renter default must not offer a No preference save option");
reject(preference, 'preferred_tenant_type: preference || null', "profile renter default must not clear tenant identity through an empty save");

expect(freshness, 'export const RECONFIRM_SOON_DAYS = 3;', "shared owner attention horizon must remain three days");
expect(freshness, 'listing.status === "pending_confirmation" || listing.status === "rejected"', "shared owner attention must include confirmation and moderation actions");
expect(freshness, 'listing.status !== "available"', "shared owner attention must treat live listings separately");
expect(freshness, 'days <= RECONFIRM_SOON_DAYS', "shared owner attention must include live listings nearing expiry");
expect(ownerPage, 'from "@/lib/listing-freshness"', "owner workspace must consume the shared freshness contract");
expect(ownerPage, 'listings.filter((property) => listingNeedsAttention(property, now))', "owner queue must continue using the shared freshness predicate");

expect(docs, "page, search query, and unread filter", "workspace contract must document message navigation continuity");
expect(docs, "phone verified", "workspace contract must document precise participant trust wording");
expect(docs, "profile default", "workspace contract must document renter-type profile-default semantics");
expect(docs, "same shared 3-day freshness predicate", "workspace contract must document owner dashboard/workbench freshness parity");

if (failures.length) {
  console.error("Task 10/11 workspace QA failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Task 10/11 workspace QA passed: messaging continuity, precise trust wording, localized dashboard tenant defaults, and shared owner freshness contracts are intact.");
