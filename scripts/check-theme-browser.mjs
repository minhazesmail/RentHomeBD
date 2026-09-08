import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.THEME_QA_BASE_URL ?? "http://127.0.0.1:3000";
const artifactRoot = path.join(process.cwd(), "artifacts", "theme-browser");

const routes = [
  {
    name: "landing",
    path: "/",
    highRisk: true,
    critical: [".landing-frame", ".landing-search-console", ".landing-how-panel", ".landing-faq-editorial"],
  },
  {
    name: "homes",
    path: "/homes",
    highRisk: true,
    critical: [".homes-page", ".renter-map-panel", "[data-product-navigation]"],
    desktopCritical: [".renter-search-sidebar", ".renter-filter-panel"],
    mobileCritical: ["[data-mobile-view]"],
  },
  {
    name: "login",
    path: "/login",
    critical: [".auth-shell", ".auth-card"],
  },
  {
    name: "about",
    path: "/about",
    critical: [".info-page", "[data-marketing-navigation]"],
  },
  {
    name: "contact",
    path: "/contact",
    critical: [".info-page", "[data-marketing-navigation]"],
  },
  {
    name: "privacy",
    path: "/privacy",
    critical: [".info-page", "[data-marketing-navigation]", ".info-legal-body"],
  },
  {
    name: "terms",
    path: "/terms",
    critical: [".info-page", "[data-marketing-navigation]", ".info-legal-body"],
  },
];

const scenarios = [
  { name: "light", preference: "light", colorScheme: "dark", expected: "light" },
  { name: "dark", preference: "dark", colorScheme: "light", expected: "dark" },
  { name: "system-light", preference: "system", colorScheme: "light", expected: "light" },
  { name: "system-dark", preference: "system", colorScheme: "dark", expected: "dark" },
];

const viewports = [
  { name: "desktop", width: 1440, height: 1000, allRoutes: true },
  { name: "laptop", width: 1280, height: 900 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 900 },
  { name: "mobile", width: 390, height: 844, allRoutes: true },
];

