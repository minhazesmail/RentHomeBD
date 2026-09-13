import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.THEME_QA_BASE_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const failures = [];
const output = "artifacts/theme-browser/map-experience";
await fs.mkdir(output, { recursive: true });

try {
  for (const viewport of [{ width: 1348, height: 800 }, { width: 390, height: 844 }]) {
    for (const { theme, locale } of [
      { theme: "light", locale: "en" }, { theme: "dark", locale: "en" },
      { theme: "light", locale: "bn" }, { theme: "dark", locale: "bn" },
    ]) {
      const context = await browser.newContext({ viewport });
      await context.addCookies([{ name: "nb_theme", value: theme, url: baseURL }, { name: "nb_locale", value: locale, url: baseURL }]);
      const page = await context.newPage();
      const label = `${viewport.width}-${theme}-${locale}`;
      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      const preview = page.locator(".landing-map-preview");
      await preview.scrollIntoViewIfNeeded();
      await preview.locator(".leaflet-control-zoom").waitFor();
      const active = preview.locator("button[aria-pressed]").nth(1);
      await active.click();
      if (await active.getAttribute("aria-pressed") !== "true") failures.push(`${label}: neighborhood selection not reflected`);
      const link = preview.locator('a[href^="/homes?"]');
      const href = new URL(await link.getAttribute("href"), baseURL);
      if (href.searchParams.get("area") !== "Banani, Dhaka" || href.searchParams.get("radius") !== "5") failures.push(`${label}: selected neighborhood handoff lost`);
      const bounds = await preview.evaluate(element => {
        const map = element.querySelector(".leaflet-container").getBoundingClientRect();
        const rail = element.querySelector(".landing-map-rail").getBoundingClientRect();
        const zoom = element.querySelector(".leaflet-control-zoom").getBoundingClientRect();
        const caption = document.querySelector(".landing-map-caption").getBoundingClientRect();
        const header = element.firstElementChild.getBoundingClientRect();
        return { captionBottom: caption.bottom, previewTop: element.getBoundingClientRect().top, headerHeight: header.height, mapBottom: map.bottom, railTop: rail.top, zoomRight: zoom.right, mapRight: map.right, overflow: document.documentElement.scrollWidth - innerWidth };
      });
      if (bounds.mapBottom > bounds.railTop + 2 || bounds.zoomRight > bounds.mapRight || bounds.overflow > 2) failures.push(`${label}: landing map geometry overlaps or overflows`);
      if (bounds.captionBottom > bounds.previewTop + 2 || bounds.headerHeight > 130) failures.push(`${label}: legacy caption or stretched rows distort the map card`);
      await preview.screenshot({ path: `${output}/landing-${label}.png` });
      await link.click();
      await page.waitForURL("**/homes?**");
      if (await page.locator(".renter-toolbar-tenant select").inputValue() !== "") failures.push(`${label}: tenant selection must remain explicit`);
      if (viewport.width > 960) {
        await page.locator(".renter-map-panel .leaflet-control-zoom").waitFor();
        const separated = await page.evaluate(() => {
          const actions = document.querySelector(".renter-map-actions").getBoundingClientRect();
          const zoom = document.querySelector(".renter-map-panel .leaflet-control-zoom").getBoundingClientRect();
          return actions.right <= zoom.left || actions.bottom <= zoom.top || actions.top >= zoom.bottom;
        });
        if (!separated) failures.push(`${label}: zoom overlaps map action group`);
      } else {
        await page.getByRole("button", { name: locale === "bn" ? "ফিল্টার" : "Filters", exact: true }).click();
        await page.locator(".renter-toolbar-tenant select").waitFor({ state: "visible" });
      }
      await page.screenshot({ path: `${output}/search-${label}.png` });
      await context.close();
    }
  }
} finally {
  await browser.close();
}
if (failures.length) throw new Error(failures.join("\n"));
console.log("Map experience browser QA passed: neighborhood selection, tenant handoff and map control separation at desktop/mobile in both themes.");
