import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.MOBILE_CONCEPT_QA_BASE_URL ?? "http://127.0.0.1:3000";
const artifactRoot = path.join(process.cwd(), "artifacts", "mobile-concept");
const viewports = [
  { name: "360x800", width: 360, height: 800 },
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "412x915", width: 412, height: 915 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
];

await fs.mkdir(artifactRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];

async function inspectLanding(page) {
  return page.evaluate(() => {
    const mobile = document.querySelector("[data-mobile-concept-landing]");
    const desktop = document.querySelector(".landing-desktop-primary");
    const nav = mobile?.querySelector("header");
    const search = mobile?.querySelector('form[role="search"]');
    const heading = mobile?.querySelector("h1");
    const accent = mobile?.querySelector("h1 strong");
    const primaryTabs = mobile?.querySelector("[data-mobile-primary-tabs]");
    const navRect = nav?.getBoundingClientRect();
    const searchRect = search?.getBoundingClientRect();
    const headingRect = heading?.getBoundingClientRect();
    const mobileStyle = mobile ? getComputedStyle(mobile) : null;
    const desktopStyle = desktop ? getComputedStyle(desktop) : null;

    return {
      mobileVisible: Boolean(mobile && mobileStyle && mobileStyle.display !== "none" && mobile.getBoundingClientRect().height > 20),
      desktopHidden: Boolean(desktop && desktopStyle && desktopStyle.display === "none"),
      navHeight: navRect?.height ?? 0,
      searchWidth: searchRect?.width ?? 0,
      headingWidth: headingRect?.width ?? 0,
      accentExists: Boolean(accent),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      searchButton: mobile?.querySelector('button[type="submit"]')?.textContent?.trim() ?? "",
      fieldOrder: Array.from(mobile?.querySelectorAll("[data-mobile-search-field]") ?? []).map((node) => node.getAttribute("data-mobile-search-field") ?? ""),
      moreFiltersExists: Boolean(mobile?.querySelector("[data-mobile-more-filters]")),
      tabLabels: Array.from(primaryTabs?.querySelectorAll("a span") ?? []).map((node) => node.textContent?.trim() ?? ""),
      tabHrefs: Array.from(primaryTabs?.querySelectorAll("a") ?? []).map((node) => node.getAttribute("href") ?? ""),
    };
  });
}

function validateLanding(snapshot, label) {
  if (!snapshot.mobileVisible) failures.push(`${label}: dedicated mobile landing is not visible`);
  if (!snapshot.desktopHidden) failures.push(`${label}: desktop hero/navigation are still visible`);
  if (snapshot.navHeight < 52) failures.push(`${label}: compact mobile app bar collapsed`);
  if (snapshot.searchWidth < 300) failures.push(`${label}: search card is unexpectedly narrow (${snapshot.searchWidth})`);
  if (snapshot.headingWidth < 150) failures.push(`${label}: editorial hero heading collapsed`);
  if (!snapshot.accentExists) failures.push(`${label}: hero emphasis is missing`);
  if (snapshot.overflow > 2) failures.push(`${label}: horizontal overflow ${snapshot.overflow}px`);
  if (!snapshot.searchButton) failures.push(`${label}: primary search CTA is missing`);
  if (snapshot.fieldOrder.join("|") !== "area|tenant|budget") failures.push(`${label}: primary search order drifted (${snapshot.fieldOrder.join(", ")})`);
  if (!snapshot.moreFiltersExists) failures.push(`${label}: More filters disclosure is missing`);

  const expectedHrefs = ["/homes", "/saved", "/messages", "/login"];
  if (snapshot.tabLabels.length !== 4) failures.push(`${label}: expected 4 primary mobile tabs`);
  if (snapshot.tabHrefs.join("|") !== expectedHrefs.join("|")) {
    failures.push(`${label}: mobile tab destinations drifted (${snapshot.tabHrefs.join(", ")})`);
  }
}

