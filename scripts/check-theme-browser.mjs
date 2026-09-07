import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.THEME_QA_BASE_URL ?? "http://127.0.0.1:3000";
const artifactRoot = path.join(process.cwd(), "artifacts", "theme-browser");

const routes = [
  {
    name: "landing",
    path: "/",
    critical: [".landing-frame", ".landing-search-console", ".landing-how-panel"],
  },
  {
    name: "homes",
    path: "/homes",
    critical: [".homes-page", ".renter-map-panel"],
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
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
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
      .slice(0, 220)
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
      body: {
        color: bodyStyle.color,
        backgroundColor: bodyStyle.backgroundColor,
      },
      appearanceDisclosure,
      criticalState,
      textSamples,
    };
  }, { critical, expected: scenario.expected, preference: scenario.preference });
}

async function captureFailure(page, label) {
  try {
    await page.screenshot({ path: path.join(artifactRoot, `${label}.png`), fullPage: true });
  } catch {
    // A failed navigation can also make screenshots unavailable.
  }
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
          const label = `${route.name}-${scenario.name}-${viewport.name}`;
          const failureStart = failures.length;
          const critical = [
            ...route.critical,
            ...(viewport.name === "desktop" ? (route.desktopCritical ?? []) : (route.mobileCritical ?? [])),
          ];

          try {
            const response = await page.goto(`${baseURL}${route.path}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
            if (!response || response.status() >= 400) {
              throw new Error(`HTTP ${response?.status() ?? "no response"}`);
            }
            await page.waitForFunction(() => document.documentElement.dataset.themeReady === "true", null, { timeout: 8_000 });
            await page.waitForTimeout(160);

            const snapshot = await inspectPage(page, critical, scenario);
            snapshots.push({ label, ...snapshot });

            if (snapshot.preference !== scenario.preference) {
              failures.push(`${label}: data-theme=${snapshot.preference}, expected ${scenario.preference}`);
            }
            if (snapshot.resolved !== scenario.expected) {
              failures.push(`${label}: data-resolved-theme=${snapshot.resolved}, expected ${scenario.expected}`);
            }
            if (snapshot.ready !== "true") {
              failures.push(`${label}: prepaint theme bootstrap did not mark themeReady`);
            }

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

            if (failures.length > failureStart) await captureFailure(page, label);
          } catch (error) {
            failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
            await captureFailure(page, label);
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
