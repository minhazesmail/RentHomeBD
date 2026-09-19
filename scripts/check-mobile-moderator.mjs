import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const expect = (source, text, message) => { if (!source.includes(text)) failures.push(message); };
const reject = (source, text, message) => { if (source.includes(text)) failures.push(message); };

const listingQueue = read("src/app/moderation/page.tsx");
const listingDetail = read("src/app/moderation/[id]/page.tsx");
const reportQueue = read("src/app/moderation/reports/page.tsx");
const reportDetail = read("src/app/moderation/reports/[id]/page.tsx");
const accountQueue = read("src/app/moderation/accounts/page.tsx");
const nav = read("src/components/moderation-workbench-nav.tsx");
const listingActions = read("src/components/moderation-decision-form.tsx");
const reportActions = read("src/components/report-moderation-actions.tsx");
const profileActions = read("src/components/profile-verification-actions.tsx");
const copy = read("src/i18n/moderation-copy.ts");
const mobileCss = read("src/app/moderation/moderation-mobile.css");
const styleManifest = read("src/app/moderation/styles.css");

for (const source of [listingQueue, listingDetail, reportQueue, reportDetail, accountQueue]) {
  expect(source, "requireModerator()", "every moderation route must retain moderator authorization");
}
expect(listingQueue, 'data-mobile-moderation-queue="listings"', "listing queue mobile marker");
expect(reportQueue, 'data-mobile-moderation-queue="reports"', "report queue mobile marker");
expect(accountQueue, 'data-mobile-moderation-queue="accounts"', "account queue mobile marker");
expect(listingDetail, 'data-mobile-moderation-review="listing"', "listing review mobile marker");
expect(reportDetail, 'data-mobile-moderation-review="report"', "report review mobile marker");
expect(nav, "data-mobile-moderation-nav", "moderator queue navigation mobile marker");
expect(nav, "formatNumber(counts[key], locale)", "moderator queue counts must stay localized");

expect(copy, 'notProvided: "Not provided"', "English missing-evidence copy");
expect(copy, 'notProvided: "তথ্য দেওয়া নেই"', "Bangla missing-evidence copy");
reject(listingDetail, '|| "—"', "listing review must not use ambiguous dash evidence");
reject(listingDetail, '?? "—"', "listing review must not use ambiguous dash evidence");
reject(reportDetail, '|| "—"', "report review must not use ambiguous dash evidence");
reject(reportDetail, '?? "—"', "report review must not use ambiguous dash evidence");
expect(listingDetail, "copy.common.legalDisclaimer", "listing review must retain trust-signal disclaimer");
expect(accountQueue, "copy.common.legalDisclaimer", "account review must retain trust-signal disclaimer");

expect(listingActions, 'from("property_moderation_actions").insert', "listing decisions must keep the audit insert");
expect(listingActions, "moderation-action-reject", "listing reject action role hook");
expect(listingActions, "moderation-action-approve", "listing approve action role hook");
expect(reportActions, 'from("listing_report_actions").insert', "report decisions must keep the audit insert");
expect(reportActions, "moderation-action-dismiss", "report dismiss action role hook");
expect(reportActions, "moderation-action-resolve", "report resolve action role hook");
expect(reportActions, "moderation-action-hide", "report hide action role hook");
expect(profileActions, 'from("profile_verification_actions").insert', "account trust decisions must keep the audit insert");
expect(profileActions, "moderation-action-verify", "account verify action role hook");
expect(profileActions, "moderation-action-revoke", "account revoke action role hook");

expect(mobileCss, "[data-mobile-moderation-nav]", "mobile moderator navigation styling");
expect(mobileCss, "position: sticky", "mobile queue navigation must remain available while scrolling");
expect(mobileCss, "grid-template-columns: repeat(3, minmax(0, 1fr))", "three moderator queues must remain directly switchable");
expect(mobileCss, ".moderation-attention-summary", "mobile evidence summary styling");
expect(mobileCss, "scroll-snap-type: inline mandatory", "mobile evidence/media rails must support snap scrolling");
expect(mobileCss, ".moderation-inspection-grid", "mobile inspection layout");
expect(mobileCss, "grid-template-columns: 1fr", "mobile inspection/account layouts must collapse to one column");
expect(mobileCss, "font-size: 16px", "moderator notes inputs must avoid iOS zoom");
expect(mobileCss, "min-height: 48px", "moderator decision buttons must meet the 48px target");
expect(mobileCss, ".moderation-action-reject", "destructive listing action mobile styling");
expect(mobileCss, ".moderation-action-hide", "destructive report action mobile styling");
expect(mobileCss, ".moderation-action-revoke", "destructive account action mobile styling");
expect(styleManifest, '@import "./moderation-mobile.css" layer(mobile-appearance);', "mobile moderator stylesheet must use the final responsive layer");
reject(mobileCss, "position: fixed", "mobile moderator workspace must not introduce a fixed competing action surface");

if (failures.length) {
  console.error("Task 9 mobile moderator QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("Task 9 mobile moderator QA passed: authorization, localized evidence, audit inserts, queue navigation, mobile inspection, and decision-action contracts are intact.");