async function openSettled(page, url, settleMs = 650) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(settleMs);
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, colorScheme: "light" });
    const page = await context.newPage();
    await openSettled(page, `${baseURL}/`);
    const snapshot = await inspectLanding(page);
    validateLanding(snapshot, viewport.name);
    await page.screenshot({ path: path.join(artifactRoot, `landing-light-${viewport.name}.png`), fullPage: true });
    if (viewport.name === "390x844") {
      await fs.writeFile(path.join(artifactRoot, "landing-light-390x844-metrics.json"), JSON.stringify(snapshot, null, 2));
    }
    await context.close();
  }

  const entryContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light" });
  const entryPage = await entryContext.newPage();
  await openSettled(entryPage, `${baseURL}/`);
  await entryPage.locator('[data-mobile-search-field="area"] input[type="search"]').fill("Dhanmondi, Dhaka");
  await entryPage.locator('[data-mobile-search-field="tenant"] select').selectOption("family");
  await entryPage.locator('[data-mobile-search-field="budget"] select').selectOption("25000");
  await entryPage.locator("[data-mobile-more-filters] summary").click();
  await entryPage.locator('[data-mobile-more-filters] select[name="bedrooms"]').selectOption("2");
  await entryPage.locator('[data-mobile-more-filters] select[name="radius"]').selectOption("10");

  const mapHrefValue = await entryPage.locator('[data-mobile-concept-landing] a[href^="/homes?"]').first().getAttribute("href");
  const mapHref = new URL(mapHrefValue ?? "/homes", baseURL);
  for (const [key, expected] of [["area", "Dhanmondi, Dhaka"], ["tenant", "family"], ["maxRent", "25000"], ["bedrooms", "2"], ["radius", "10"]]) {
    if (mapHref.searchParams.get(key) !== expected) failures.push(`entry-search: map CTA lost ${key}=${expected}`);
  }

  await Promise.all([
    entryPage.waitForURL("**/homes?**"),
    entryPage.locator("[data-mobile-entry-search] button[type='submit']").click(),
  ]);
  const submitted = new URL(entryPage.url());
  for (const [key, expected] of [["area", "Dhanmondi, Dhaka"], ["tenant", "family"], ["maxRent", "25000"], ["bedrooms", "2"], ["radius", "10"]]) {
    if (submitted.searchParams.get(key) !== expected) failures.push(`entry-search: submitted URL lost ${key}=${expected}`);
  }
  await entryContext.close();

  const darkContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  const darkPage = await darkContext.newPage();
  await openSettled(darkPage, `${baseURL}/`);
  await darkPage.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.dataset.resolvedTheme = "dark";
  });
  await darkPage.waitForTimeout(150);
  await darkPage.screenshot({ path: path.join(artifactRoot, "landing-dark-390x844.png"), fullPage: true });
  await darkContext.close();

  const homesContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light" });
  const homesPage = await homesContext.newPage();
  await openSettled(homesPage, `${baseURL}/homes?area=Dhanmondi%2C%20Dhaka&tenant=family&radius=15`, 1200);
  const homesSnapshot = await homesPage.evaluate(() => ({
    productNav: Boolean(document.querySelector("[data-product-navigation]")),
    mobileTabsEnabled: document.querySelector("[data-product-navigation]")?.getAttribute("data-mobile-tabs") ?? "",
    primaryTabs: Array.from(document.querySelectorAll("[data-mobile-primary-tabs] a span")).map((node) => node.textContent?.trim() ?? ""),
    mapPanel: Boolean(document.querySelector(".renter-map-panel")),
    summary: Boolean(document.querySelector(".mobile-search-summary")),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  if (!homesSnapshot.productNav) failures.push("homes: product navigation is missing");
  if (homesSnapshot.mobileTabsEnabled !== "true") failures.push("homes: top-level primary tabs are not enabled");
  if (homesSnapshot.primaryTabs.length !== 4) failures.push("homes: expected 4 primary tabs, found " + homesSnapshot.primaryTabs.length);
  if (!homesSnapshot.mapPanel) failures.push("homes: map panel is missing");
  if (!homesSnapshot.summary) failures.push("homes: mobile search summary is missing");
  if (homesSnapshot.overflow > 2) failures.push(`homes: horizontal overflow ${homesSnapshot.overflow}px`);
  await homesPage.screenshot({ path: path.join(artifactRoot, "homes-light-390x844.png"), fullPage: true });
  await homesContext.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("Mobile concept browser QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Mobile concept browser QA passed. Screenshots saved to ${artifactRoot}.`);
