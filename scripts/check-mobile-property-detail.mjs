import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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
const flowCss = read("src/app/homes/property-detail-flow-redesign.css");
const galleryCss = read("src/components/property-media-gallery.module.css");
const save = read("src/components/save-home-button.tsx");
const share = read("src/components/property-share-button.tsx");
const copy = read("src/i18n/property-detail-copy.ts");

const galleryIndex = page.indexOf('className="property-detail-gallery-stage"');
const heroIndex = page.indexOf('className="property-detail-hero"');
const fitIndex = page.indexOf("tenant-compatibility-card");
const factsIndex = page.indexOf("property-summary-grid");
const costsIndex = page.indexOf("property-costs-section");
const amenitiesIndex = page.indexOf("copy.amenities.heading");
const aboutIndex = page.indexOf('<h2>{copy.about.heading}</h2>');
const locationIndex = page.indexOf("copy.location.heading");

if (!(galleryIndex >= 0 && galleryIndex < heroIndex)) failures.push("gallery must appear before the rent/title hero");
if (!(fitIndex >= 0 && fitIndex < factsIndex)) failures.push("renter-fit context must appear before secondary home facts");
if (!(factsIndex >= 0 && factsIndex < costsIndex && costsIndex < amenitiesIndex && amenitiesIndex < aboutIndex && aboutIndex < locationIndex)) {
  failures.push("property decision sections must follow fit → facts → costs → amenities → description → exact location");
}

expect(page, 'className="property-mobile-gallery-actions"', "mobile Back/Save/Share gallery controls");
expect(page, 'className="property-mobile-icon-action property-mobile-back"', "contextual mobile Back action");
expect(page, "signInHref={saveSignInHref} compact", "mobile save action preserves property/search auth return context");
expect(page, "<PropertyShareButton title={property.title || copy.common.rentalProperty} compact />", "compact mobile Share action");
expect(page, "const saveSignInHref = `/login?next=${encodeURIComponent(detailPath)}`;", "save auth destination keeps validated returnTo");
expect(save, "signInHref?: string", "SaveHomeButton optional state-preserving sign-in destination");
expect(save, "router.push(signInHref ??", "SaveHomeButton preserves legacy fallback when no custom destination is supplied");
expect(share, "compact = false", "PropertyShareButton compact mode");

expect(page, "const hasSummaryFacts =", "known-only fact gating");
expect(page, "property.bedrooms != null &&", "known-only bedrooms");
expect(page, "property.bathrooms != null &&", "known-only bathrooms");
expect(page, "property.size_sqft != null &&", "known-only size");
reject(page, 'property.bedrooms == null ? "—"', "bedroom placeholders must not be fabricated");
reject(page, 'property.bathrooms == null ? "—"', "bathroom placeholders must not be fabricated");
expect(page, "copy.costs.notProvided", "explicit missing-cost state");
expect(copy, 'notProvided: "Not provided"', "English missing-cost copy");
expect(copy, 'notProvided: "তথ্য দেওয়া নেই"', "Bangla missing-cost copy");

expect(galleryCss, "scroll-snap-type: x mandatory", "mobile swipe gallery");
expect(galleryCss, "scroll-snap-align: start", "gallery snap positions");
expect(flowCss, ".property-mobile-gallery-actions", "mobile contextual gallery styling");
expect(flowCss, ".property-contact-card > .property-contact-secondary-actions", "mobile Save/Share removal from bottom contact card");
expect(flowCss, "grid-template-columns: minmax(0, 1.45fr) minmax(0, .85fr)", "Message-first mobile contact dock hierarchy");
reject(flowCss, ".property-contact-card > .save-home-wrap {\n    position: fixed", "Save must not remain a competing fixed bottom action");

expect(page, "<StartConversationButton", "in-app messaging remains primary contact path");
expect(page, "<PhoneRevealButton", "phone reveal remains available as secondary contact path");
expect(page, "ownerPhoneVerified={ownerPhoneVerified}", "phone verification gate remains wired");
expect(page, "copy.trust.disclaimer", "trust/legal-ownership disclaimer remains visible");

if (failures.length) {
  console.error("Task 5 mobile property-detail QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Task 5 mobile property-detail QA passed: decision order, swipe media, contextual actions, known-only facts/costs, auth continuity, and Message-first contact hierarchy are intact.");
