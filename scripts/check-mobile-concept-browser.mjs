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

async function inspectLanding(page, label) {
  return page.evaluate(() => {
    const mobile = document.querySelector("[data-mobile-concept-landing]");
    const desktop = document.querySelector(".landing-desktop-primary");
    const nav = mobile?.querySelector("header");
    const search = mobile?.querySelector('form[role="search"]');
    const artwork = mobile?.querySelector("img[src*='nearbasha-mobile-home']");
    const heading = mobile?.querySelector("h1");
    const italic = mobile?.querySelector("h1 em");
    const navRect = nav?.getBoundingClientRect();
    const searchRect = search?.getBoundingClientRect();
    const headingRect = heading?.getBoundingClientRect();
    const artworkRect = artwork?.getBoundingClientRect();
    const mobileStyle = mobile ? getComputedStyle(mobile) : null;
    const desktopStyle = desktop ? getComputedStyle(desktop) : null;
    const artworkStyle = artwork ? getComputedStyle(artwork) : null;
    const artworkParentStyle = artwork?.parentElement ? getComputedStyle(artwork.parentElement) : null;
    return {
      mobileVisible: Boolean(mobile && mobileStyle && mobileStyle.display !== "none" && mobile.getBoundingClientRect().height > 20),
      desktopHidden: Boolean(desktop && desktopStyle && desktopStyle.display === "none"),
      navHeight: navRect?.height ?? 0,
      searchWidth: searchRect?.width ?? 0,
      headingWidth: headingRect?.width ?? 0,
      artworkWidth: artworkRect?.width ?? 0,
      artworkHeight: artworkRect?.height ?? 0,
      artworkLoaded: Boolean(artwork instanceof HTMLImageElement && artwork.complete && artwork.naturalWidth >= 300 && artwork.naturalHeight >= 700),
      artworkNaturalWidth: artwork instanceof HTMLImageElement ? artwork.naturalWidth : 0,
      artworkNaturalHeight: artwork instanceof HTMLImageElement ? artwork.naturalHeight : 0,
      artworkDisplay: artworkStyle?.display ?? "missing",
      artworkVisibility: artworkStyle?.visibility ?? "missing",
      artworkOpacity: artworkStyle?.opacity ?? "missing",
      artworkPosition: artworkParentStyle?.position ?? "missing",
      artworkParentZIndex: artworkParentStyle?.zIndex ?? "missing",
      italicExists: Boolean(italic),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      searchButton: mobile?.querySelector('button[type="submit"]')?.textContent?.trim() ?? "",
      navLinks: Array.from(nav?.querySelectorAll("nav a") ?? []).map((node) => node.textContent?.trim()),
    };
  });
}

function validateLanding(snapshot, label) {
  if (!snapshot.mobileVisible) failures.push(`${label}: dedicated mobile landing is not visible`);
  if (!snapshot.desktopHidden) failures.push(`${label}: desktop hero/navigation are still visible`);
  if (snapshot.navHeight < 120) failures.push(`${label}: concept navigation is not using the intended two-row height`);
  if (snapshot.searchWidth < 300) failures.push(`${label}: search card is unexpectedly narrow (${snapshot.searchWidth})`);
  if (snapshot.headingWidth < 150) failures.push(`${label}: editorial hero heading collapsed`);
  if (snapshot.artworkWidth < 130) failures.push(`${label}: organic home artwork collapsed`);
  if (!snapshot.artworkLoaded) failures.push(`${label}: organic home artwork did not finish loading`);
  if (snapshot.artworkDisplay === "none" || snapshot.artworkVisibility === "hidden" || Number(snapshot.artworkOpacity) < 0.9) {
    failures.push(`${label}: organic home artwork is hidden by computed styles`);
  }
  if (!snapshot.italicExists) failures.push(`${label}: italic hero accent is missing`);
  if (snapshot.overflow > 2) failures.push(`${label}: horizontal overflow ${snapshot.overflow}px`);
  if (snapshot.navLinks.length !== 3) failures.push(`${label}: expected 3 second-row navigation links`);
  if (!snapshot.searchButton) failures.push(`${label}: primary search CTA is missing`);
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
    const snapshot = await inspectLanding(page, viewport.name);
    validateLanding(snapshot, viewport.name);
    await page.screenshot({ path: path.join(artifactRoot, `landing-light-${viewport.name}.png`), fullPage: true });
    if (viewport.name === "390x844") {
      await fs.writeFile(path.join(artifactRoot, "landing-light-390x844-metrics.json"), JSON.stringify(snapshot, null, 2));
      await page.locator("[data-mobile-concept-landing] img[src*='nearbasha-mobile-home']").screenshot({
        path: path.join(artifactRoot, "landing-artwork-390x844.png"),
      });
    }
    await context.close();
  }

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
    mapPanel: Boolean(document.querySelector(".renter-map-panel")),
    summary: Boolean(document.querySelector(".mobile-search-summary")),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  if (!homesSnapshot.productNav) failures.push("homes: product navigation is missing");
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
