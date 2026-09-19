import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const expect = (source, text, message) => { if (!source.includes(text)) failures.push(message); };
const reject = (source, text, message) => { if (source.includes(text)) failures.push(message); };

const newPage = read("src/app/owner/properties/new/page.tsx");
const editPage = read("src/app/owner/properties/[id]/page.tsx");
const form = read("src/components/property-listing-form.tsx");
const workflow = read("src/components/listing-workflow-nav.tsx");
const workflowCss = read("src/components/listing-workflow-nav.module.css");
const editorCss = read("src/components/listing-editor.module.css");
const mobileCss = read("src/app/owner/properties/listing-mobile-editor.css");
const listingStyleManifest = read("src/app/owner/properties/listing-media-styles.css");
const draftGuard = read("src/components/listing-draft-guard.tsx");
const readiness = read("src/components/listing-readiness.tsx");
const policy = read("src/lib/listing-tenant-policy.ts");
const nav = read("src/components/product-navigation.tsx");

for (const page of [newPage, editPage]) {
  expect(page, "data-mobile-listing-editor", "listing editor route mobile marker");
  expect(page, "data-mobile-listing-shell", "stable mobile listing shell marker");
  expect(page, 'import "../listing-media-styles.css";', "listing editor layered stylesheet manifest import");
}

const listingSections = form.match(/<section className="listing-section(?:\s[^"]*)?"/g) ?? [];
if (listingSections.length !== 5) failures.push(`listing editor must retain exactly five primary sections, found ${listingSections.length}`);
expect(form, "data-mobile-listing-form", "mobile listing form marker");
expect(workflow, "form.dataset.activeStep = String(activeStep);", "workflow must expose active step to the form");
expect(workflow, "activeStepRef.current?.scrollIntoView", "active mobile step must stay centered/visible");
expect(workflow, 'inline: "center"', "active step centering must use inline center");
expect(workflow, "data-mobile-listing-workflow", "mobile workflow marker");
expect(workflowCss, "@media (max-width: 767px)", "mobile workflow responsive contract");
expect(workflowCss, ".stepActions {\n    display: grid;", "Back/Continue controls must remain visible on phones");
expect(workflowCss, "scroll-snap-type: inline mandatory", "five-step rail must be swipe-friendly");

expect(form, "listing-save-draft", "mobile draft-save action hook");
expect(form, "listing-submit-review", "mobile submit-review action hook");
expect(editorCss, '.listing-form:not([data-active-step="4"]) > .listing-actions .listing-submit-review', "submit must be hidden before step five");
expect(editorCss, '.listing-form[data-active-step="4"] > .listing-actions', "step five must expose final action layout");
expect(mobileCss, "bottom: max(7px, env(safe-area-inset-bottom))", "bottom action region must honor safe area");
expect(mobileCss, "> .listing-actions", "single mobile bottom listing action region");

expect(form, "function toggleTenantType(value: string)", "listing editor must own tenant-policy toggling");
expect(form, 'if (value === "everyone") return ["everyone"];', "Everyone must clear specific renter types in the UI");
expect(form, 'current.filter((item) => item !== "everyone")', "specific renter types must clear Everyone in the UI");
expect(policy, 'return !unique.includes("everyone") || unique.length === 1;', "canonical tenant-policy invariant must remain unchanged");
expect(readiness, "isValidListingTenantPolicy(tenantTypes)", "readiness must continue using canonical tenant-policy validation");

expect(listingStyleManifest, '@import "./listing-mobile-editor.css" layer(component-appearance);', "mobile editor stylesheet must stay inside the layered CSS manifest");
expect(mobileCss, "font-size: 16px", "mobile editor inputs must avoid iOS zoom");
expect(mobileCss, "min-height: 48px", "mobile primary editor controls must meet 48px target");
expect(mobileCss, "min-height: min(56dvh, 360px)", "mobile map must stay viewport-safe");
expect(mobileCss, "grid-auto-columns: minmax(238px, 78vw)", "mobile media cards must use horizontal swipe sizing");
expect(mobileCss, "scroll-snap-type: inline mandatory", "mobile media editor must support snap scrolling");
expect(mobileCss, ".listing-readiness-columns > section:last-child .listing-check-list", "helpful readiness prompts must remain accessible on mobile");

expect(draftGuard, "window.localStorage.setItem(key", "browser draft recovery must remain enabled");
expect(draftGuard, 'window.addEventListener("beforeunload", onBeforeUnload)', "dirty-editor leave protection must remain enabled");
expect(form, 'rpc("ensure_property_draft" as never', "stable draft ensure RPC must remain");
expect(form, 'rpc("save_property_draft" as never', "atomic draft-save RPC must remain");
expect(form, 'rpc("submit_property_for_review" as never', "review submission RPC must remain");
expect(form, "await cleanupRemovedStorage();", "destructive media cleanup must remain after atomic metadata save");
expect(nav, '/^\\/owner\\/properties\\/(?:new|[^/]+)$/.test(pathname)', "listing editor routes must remain contextual and suppress global mobile tabs");

reject(mobileCss, "position: fixed", "Task 8 mobile editor must not introduce a second fixed bottom action surface");

if (failures.length) {
  console.error("Task 8 mobile listing editor QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("Task 8 mobile listing editor QA passed: five-step guidance, final-step submission, tenant-policy UI, safe mobile controls, draft recovery, and atomic listing lifecycle contracts are intact.");
