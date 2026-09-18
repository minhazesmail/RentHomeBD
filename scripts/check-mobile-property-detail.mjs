import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireText(source, text, label) {
  if (!source.includes(text)) failures.push(`missing ${label}`);
}

function forbidText(source, text, label) {
  if (source.includes(text)) failures.push(label);
}

function requireOrder(source, markers, label) {
  let previous = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    if (index < 0) {
      failures.push(`${label}: missing ${marker}`);
      return;
    }
    if (index <= previous) {
      failures.push(`${label}: ${marker} is out of order`);
      return;
    }
    previous = index;
  }
}

const page = read("src/app/homes/[id]/page.tsx");
const copy = read("src/i18n/property-detail-copy.ts");
const gallery = read("src/components/property-media-gallery.tsx");
const galleryCss = read("src/components/property-media-gallery.module.css");
const mobileCss = read("src/app/homes/property-detail-mobile-task5.css");
const save = read("src/components/save-home-button.tsx");
const phoneReveal = read("src/components/phone-reveal-button.tsx");
const phonePage = read("src/app/account/phone/page.tsx");
const phoneForm = read("src/components/phone-verification-form.tsx");

requireText(page, "data-mobile-property-detail", "Task 5 property-detail marker");
requireText(page, "data-property-mobile-actions", "contextual mobile Back/Save/Share actions");
requireText(page, "saveSignInHref", "state-preserving save sign-in href");
requireText(page, "phoneVerifyHref", "state-preserving phone verification href");
requireText(page, "data-property-sticky-actions", "mobile contact dock marker");
requireText(page, "verifyHref={phoneVerifyHref}", "phone verification destination wiring");
requireText(page, "copy.common.notProvided", "Not provided cost handling");

requireOrder(page, [
  "<PropertyMediaGallery",
  'data-property-detail-section="intro"',
  'data-property-detail-section="fit"',
  'data-property-detail-section="facts"',
  'data-property-detail-section="costs"',
  'data-property-detail-section="accepted-renters"',
  'data-property-detail-section="amenities"',
  'data-property-detail-section="description"',
  'data-property-detail-section="location"',
  'data-property-detail-section="trust"',
], "mobile property decision order");

requireText(page, "property.bedrooms != null &&", "known-only bedroom fact");
requireText(page, "property.bathrooms != null &&", "known-only bathroom fact");
requireText(page, "property.size_sqft != null &&", "known-only size fact");
requireText(page, "property.floor_number != null &&", "known-only floor fact");
forbidText(page, 'property.bedrooms == null ? "—"', "bedroom placeholder fabrication returned");
forbidText(page, 'property.bathrooms == null ? "—"', "bathroom placeholder fabrication returned");
forbidText(page, 'property.size_sqft ? formatNumber(property.size_sqft, locale) : "—"', "size placeholder fabrication returned");

requireText(copy, 'notProvided: "Not provided"', "English Not provided copy");
requireText(copy, 'notProvided: "তথ্য দেওয়া নেই"', "Bangla Not provided copy");
requireText(copy, 'acceptedHeading: "Accepted renter types"', "English accepted-renter heading");
requireText(copy, 'acceptedHeading: "গ্রহণযোগ্য ভাড়াটিয়ার ধরন"', "Bangla accepted-renter heading");
requireText(copy, 'heading: "Costs"', "English costs heading");
requireText(copy, 'heading: "খরচ"', "Bangla costs heading");

requireText(gallery, "data-property-mobile-gallery", "mobile swipe gallery marker");
requireText(gallery, "data-property-media-count", "visible gallery count marker");
requireText(galleryCss, "scroll-snap-type: x mandatory", "mobile gallery scroll snapping");
requireText(galleryCss, "scroll-snap-align: center", "mobile gallery snap alignment");
requireText(galleryCss, "flex: 0 0 100%", "one-card mobile gallery paging");

requireText(mobileCss, ".property-detail-mobile-actions", "mobile contextual action styling");
requireText(mobileCss, ".property-mobile-price-row", "mobile rent-first styling");
requireText(mobileCss, "grid-template-columns: minmax(0, 1.35fr) minmax(0, .85fr)", "Message-first contact dock sizing");
requireText(mobileCss, ".property-contact-utility-actions", "desktop save/share grouping");
requireText(mobileCss, "display: none;", "mobile utility-action suppression");

requireText(save, "signInHref?: string", "optional save sign-in destination");
requireText(save, "router.push(signInHref ??", "save context preservation");
requireText(phoneReveal, "verifyHref?: string", "optional phone verification destination");
requireText(phoneReveal, "href={verifyHref}", "phone verification link wiring");
requireText(phonePage, "safeRelativePath", "validated phone return destination");
requireText(phoneForm, "if (returnTo) router.replace(returnTo)", "post-verification property return");

if (failures.length) {
  console.error("Task 5 mobile property-detail QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Task 5 mobile property-detail QA passed: decision order, swipe gallery, known-only facts/costs, contact continuity, and mobile action contracts are intact.");
