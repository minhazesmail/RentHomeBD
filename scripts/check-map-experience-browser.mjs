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

      if (viewport.width > 820) {
        let previewMode = "success";
        await page.route("**/rest/v1/rpc/search_available_properties**", async route => {
          const query = route.request().postDataJSON();
          if (query.renter_tenant_type || previewMode === "empty") {
            await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
            return;
          }
          if (previewMode === "error") {
            await route.fulfill({ status: 503, contentType: "application/json", body: '{"message":"QA preview unavailable"}' });
            return;
          }
          const title = "QA rental at " + query.center_lat;
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{
            id: "11111111-1111-4111-8111-111111111111", title, address_text: "QA address",
            rent_bdt: 12000, bedrooms: 1, latitude: query.center_lat, longitude: query.center_long
          }]) });
        });
        await page.goto(baseURL, { waitUntil: "domcontentloaded" });
        const preview = page.locator(".landing-map-preview");
        await preview.scrollIntoViewIfNeeded();
        await preview.locator(".leaflet-control-zoom").waitFor();
        const active = preview.locator("button[aria-pressed]").nth(1);
        const neighborhoodRequest = page.waitForRequest(request => request.url().includes("/rpc/search_available_properties"));
        await active.click();
        const query = (await neighborhoodRequest).postDataJSON();
        if (query.radius_km !== 5 || query.renter_tenant_type !== null) failures.push(`${label}: preview search did not use its neighborhood radius`);
        await preview.locator(`[data-neighborhood-inventory="ready"]`).waitFor();
        if (await preview.getByText("QA rental at " + query.center_lat, { exact: true }).count() !== 1) failures.push(`${label}: preview did not render the selected neighborhood response`);
        if (await active.getAttribute("aria-pressed") !== "true") failures.push(`${label}: neighborhood selection not reflected`);
        // A new selection must replace the previous area's listings; failure and confirmed empty remain distinct.
        previewMode = "error";
        await preview.locator("button[aria-pressed]").nth(0).click();
        await preview.locator('[data-neighborhood-inventory="unavailable"]').waitFor();
        if (await preview.getByText("QA rental at " + query.center_lat, { exact: true }).count()) failures.push(`${label}: stale neighborhood rental remained visible`);
        previewMode = "empty";
        await preview.getByRole("button", { name: locale === "bn" ? "আবার চেষ্টা করুন" : "Try again", exact: true }).click();
        await preview.locator('[data-neighborhood-inventory="ready"]').waitFor();
        if (await preview.locator('a[href^="/homes/"]').count()) failures.push(`${label}: empty neighborhood still contains rental links`);
        previewMode = "success";
        await active.click();
        await preview.locator('[data-neighborhood-inventory="ready"]').waitFor();
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
      } else {
        // The dedicated mobile landing intentionally replaces the desktop map
        // preview. Enter the map workspace with equivalent search state and
        // validate the actual mobile map/filter interaction model instead.
        await page.goto(`${baseURL}/homes?area=Banani%2C%20Dhaka&radius=5`, { waitUntil: "domcontentloaded" });
        await page.waitForURL("**/homes?**");
        const shell = page.locator("[data-mobile-view]");
        await shell.waitFor({ state: "visible" });
      }

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
      const status = page.locator(".renter-results-context strong");
      if (await status.textContent() !== (locale === "bn" ? "সার্চ হয়নি" : "Not searched")) failures.push(`${label}: initial search falsely reported a result count`);
      const rentalType = page.locator(".renter-primary-filters .renter-toolbar-rental-type select");
      if (!await rentalType.isVisible()) failures.push(`${label}: rental type is not a primary filter`);
      await rentalType.selectOption("private_room");
      if (await rentalType.inputValue() !== "private_room") failures.push(`${label}: private room filter cannot be selected`);
      await page.screenshot({ path: `${output}/search-${label}.png` });
      await context.close();
    }
  }
} finally {
  await browser.close();
}
if (failures.length) throw new Error(failures.join("\n"));
console.log("Map experience browser QA passed: desktop neighborhood handoff plus desktop/mobile tenant and map-control interactions are intact in both themes.");
