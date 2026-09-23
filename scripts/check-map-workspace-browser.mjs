import { chromium } from "playwright";

const baseURL = process.env.THEME_QA_BASE_URL ?? "http://127.0.0.1:3000";
const scenarios = ["light", "dark"];
const viewports = [
  { name: "screenshot-desktop", width: 1348, height: 602 },
  { name: "reported-desktop", width: 1272, height: 638 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "compact-desktop", width: 1024, height: 768 },
];

function approxEqual(a, b, tolerance = 3) {
  return Math.abs(a - b) <= tolerance;
}

async function inspect(page) {
  return page.evaluate(() => {
    function rect(selector) {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
        display: style.display,
        marginTop: style.marginTop,
        borderRadius: style.borderRadius,
        gridRowStart: style.gridRowStart,
        gridRowEnd: style.gridRowEnd,
      };
    }

    const shell = document.querySelector(".renter-search-shell");
    const shellStyle = shell ? getComputedStyle(shell) : null;
    const mobileFooter = document.querySelector(".mobile-filter-footer");
    const mobileFooterStyle = mobileFooter ? getComputedStyle(mobileFooter) : null;

    return {
      shell: rect(".renter-search-shell"),
      zoom: rect(".renter-map-panel .leaflet-control-zoom"),
      resultsHeader: rect(".renter-results-header"),
      toolbar: rect(".renter-search-toolbar"),
      workspace: rect(".renter-workspace"),
      sidebar: rect(".renter-search-sidebar"),
      mapPanel: rect(".renter-map-panel"),
      shellGridColumns: shellStyle?.gridTemplateColumns ?? null,
      shellGridRows: shellStyle?.gridTemplateRows ?? null,
      mobileFooterDisplay: mobileFooterStyle?.display ?? null,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

function validate(snapshot, viewport, scenario) {
  const failures = [];
  const label = `${scenario}/${viewport.name}`;
  const { shell, toolbar, workspace, sidebar, mapPanel } = snapshot;

  for (const [name, value] of Object.entries({ shell, toolbar, workspace, sidebar, mapPanel })) {
    if (!value || value.width < 2 || value.height < 2) failures.push(`${label}: ${name} is missing or collapsed`);
  }
  if (failures.length) return failures;

  const columnTracks = snapshot.shellGridColumns?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (columnTracks.length !== 1) {
    failures.push(`${label}: renter-search-shell still resolves to ${columnTracks.length} desktop columns (${snapshot.shellGridColumns})`);
  }

  // The desktop redesign uses a deliberate 28px inset inside the full-width shell.
  const contentLeft = shell.left + 28;
  const contentRight = shell.right - 28;
  if (!approxEqual(toolbar.left, contentLeft) || !approxEqual(toolbar.right, contentRight)) {
    failures.push(`${label}: toolbar does not span the inset search content`);
  }
  if (!approxEqual(workspace.left, contentLeft) || !approxEqual(workspace.right, contentRight)) {
    failures.push(`${label}: results/map workspace does not span the inset search content`);
  }

  /* The toolbar is sticky in the legacy implementation. Grid-row assertions
     alone missed its visual displacement over the workspace. Check both. */
  if (!approxEqual(toolbar.top, shell.top + 20)) {
    failures.push(`${label}: toolbar is displaced below the search shell`);
  }
  if (!approxEqual(toolbar.bottom, workspace.top)) {
    failures.push(`${label}: toolbar overlaps or leaves a gap above the workspace`);
  }
  if (!approxEqual(workspace.bottom, shell.bottom - 28)) {
    failures.push(`${label}: workspace does not fill the remaining shell height`);
  }
  if (!snapshot.resultsHeader || snapshot.resultsHeader.top < toolbar.bottom - 2) {
    failures.push(`${label}: results header is hidden behind the toolbar`);
  }
  if (!snapshot.zoom || snapshot.zoom.top < mapPanel.top || snapshot.zoom.bottom > mapPanel.bottom) {
    failures.push(`${label}: map zoom controls escape the map panel`);
  }
  if (toolbar.gridRowStart !== "1") {
    failures.push(`${label}: toolbar is not pinned to desktop grid row 1 (${toolbar.gridRowStart})`);
  }
  if (workspace.gridRowStart !== "2") {
    failures.push(`${label}: results/map workspace is not pinned to desktop grid row 2 (${workspace.gridRowStart})`);
  }

  if (sidebar.width < 340 || sidebar.width > 391) {
    failures.push(`${label}: desktop results pane width drifted to ${sidebar.width.toFixed(1)}px`);
  }
  if (mapPanel.left < sidebar.right - 2 || mapPanel.width < 300) {
    failures.push(`${label}: map panel no longer sits to the right of the results pane`);
  }

  if (snapshot.mobileFooterDisplay !== "none") {
    failures.push(`${label}: mobile filter footer leaked into the desktop layout`);
  }
  if (Number.parseFloat(toolbar.marginTop) > 0.5) {
    failures.push(`${label}: legacy filter-card top margin leaked into the toolbar (${toolbar.marginTop})`);
  }
  if (toolbar.borderRadius !== "12px 12px 0px 0px") {
    failures.push(`${label}: toolbar must round only the top of the joined workspace (${toolbar.borderRadius})`);
  }
  if (snapshot.documentOverflow > 2) {
    failures.push(`${label}: document has ${snapshot.documentOverflow}px horizontal overflow`);
  }

  return failures;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const failures = [];

  try {
    for (const viewport of viewports) {
      for (const scenario of scenarios) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
        await context.addCookies([{
          name: "nb_theme",
          value: scenario,
          url: baseURL,
          sameSite: "Lax",
        }]);
        const page = await context.newPage();
        const response = await page.goto(`${baseURL}/homes`, { waitUntil: "domcontentloaded", timeout: 30_000 });
        if (!response || response.status() >= 400) {
          failures.push(`${scenario}/${viewport.name}: /homes returned HTTP ${response?.status() ?? "no response"}`);
          await context.close();
          continue;
        }

        await page.waitForFunction(() => document.documentElement.dataset.themeReady === "true", null, { timeout: 8_000 });
        await page.waitForSelector(".renter-search-toolbar", { timeout: 8_000 });
        await page.waitForSelector(".renter-workspace", { timeout: 8_000 });
        await page.waitForSelector(".renter-map-panel", { timeout: 8_000 });
        await page.waitForSelector(".renter-map-panel .leaflet-control-zoom", { timeout: 8_000 });
        await page.waitForTimeout(250);

        const snapshot = await inspect(page);
        failures.push(...validate(snapshot, viewport, scenario));
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error("Map workspace browser geometry QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
    process.exit(1);
  }

  console.log("Map workspace browser geometry QA passed: toolbar and results/map workspace retain the intended desktop grid stack.");
}

await main();