function relativeLuminance([r, g, b]) {
  const linear = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRgb(value) {
  const match = value?.match(/rgba?\((\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)(?:[, /]+([\d.]+))?\)/);
  if (!match) return null;
  const alpha = match[4] == null ? 1 : Number(match[4]);
  if (alpha < 0.92) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function luminanceFromCss(value) {
  const rgb = parseRgb(value);
  return rgb ? relativeLuminance(rgb) : null;
}

async function inspectPage(page, critical, scenario) {
  return page.evaluate(({ critical, expected, preference }) => {
    const root = document.documentElement;
    const body = document.body;
    const rootStyle = getComputedStyle(root);
    const bodyStyle = getComputedStyle(body);

    const criticalState = critical.map((selector) => {
      const element = document.querySelector(selector);
      if (!element) return { selector, exists: false };
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        selector,
        exists: true,
        display: style.display,
        visibility: style.visibility,
        opacity: Number(style.opacity),
        width: rect.width,
        height: rect.height,
        color: style.color,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderColor: style.borderColor,
      };
    });

    const appearanceDetails = Array.from(document.querySelectorAll("details"))
      .find((details) => details.querySelector('summary[aria-haspopup="menu"]'));
    const appearanceMenu = appearanceDetails?.querySelector('[role="menu"]');
    const appearanceMenuStyle = appearanceMenu ? getComputedStyle(appearanceMenu) : null;
    const appearanceMenuRect = appearanceMenu?.getBoundingClientRect();
    const appearanceDisclosure = appearanceDetails ? {
      exists: true,
      open: appearanceDetails.open,
      menuVisible: Boolean(
        appearanceMenu &&
        appearanceMenuStyle &&
        appearanceMenuStyle.display !== "none" &&
        appearanceMenuStyle.visibility !== "hidden" &&
        Number(appearanceMenuStyle.opacity) > 0.2 &&
        appearanceMenuRect &&
        appearanceMenuRect.width > 2 &&
        appearanceMenuRect.height > 2
      ),
    } : { exists: false, open: false, menuVisible: false };

    const textSamples = Array.from(document.querySelectorAll("h1, h2, h3, p, button, a, label, input, select, textarea"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const text = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
          ? element.value || element.placeholder
          : element.textContent;
        return Boolean(text?.trim()) && rect.width > 2 && rect.height > 2 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.2;
      })
      .slice(0, 320)
      .map((element) => {
        const style = getComputedStyle(element);
        let backgroundNode = element;
        let background = style.backgroundColor;
        let complexBackground = style.backgroundImage !== "none";

        while (backgroundNode.parentElement && (background === "rgba(0, 0, 0, 0)" || background === "transparent")) {
          backgroundNode = backgroundNode.parentElement;
          const backgroundStyle = getComputedStyle(backgroundNode);
          background = backgroundStyle.backgroundColor;
          if (backgroundStyle.backgroundImage !== "none") complexBackground = true;
        }

        return {
          tag: element.tagName.toLowerCase(),
          text: (element.textContent || element.getAttribute("placeholder") || "").trim().slice(0, 80),
          color: style.color,
          background,
          complexBackground,
          fontSize: Number.parseFloat(style.fontSize),
          fontWeight: Number.parseInt(style.fontWeight, 10) || 400,
        };
      });

    function surface(selector) {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        selector,
        color: style.color,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        width: rect.width,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      };
    }

    const landingShell = document.querySelector("main.landing-shell");
    const landingStyle = landingShell ? getComputedStyle(landingShell) : null;
    const mapTile = document.querySelector(".renter-map-canvas .leaflet-tile");
    const productNav = document.querySelector("[data-product-navigation]");
    const productNavRect = productNav?.getBoundingClientRect();

    return {
      preference: root.dataset.theme,
      resolved: root.dataset.resolvedTheme,
      ready: root.dataset.themeReady,
      expected,
      requestedPreference: preference,
      tokens: {
        background: rootStyle.getPropertyValue("--background").trim(),
        foreground: rootStyle.getPropertyValue("--foreground").trim(),
        surface: rootStyle.getPropertyValue("--surface-solid").trim(),
        ink: rootStyle.getPropertyValue("--ink").trim(),
        accentContrast: rootStyle.getPropertyValue("--accent-contrast").trim(),
        accentSoftStrong: rootStyle.getPropertyValue("--accent-soft-strong").trim(),
      },
      landingTokens: landingStyle ? {
        canvas: landingStyle.getPropertyValue("--landing-canvas").trim(),
        contentBackground: landingStyle.getPropertyValue("--landing-content-background").trim(),
        text: landingStyle.getPropertyValue("--landing-text").trim(),
      } : null,
      body: {
        color: bodyStyle.color,
        backgroundColor: bodyStyle.backgroundColor,
      },
      appearanceDisclosure,
      criticalState,
      textSamples,
      surfaces: {
        landingHero: surface(".landing-hero-reference"),
        landingSearch: surface(".landing-search-console"),
        landingContent: surface(".landing-how"),
        landingFaq: surface(".landing-faq-editorial"),
        landingFaqRailTitle: surface(".landing-faq-rail strong"),
        landingMapRail: surface(".landing-map-rail"),
        landingMapEmpty: surface(".landing-map-preview [class*='emptyState']"),
        homesSidebar: surface(".renter-search-sidebar"),
        homesMap: surface(".renter-map-canvas"),
      },
      mapTileSrc: mapTile instanceof HTMLImageElement ? mapTile.currentSrc || mapTile.src : null,
      overflow: {
        document: root.scrollWidth - root.clientWidth,
        body: body.scrollWidth - body.clientWidth,
        productNavRight: productNavRect ? productNavRect.right - window.innerWidth : 0,
        productNavLeft: productNavRect ? -productNavRect.left : 0,
      },
    };
  }, { critical, expected: scenario.expected, preference: scenario.preference });
}

