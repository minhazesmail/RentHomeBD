import { chromium } from "playwright";

const baseURL = process.env.THEME_QA_BASE_URL ?? "http://127.0.0.1:3000";
const scenarios = ["light", "dark"];
const viewports = [
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
      };
    }

    const shell = document.querySelector(".renter-search-shell");
    const shellStyle = shell ? getComputedStyle(shell) : null;
    const mobileFooter = document.querySelector(".mobile-filter-footer");
    const mobileFooterStyle = mobileFooter ? getComputedStyle(mobileFooter) : null;

    return {
      shell: rect(".renter-search-shell"),
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

  if (!approxEqual(toolbar.left, shell.left) || !approxEqual(toolbar.right, shell.right) || toolbar.width < viewport.width * 0.94) {
    failures.push(`${label}: toolbar does not span the full renter search shell`);
  }
  if (!approxEqual(workspace.left, shell.left) || !approxEqual(workspace.right, shell.right) || workspace.width < viewport.width * 0.94) {
    failures.push(`${label}: results/map workspace does not span the full renter search shell`);
  }
  if (workspace.top < toolbar.bottom - 2) {
    failures.push(`${label}: workspace starts beside/under the toolbar instead of below it`);
  }

  if (sidebar.width < 400 || sidebar.width > 490) {
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
  if (Number.parseFloat(toolbar.borderRadius) > 0.5) {
    failures.push(`${label}: legacy filter-card radius leaked into the toolbar (${toolbar.borderRadius})`);
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

  console.log("Map workspace browser geometry QA passed: toolbar and results/map workspace retain the intended desktop stack.");
}

await main();
