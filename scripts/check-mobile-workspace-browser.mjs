import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const baseURL = process.env.THEME_QA_BASE_URL ?? "http://127.0.0.1:3000";
const output = "artifacts/mobile-workspace";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const homes = Array.from({ length: 16 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  title: `Test home ${index + 1}`, address_text: "Dhanmondi, Dhaka", property_type: "apartment",
  rent_bdt: 20000 + index * 100, bedrooms: 2, bathrooms: 1, furnishing: "unfurnished",
  available_from: null, latitude: 23.746 + index * .001, longitude: 90.376 + index * .001,
  // Intentionally not distance ordered: the UI must retain authoritative RPC order.
  distance_meters: 1600 - index * 50, cover_media_path: null, total_matches: 16, results_truncated: false,
}));
try {
  for (const scenario of [
    { width: 390, height: 844, locale: "en", theme: "light" },
    { width: 360, height: 800, locale: "bn", theme: "dark" },
    { width: 768, height: 1024, locale: "en", theme: "dark" },
    { width: 320, height: 640, locale: "bn", theme: "light" },
  ]) {
    const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height } });
    await context.addCookies([{ name: "nb_locale", value: scenario.locale, url: baseURL }, { name: "nb_theme", value: scenario.theme, url: baseURL }]);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const requests = [];
    let failNext = false;
    try {
    await page.route("**/rest/v1/rpc/search_available_properties", async route => {
      requests.push(route.request().postDataJSON());
      if (failNext) {
        failNext = false;
        await route.fulfill({ status: 500, json: { message: "test search failure" } });
      } else await route.fulfill({ json: homes });
    });
    await page.route("**/rest/v1/property_tenant_types?**", route => route.fulfill({ json: homes.map(home => ({ property_id: home.id, tenant_type: "family" })) }));
    // A failed basemap must not disable the list/filter interface.
    await page.route(/.*(?:basemaps|tile\.openstreetmap).*/, route => route.abort());
    await page.goto(`${baseURL}/homes?area=Dhanmondi%2C+Dhaka&tenant=family&maxRent=25000&radius=5`, { waitUntil: "domcontentloaded" });
    const host = page.locator("[data-mobile-sheet]");
    const cards = page.locator("[data-property-id]");
    await cards.first().waitFor();
    assert.equal(await cards.first().getAttribute("data-property-id"), homes[0].id, "server order changed");
    const summary = await page.locator(".mobile-search-summary").textContent();
    const filters = page.locator(".mobile-quick-filters button").first();
    const dialog = page.getByRole("dialog");
    await filters.click();
    await dialog.waitFor();
    await dialog.locator(".renter-toolbar-budget input").fill("23000");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await page.locator(".mobile-search-summary").textContent(), summary, "cancel changed applied summary");
    assert.equal(await filters.evaluate(element => element === document.activeElement), true, "cancel did not restore focus");
    await filters.click();
    assert.equal(await dialog.locator(".renter-toolbar-budget input").inputValue(), "25000");
    const beforeClear = requests.length;
    await dialog.locator(".mobile-filter-footer button").first().click();
    assert.equal(await dialog.locator(".renter-toolbar-tenant select").inputValue(), "family", "clear erased tenant");
    assert.equal(requests.length, beforeClear, "clear applied a request");
    await dialog.locator(".renter-toolbar-budget input").fill("24000");
    await dialog.locator(".mobile-filter-footer button").last().click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(requests.at(-1).max_rent, 24000);
    assert.equal(requests.at(-1).renter_tenant_type, "family");
    await filters.click();
    await dialog.locator(".renter-toolbar-budget input").fill("22000");
    failNext = true;
    await dialog.locator(".mobile-filter-footer button").last().click();
    await dialog.locator(".auth-message").waitFor();
    assert.equal(await dialog.isVisible(), true, "failed search closed dialog");
    await page.keyboard.press("Escape");
    const controls = page.locator("[data-mobile-results-controls]");
    await controls.locator("nav button").first().click();
    const expand = controls.locator("button").last();
    await expand.click();
    assert.equal(await host.getAttribute("data-mobile-sheet"), "expanded");
    await controls.locator("button").nth(2).click();
    await controls.locator("button").nth(2).click();
    assert.equal(await host.getAttribute("data-mobile-sheet"), "collapsed");
    await expand.click();
    assert.equal(await host.getAttribute("data-mobile-sheet"), "partial");
    const grip = await controls.locator(":scope > div").first().boundingBox();
    assert.ok(grip);
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x + grip.width / 2, grip.y - 70, { steps: 8 });
    await page.mouse.up();
    assert.equal(await host.getAttribute("data-mobile-sheet"), "expanded", "drag did not expand sheet");
    await controls.locator("nav button").last().click();
    assert.equal(await host.getAttribute("data-mobile-view"), "list");
    await cards.first().locator(".renter-result-map-button").click();
    assert.equal(await host.getAttribute("data-mobile-view"), "map");
    assert.equal(await cards.first().locator(".renter-result-map-button").getAttribute("aria-pressed"), "true");
    await controls.locator("nav button").last().click();
    await cards.nth(5).scrollIntoViewIfNeeded();
    const scroll = await page.locator(".renter-results-pane").evaluate(element => element.scrollTop);
    const link = cards.nth(5).locator("a.renter-result-card");
    // Exercise the real capture handler, then force a full navigation to prove remount restoration.
    await link.evaluate(element => element.addEventListener("click", event => event.preventDefault(), { once: true }));
    await link.click();
    const returned = page.url();
    assert.equal(new URL(returned).searchParams.get("maxRent"), "24000");
    await page.goto(`${baseURL}/about`, { waitUntil: "domcontentloaded" });
    await page.goBack({ waitUntil: "domcontentloaded" });
    await cards.first().waitFor();
    assert.equal(await host.getAttribute("data-mobile-view"), "list", "Back lost view");
    const restoredScroll = await page.locator(".renter-results-pane").evaluate(element => element.scrollTop);
    assert.ok(Math.abs(scroll - restoredScroll) < 10, `Back lost scroll: ${scroll} vs ${restoredScroll}`);
    assert.equal(await cards.first().locator(".renter-result-map-button").getAttribute("aria-pressed"), "true", "Back lost selected pin");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), "horizontal overflow");
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${output}/${scenario.width}-${scenario.locale}-${scenario.theme}.png`, fullPage: true });
    } catch (error) {
      await page.screenshot({ path: `${output}/failure-${scenario.width}-${scenario.locale}.png`, fullPage: true });
      throw error;
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log("Mobile workspace browser QA passed: draft/apply, failure, sheet, selection, server order and Back restoration.");