function rectanglesOverlap(a, b) {
  if (!a || !b || a.width <= 2 || a.height <= 2 || b.width <= 2 || b.height <= 2) return false;
  return Math.min(a.right, b.right) > Math.max(a.left, b.left)
    && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
}

function validateLandingSurfaceRoles(snapshot, label, failures) {
  const { surfaces, landingTokens, resolved } = snapshot;
  if (!surfaces.landingSearch || !surfaces.landingContent || !surfaces.landingFaq || !surfaces.landingMapRail) return;

  const searchLum = luminanceFromCss(surfaces.landingSearch.backgroundColor);
  const contentLum = luminanceFromCss(surfaces.landingContent.backgroundColor);
  const mapRailLum = luminanceFromCss(surfaces.landingMapRail.backgroundColor);
  const faqRailTextLum = luminanceFromCss(surfaces.landingFaqRailTitle?.color);

  if (resolved === "dark") {
    if (!landingTokens?.canvas || !landingTokens?.contentBackground || !landingTokens?.text) {
      failures.push(`${label}: landing dark semantic palette is incomplete`);
    }
    for (const [name, value] of [["search console", searchLum], ["editorial content", contentLum], ["map rail", mapRailLum]]) {
      if (value != null && value > 0.22) failures.push(`${label}: ${name} is still a light surface in Dark mode (luminance ${value.toFixed(3)})`);
    }
    if (faqRailTextLum != null && faqRailTextLum < 0.55) {
      failures.push(`${label}: FAQ rail heading is not using a light dark-surface foreground`);
    }
  } else {
    for (const [name, value] of [["search console", searchLum], ["editorial content", contentLum]]) {
      if (value != null && value < 0.60) failures.push(`${label}: ${name} drifted away from the established Light surface`);
    }
  }

  if (rectanglesOverlap(surfaces.landingMapEmpty, surfaces.landingMapRail)) {
    failures.push(`${label}: landing map empty-state copy overlaps the discovery rail`);
  }
}

function validateHomesSurfaceRoles(snapshot, label, failures, viewport) {
  if (snapshot.resolved === "dark") {
    if (snapshot.mapTileSrc && !snapshot.mapTileSrc.includes("cartocdn.com/dark_all")) {
      failures.push(`${label}: Dark homes map is not using the dark CARTO basemap`);
    }
    const sidebarLum = luminanceFromCss(snapshot.surfaces.homesSidebar?.backgroundColor);
    if (sidebarLum != null && sidebarLum > 0.22) failures.push(`${label}: renter sidebar is still a light surface in Dark mode`);
  } else if (snapshot.mapTileSrc && !snapshot.mapTileSrc.includes("tile.openstreetmap.org")) {
    failures.push(`${label}: Light homes map is not using the standard OpenStreetMap basemap`);
  }

  if (viewport.width <= 1040) {
    if (snapshot.overflow.document > 2 || snapshot.overflow.body > 2) {
      failures.push(`${label}: page has horizontal overflow at ${viewport.width}px`);
    }
    if (snapshot.overflow.productNavRight > 2 || snapshot.overflow.productNavLeft > 2) {
      failures.push(`${label}: product navigation clips outside the viewport at ${viewport.width}px`);
    }
  }
}

async function captureScreenshot(page, label) {
  await page.screenshot({ path: path.join(artifactRoot, `${label}.png`), fullPage: true });
}

