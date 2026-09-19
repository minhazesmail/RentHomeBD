import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.RELEASE_HARDENING_QA_BASE_URL ?? "http://127.0.0.1:3000";
const artifactRoot = path.join(process.cwd(), "artifacts", "release-hardening");
const failures = [];

const viewports = [
  { name: "320x568", width: 320, height: 568 },
  { name: "360x800", width: 360, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "960x900", width: 960, height: 900 },
];

const routes = [
  { name: "landing", path: "/" },
  { name: "homes", path: "/homes?area=Dhanmondi%2C%20Dhaka&tenant=family&radius=15" },
  { name: "login", path: "/login" },
];

function near(value, target, tolerance = 1) {
  return Math.abs(value - target) <= tolerance;
}

async function settle(page, pathName) {
  await page.goto(`${baseURL}${pathName}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(550);
}

async function inspect(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.05 && rect.width > 1 && rect.height > 1;
    };

    const controls = Array.from(document.querySelectorAll(
      'button, select, summary, input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea'
    )).filter(visible).map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute("type") ?? "",
        text: (element.textContent || element.getAttribute("aria-label") || element.getAttribute("name") || "").trim().slice(0, 60),
        width: rect.width,
        height: rect.height,
        fontSize: Number.parseFloat(style.fontSize),
      };
    });

    const productNav = document.querySelector("[data-product-navigation]");
    const productNavRect = productNav?.getBoundingClientRect() ?? null;
    const mobileTabs = document.querySelector("[data-mobile-primary-tabs]");
    const mobileTabsStyle = mobileTabs ? getComputedStyle(mobileTabs) : null;
    const mobileTabsRect = mobileTabs?.getBoundingClientRect() ?? null;
    const mobileTabLinks = Array.from(mobileTabs?.querySelectorAll("a") ?? []).filter(visible).map((element) => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width, label: element.textContent?.trim() ?? "" };
    });

    const languageButtons = Array.from(document.querySelectorAll("[data-language-switcher] button"))
      .filter(visible)
      .map((element) => element.getBoundingClientRect().height);
    const appearanceSummary = Array.from(document.querySelectorAll('summary[aria-haspopup="menu"]')).find(visible);
    const appearanceRect = appearanceSummary?.getBoundingClientRect() ?? null;

    const brandImage = document.querySelector("[data-product-navigation] .brand-logo img");
    const brandStyle = brandImage ? getComputedStyle(brandImage) : null;
    const rootStyle = getComputedStyle(document.documentElement);
    return {
      overflow: Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth
      ),
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
      controls,
      productNav: productNavRect ? {
        width: productNavRect.width,
        height: productNavRect.height,
        left: productNavRect.left,
        right: productNavRect.right,
      } : null,
      mobileTabs: mobileTabsRect && mobileTabsStyle ? {
        visible: mobileTabsStyle.display !== "none" && mobileTabsRect.height > 1,
        height: mobileTabsRect.height,
        bottomGap: window.innerHeight - mobileTabsRect.bottom,
      } : null,
      mobileTabLinks,
      languageButtons,
      appearanceHeight: appearanceRect?.height ?? 0,
      brand: brandImage && brandStyle ? {
        src: brandImage.getAttribute("src") ?? "",
        content: brandStyle.content,
      } : null,
      tokens: {
        topbar: rootStyle.getPropertyValue("--mobile-app-topbar-height").trim(),
        tabbar: rootStyle.getPropertyValue("--mobile-app-tabbar-height").trim(),
        hitTarget: rootStyle.getPropertyValue("--mobile-app-hit-target").trim(),
        controlHeight: rootStyle.getPropertyValue("--mobile-app-control-height").trim(),
      },
    };
  });
}

function validate(snapshot, route, viewport) {
  const label = `${route.name} ${viewport.name}`;
  if (snapshot.overflow > 2) failures.push(`${label}: horizontal overflow ${snapshot.overflow}px`);
  if (!near(snapshot.clientWidth, viewport.width, 2) || !near(snapshot.innerWidth, viewport.width, 2)) {
    failures.push(`${label}: viewport width drifted (client ${snapshot.clientWidth}, inner ${snapshot.innerWidth})`);
  }

  if (viewport.width <= 767) {
    const undersized = snapshot.controls.filter((control) => control.height < 43.5);
    if (undersized.length) {
      failures.push(`${label}: visible controls below 44px: ${undersized.slice(0, 4).map((item) => `${item.tag}:${item.text || item.type}=${item.height.toFixed(1)}`).join(", ")}`);
    }
    const smallTextInputs = snapshot.controls.filter((control) =>
      ["input", "select", "textarea"].includes(control.tag) && control.fontSize < 15.9
    );
    if (smallTextInputs.length) failures.push(`${label}: form text below 16px on phone`);
  }

  if (route.name === "homes" && snapshot.productNav) {
    if (snapshot.productNav.left < -1 || snapshot.productNav.right > viewport.width + 1) {
      failures.push(`${label}: product navigation escapes viewport`);
    }

    if (viewport.width <= 767) {
      if (!snapshot.mobileTabs?.visible) failures.push(`${label}: primary mobile tabs are not visible`);
      if ((snapshot.mobileTabLinks?.length ?? 0) !== 4) failures.push(`${label}: expected four renter primary tabs`);
      if (snapshot.mobileTabLinks.some((tab) => tab.height < 43.5)) failures.push(`${label}: primary tab hit target below 44px`);
      if (snapshot.productNav.height < 57.5) failures.push(`${label}: safe topbar collapsed below 58px`);
    } else if (viewport.width > 768 && snapshot.mobileTabs?.visible) {
      failures.push(`${label}: phone tab bar remains visible above the 768px boundary`);
    }

    if (viewport.width <= 1040) {
      if (snapshot.languageButtons.some((height) => height < 43.5)) failures.push(`${label}: language utility target below 44px`);
      if (snapshot.appearanceHeight > 0 && snapshot.appearanceHeight < 43.5) failures.push(`${label}: appearance utility target below 44px`);
    }

    if (viewport.width <= 820 && snapshot.brand?.content?.includes("nearbasha-logo-on-dark.svg")) {
      failures.push(`${label}: light mobile homes header is forcing the on-dark NearBasha logo`);
    }
  }
}

await fs.mkdir(artifactRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: "light",
      hasTouch: true,
    });

    await context.route(/https:\/\/[^/]+\.tile\.openstreetmap\.org\/.*\.png/, (route) => route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Gf8AAAAASUVORK5CYII=", "base64"),
    }));

    for (const route of routes) {
      const page = await context.newPage();
      await settle(page, route.path);

      const skip = page.locator(".skip-link");
      if (await skip.count()) {
        await skip.focus();
        await page.waitForTimeout(220);
        const skipState = await skip.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            top: rect.top,
            width: rect.width,
            height: rect.height,
            visibility: style.visibility,
            opacity: Number(style.opacity),
          };
        });
        if (skipState.top < -1 || skipState.width < 40 || skipState.height < 30 || skipState.visibility === "hidden" || skipState.opacity < 0.5) {
          failures.push(`${route.name} ${viewport.name}: focused skip link is not visibly usable`);
        }
      }

      const snapshot = await inspect(page);
      validate(snapshot, route, viewport);

      if ((viewport.width === 320 || viewport.width === 960) && (route.name === "landing" || route.name === "homes")) {
        await page.screenshot({
          path: path.join(artifactRoot, `${route.name}-${viewport.name}.png`),
          fullPage: true,
        });
      }
      await page.close();
    }

    await context.close();
  }

  const reducedContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  await settle(reducedPage, "/homes?area=Dhanmondi%2C%20Dhaka&tenant=family&radius=15");
  const reduced = await reducedPage.evaluate(() => ({
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    atmosphereAnimation: getComputedStyle(document.querySelector(".nb-shell-atmosphere")).animationName,
    tabTransition: getComputedStyle(document.querySelector("[data-mobile-primary-tabs] a")).transitionDuration,
  }));
  if (reduced.scrollBehavior !== "auto") failures.push("reduced-motion: root scroll behavior is not auto");
  if (reduced.atmosphereAnimation !== "none") failures.push("reduced-motion: shell atmosphere still animates");
  await reducedContext.close();

  const forcedContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
    hasTouch: true,
    forcedColors: "active",
  });
  const forcedPage = await forcedContext.newPage();
  await settle(forcedPage, "/homes?area=Dhanmondi%2C%20Dhaka&tenant=family&radius=15");
  const firstTab = forcedPage.locator("[data-mobile-primary-tabs] a").first();
  await firstTab.focus();
  const forced = await firstTab.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      borderStyle: style.borderStyle,
      borderWidth: style.borderWidth,
    };
  });
  if (forced.outlineStyle === "none" || forced.outlineWidth === "0px") failures.push("forced-colors: focused primary tab lost visible outline");
  if (forced.borderStyle === "none" || forced.borderWidth === "0px") failures.push("forced-colors: primary tab lost boundary");
  await forcedContext.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("Task 10 release browser QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Task 10 release browser QA passed across ${viewports.map((viewport) => viewport.name).join(", ")} plus reduced-motion and forced-colors scenarios.`);
