import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const expect = (source, text, message) => { if (!source.includes(text)) failures.push(message); };
const reject = (source, text, message) => { if (source.includes(text)) failures.push(message); };

const ownerPage = read("src/app/owner/page.tsx");
const ownerMobileCss = read("src/app/owner/owner-mobile-portfolio.css");
const ownerStyles = read("src/app/owner/styles.css");
const ownerTheme = read("src/app/owner/owner-theme.css");
const controls = read("src/components/owner-portfolio-controls.tsx");
const controlsCss = read("src/components/owner-portfolio-controls.module.css");
const freshness = read("src/components/listing-freshness-actions.tsx");
const nav = read("src/components/product-navigation.tsx");
const freshnessContract = read("src/lib/listing-freshness.ts");

expect(ownerPage, "data-owner-mobile-portfolio", "owner portfolio mobile root marker");
expect(ownerPage, 'current="properties"', "owner portfolio must keep Properties as the active primary tab");
expect(nav, 'if (canList) items.push({ key: "properties", href: "/owner"', "eligible owners must retain the stable Properties tab");
expect(ownerPage, "data-owner-portfolio-summary", "mobile portfolio summary marker");
expect(ownerPage, "data-owner-attention-workbench", "mobile attention queue marker");
expect(ownerPage, "data-owner-property-panel", "mobile property-list marker");
expect(ownerPage, 'data-owner-needs-attention={listingNeedsAttention(property, now) ? "true" : "false"}', "listing cards must expose the shared attention predicate");
expect(ownerPage, "listings.filter((property) => listingNeedsAttention(property, now))", "portfolio summary/queue must keep the shared attention predicate");
expect(ownerPage, 'status === "attention" ? listingNeedsAttention(listing, now)', "attention filter must keep the shared predicate");
expect(freshnessContract, "export const RECONFIRM_SOON_DAYS = 3;", "owner attention horizon must remain three days");

expect(ownerPage, "copy.page.rentNotSet}</strong>", "unset rent must use explicit localized copy");
reject(ownerPage, 'formatCurrency(property.rent_bdt, locale) : "—"', "owner cards must not fabricate an unset-rent dash");
expect(ownerPage, "data-owner-status-summary", "listing status summary marker");
expect(ownerPage, "data-owner-listing-thumbnail", "listing thumbnail marker");
expect(ownerMobileCss, "[data-owner-listing-body]", "mobile listing body layout");
expect(ownerMobileCss, '[data-owner-needs-attention="true"]', "mobile attention-card emphasis");

expect(controls, "activeTabRef", "owner status controls must keep track of the active tab");
expect(controls, 'window.matchMedia("(max-width: 767px)")', "active status centering must be mobile-only");
expect(controls, 'scrollIntoView({ block: "nearest", inline: "center" })', "active owner status must center in the mobile chip rail");
expect(controlsCss, "scroll-snap-type: inline proximity", "owner status rail must be swipe-friendly");
expect(controlsCss, "min-height: 48px", "owner search controls must retain mobile control height");
expect(controlsCss, "font-size: 16px", "owner mobile search input must avoid iOS zoom");

expect(freshness, "data-owner-freshness-actions", "owner lifecycle action marker");
expect(freshness, "freshness-confirm", "availability confirmation must have a distinct mobile-primary hook");
expect(freshness, "freshness-mark-rented", "mark-rented action must retain a distinct mobile-secondary hook");
expect(freshness, "freshness-edit", "edit/relist action must retain a distinct mobile-secondary hook");
expect(ownerMobileCss, ".freshness-confirm", "mobile lifecycle hierarchy must promote confirmation");
expect(freshness, "last_confirmed_at: new Date().toISOString()", "availability reconfirm update semantics must remain unchanged");
expect(freshness, 'status: "rented"', "mark-rented update semantics must remain unchanged");
expect(freshness, 'rpc("begin_property_edit" as never', "edit/relist lifecycle RPC must remain unchanged");

expect(ownerStyles, '@import "./owner-mobile-portfolio.css" layer(mobile-appearance);', "mobile owner bridge must load in the final responsive layer");
expect(ownerTheme, "[data-owner-attention-workbench]", "owner mobile attention surface must have dark-mode coverage");
expect(ownerTheme, '[data-owner-needs-attention="true"]', "owner attention cards must have dark-mode coverage");

if (failures.length) {
  console.error("Task 7 mobile owner portfolio QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("Task 7 mobile owner portfolio QA passed: Properties navigation, shared attention logic, compact status/filter UX, explicit rent state, lifecycle actions, and dark-mode coverage are intact.");
