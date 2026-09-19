import { chromium } from "playwright";

const baseURL = process.env.MAP_AREA_QA_BASE_URL ?? "http://127.0.0.1:3000";
const failures = [];
const rpcBodies = [];
let rpcCount = 0;
let forceNextFailure = false;

function fail(message) {
  failures.push(message);
}

const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
  });

  await context.route(/https:\/\/[^/]+\.tile\.openstreetmap\.org\/.*\.png/, (route) => route.fulfill({
    status: 200,
    contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Gf8AAAAASUVORK5CYII=", "base64"),
  }));

  await context.route(/\/rest\/v1\/rpc\/search_available_properties(?:\?|$)/, async (route) => {
    rpcCount += 1;
    try {
      rpcBodies.push(JSON.parse(route.request().postData() ?? "{}"));
    } catch {
      rpcBodies.push({});
    }

    if (rpcCount > 1) await new Promise((resolve) => setTimeout(resolve, 220));

    if (forceNextFailure) {
      forceNextFailure = false;
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "forced map area search failure" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "0-0/0" },
      body: "[]",
    });
  });

  const page = await context.newPage();
  const initialLat = 23.8103;
  const initialLng = 90.4125;
  const response = await page.goto(
    `${baseURL}/homes?lat=${initialLat}&lng=${initialLng}&radius=15&tenant=bachelor&sort=recommended`,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );

  if (!response || response.status() >= 400) {
    fail(`/homes returned HTTP ${response?.status() ?? "no response"}`);
  } else {
    await page.waitForSelector(".renter-map-panel .leaflet-container", { timeout: 10_000 });
    await page.waitForFunction(() => document.documentElement.dataset.themeReady === "true", null, { timeout: 8_000 });
    await page.waitForFunction(() => {
      const summary = document.querySelector(".mobile-search-summary");
      return summary && !summary.textContent?.toLowerCase().includes("searching");
    }, null, { timeout: 10_000 });

    if (rpcCount < 1) fail("initial search RPC did not run");

    const zoomIn = page.locator(".renter-map-panel .leaflet-control-zoom-in");
    await zoomIn.click();
    await page.waitForTimeout(350);
    if (await page.locator(".renter-search-this-area").count()) {
      fail("zoom-only interaction incorrectly exposes Search this area even though center/radius query did not change");
    }

    const map = page.locator(".renter-map-panel .leaflet-container");
    const box = await map.boundingBox();
    if (!box) {
      fail("Leaflet map has no measurable bounds");
    } else {
      const startX = box.x + box.width * 0.62;
      const startY = box.y + box.height * 0.46;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 86, startY + 12, { steps: 8 });
      await page.mouse.up();

      const searchArea = page.locator(".renter-search-this-area");
      await searchArea.waitFor({ state: "visible", timeout: 5_000 });

      const before = new URL(page.url());
      const beforeLat = Number(before.searchParams.get("lat"));
      const beforeLng = Number(before.searchParams.get("lng"));

      await searchArea.click();
      await page.waitForFunction(() => {
        const button = document.querySelector(".renter-search-this-area");
        return button instanceof HTMLButtonElement && button.disabled;
      }, null, { timeout: 2_000 });

      await page.waitForFunction(() => !document.querySelector(".renter-search-this-area"), null, { timeout: 8_000 });
      const feedback = page.locator("[data-map-search-feedback]");
      await feedback.waitFor({ state: "visible", timeout: 3_000 });
      const feedbackText = (await feedback.textContent())?.trim() ?? "";
      if (!feedbackText) fail("successful map-area search has no visible map-level acknowledgement");

      if (rpcCount < 2) {
        fail("Search this area did not issue a new search RPC");
      } else {
        const applied = rpcBodies[1] ?? {};
        const movedLat = Number(applied.center_lat);
        const movedLng = Number(applied.center_long);
        if (!Number.isFinite(movedLat) || !Number.isFinite(movedLng)) {
          fail("map-area RPC did not carry a finite center");
        }
        if (Math.abs(movedLat - initialLat) < 0.0001 && Math.abs(movedLng - initialLng) < 0.0001) {
          fail("map-area RPC reused the old search center after a pan");
        }
      }

      const after = new URL(page.url());
      const afterLat = Number(after.searchParams.get("lat"));
      const afterLng = Number(after.searchParams.get("lng"));
      if (!Number.isFinite(afterLat) || !Number.isFinite(afterLng)) {
        fail("successful map-area search did not commit lat/lng into the URL");
      }
      if (Math.abs(afterLat - beforeLat) < 0.0001 && Math.abs(afterLng - beforeLng) < 0.0001) {
        fail("successful map-area search URL did not change after panning");
      }
      if (after.searchParams.has("area") || after.searchParams.has("selected") || after.searchParams.has("listScroll")) {
        fail("canonical map-area URL retained stale area/selection/scroll state");
      }
      if (after.searchParams.get("tenant") !== "bachelor" || after.searchParams.get("radius") !== "15") {
        fail("canonical map-area URL lost applied renter criteria");
      }

      const secondBox = await map.boundingBox();
      if (secondBox) {
        const sx = secondBox.x + secondBox.width * 0.58;
        const sy = secondBox.y + secondBox.height * 0.5;
        await page.mouse.move(sx, sy);
        await page.mouse.down();
        await page.mouse.move(sx + 72, sy - 8, { steps: 8 });
        await page.mouse.up();

        const retryArea = page.locator(".renter-search-this-area");
        await retryArea.waitFor({ state: "visible", timeout: 5_000 });
        forceNextFailure = true;
        await retryArea.click();
        const errorFeedback = page.locator("[data-map-search-feedback].is-error");
        await errorFeedback.waitFor({ state: "visible", timeout: 5_000 });
        if (!(await retryArea.isVisible())) fail("failed map-area search should remain retryable");
      }
    }
  }

  await context.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("Map area search browser QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Map area search browser QA passed: zoom is not a false dirty state; pan search commits a new center/URL with visible success and error feedback.");