async function main() {
  await fs.mkdir(artifactRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const snapshots = [];

  try {
    for (const viewport of viewports) {
      for (const scenario of scenarios) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          colorScheme: scenario.colorScheme,
          reducedMotion: "reduce",
        });
        await context.addCookies([{
          name: "nb_theme",
          value: scenario.preference,
          url: baseURL,
          sameSite: "Lax",
        }]);

        const page = await context.newPage();

        for (const route of routes) {
          if (!viewport.allRoutes && !route.highRisk) continue;

          const label = `${route.name}-${scenario.name}-${viewport.name}`;
          const failureStart = failures.length;
          const critical = [
            ...route.critical,
            ...(viewport.width >= 900 ? (route.desktopCritical ?? []) : (route.mobileCritical ?? [])),
          ];

          try {
            const response = await page.goto(`${baseURL}${route.path}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
            if (!response || response.status() >= 400) throw new Error(`HTTP ${response?.status() ?? "no response"}`);
            await page.waitForFunction(() => document.documentElement.dataset.themeReady === "true", null, { timeout: 8_000 });

            if (route.name === "homes") {
              await page.waitForSelector(".renter-map-canvas", { timeout: 8_000 });
              await page.waitForSelector(".renter-map-canvas .leaflet-tile", { timeout: 8_000 }).catch(() => {});
            }
            if (route.name === "landing") {
              await page.locator(".landing-faq-editorial").scrollIntoViewIfNeeded().catch(() => {});
            }
            await page.waitForTimeout(180);

            const snapshot = await inspectPage(page, critical, scenario);
            snapshots.push({ label, viewport, ...snapshot });

            if (snapshot.preference !== scenario.preference) failures.push(`${label}: data-theme=${snapshot.preference}, expected ${scenario.preference}`);
            if (snapshot.resolved !== scenario.expected) failures.push(`${label}: data-resolved-theme=${snapshot.resolved}, expected ${scenario.expected}`);
            if (snapshot.ready !== "true") failures.push(`${label}: prepaint theme bootstrap did not mark themeReady`);

            for (const [token, value] of Object.entries(snapshot.tokens)) {
              if (!value) failures.push(`${label}: semantic token ${token} is unresolved`);
            }

            if (snapshot.appearanceDisclosure.exists && !snapshot.appearanceDisclosure.open && snapshot.appearanceDisclosure.menuVisible) {
              failures.push(`${label}: closed appearance menu is still visibly rendered`);
            }

            for (const criticalSurface of snapshot.criticalState) {
              if (!criticalSurface.exists) {
                failures.push(`${label}: missing critical surface ${criticalSurface.selector}`);
                continue;
              }
              if (criticalSurface.display === "none" || criticalSurface.visibility === "hidden" || criticalSurface.opacity < 0.2 || criticalSurface.width < 2 || criticalSurface.height < 2) {
                failures.push(`${label}: critical surface ${criticalSurface.selector} is effectively invisible`);
              }
            }

            for (const sample of snapshot.textSamples) {
              if (sample.complexBackground) continue;
              const foreground = parseRgb(sample.color);
              const background = parseRgb(sample.background);
              if (!foreground || !background) continue;
              const ratio = contrastRatio(foreground, background);
              const large = sample.fontSize >= 24 || (sample.fontSize >= 18.66 && sample.fontWeight >= 700);
              const minimum = large ? 3 : 4.5;
              if (ratio + 0.02 < minimum) {
                failures.push(`${label}: low contrast ${ratio.toFixed(2)}:1 on ${sample.tag} “${sample.text}” (${sample.color} on ${sample.background})`);
              }
            }

            if (route.name === "landing") validateLandingSurfaceRoles(snapshot, label, failures);
            if (route.name === "homes") validateHomesSurfaceRoles(snapshot, label, failures, viewport);

            /* Keep successful visual artifacts for the highest-risk routes in
               explicit Light and Dark so a green CI run remains inspectable. */
            if (route.highRisk && (scenario.name === "light" || scenario.name === "dark")) {
              await captureScreenshot(page, label);
            } else if (failures.length > failureStart) {
              await captureScreenshot(page, label);
            }
          } catch (error) {
            failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
            try { await captureScreenshot(page, label); } catch { /* navigation may have failed before paint */ }
          }
        }

        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  await fs.writeFile(path.join(artifactRoot, "computed-theme-snapshots.json"), `${JSON.stringify(snapshots, null, 2)}\n`);

  if (failures.length) {
    console.error("Rendered theme QA failed:\n");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Rendered theme QA passed (${snapshots.length} route/theme/viewport snapshots).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
