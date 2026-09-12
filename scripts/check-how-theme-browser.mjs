import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.THEME_QA_BASE_URL ?? "http://127.0.0.1:3000";
const artifactRoot = path.join(process.cwd(), "artifacts", "theme-browser", "how-it-works");

const scenarios = [
  { name: "dark", preference: "dark", colorScheme: "light" },
  { name: "system-dark", preference: "system", colorScheme: "dark" },
];

const locales = ["en", "bn"];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet-landscape", width: 1024, height: 900 },
  { name: "tablet", width: 768, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

function parseRgb(value) {
  const match = value?.match(/rgba?\((\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)(?:[, /]+([\d.]+))?\)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function luminance([r, g, b]) {
  const linear = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function cssLuminance(value) {
  const rgb = parseRgb(value);
  return rgb ? luminance(rgb) : null;
}

async function inspectJourney(page) {
  return page.evaluate(() => {
    function sample(selector) {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        selector,
        color: style.color,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        display: style.display,
        visibility: style.visibility,
        opacity: Number(style.opacity),
        width: rect.width,
        height: rect.height,
        text: element.textContent?.trim().slice(0, 160) ?? "",
      };
    }

    const root = document.documentElement;
    const shell = document.querySelector(".landing-how-tabs-shell");
    const section = document.querySelector(".landing-how");
    const shellStyle = shell ? getComputedStyle(shell) : null;

    return {
      theme: root.dataset.theme,
      resolved: root.dataset.resolvedTheme,
      locale: root.lang,
      persona: shell?.classList.contains("owner") ? "owner" : "renter",
      tokens: shellStyle ? {
        shell: shellStyle.getPropertyValue("--journey-shell-color").trim(),
        controls: shellStyle.getPropertyValue("--journey-control-color").trim(),
        panel: shellStyle.getPropertyValue("--journey-panel-color").trim(),
        text: shellStyle.getPropertyValue("--journey-text").trim(),
        muted: shellStyle.getPropertyValue("--journey-muted").trim(),
        activeForeground: shellStyle.getPropertyValue("--journey-active-foreground").trim(),
      } : null,
      surfaces: {
        shell: sample(".landing-how-tabs-shell"),
        controls: sample(".landing-how-controls"),
        panel: sample(".landing-how-panel"),
        heading: sample(".landing-how-panel-heading h3"),
        kicker: sample(".landing-persona-kicker"),
        activeTab: sample('.landing-persona-tabs button[aria-selected="true"]'),
        inactiveTab: sample('.landing-persona-tabs button[aria-selected="false"]'),
        action: sample(".landing-how-primary-link"),
        stepTitle: sample(".landing-step-copy strong"),
        stepCopy: sample(".landing-step-copy p"),
        stepMeta: sample(".landing-step-meta"),
        outcome: sample(".landing-how-outcome"),
      },
      overflow: section ? section.scrollWidth - section.clientWidth : null,
    };
  });
}

function validateSnapshot(snapshot, label, failures) {
  if (snapshot.resolved !== "dark") failures.push(`${label}: resolved theme is ${snapshot.resolved}, expected dark`);
  if (!snapshot.tokens?.shell || !snapshot.tokens.controls || !snapshot.tokens.panel || !snapshot.tokens.text) {
    failures.push(`${label}: journey semantic surface contract is incomplete`);
  }

  for (const name of ["shell", "controls", "panel"]) {
    const surface = snapshot.surfaces[name];
    if (!surface) {
      failures.push(`${label}: missing ${name} surface`);
      continue;
    }
    if (surface.display === "none" || surface.visibility === "hidden" || surface.opacity < 0.2 || surface.width < 2 || surface.height < 2) {
      failures.push(`${label}: ${name} surface is effectively invisible`);
    }
    const lum = cssLuminance(surface.backgroundColor);
    if (lum == null) failures.push(`${label}: ${name} surface does not expose a testable solid background`);
    else if (lum > 0.22) failures.push(`${label}: ${name} is still a light surface in Dark mode (luminance ${lum.toFixed(3)})`);
  }

  const panelBackground = parseRgb(snapshot.surfaces.panel?.backgroundColor);
  for (const [name, minimum] of [["heading", 4.5], ["stepTitle", 4.5], ["stepCopy", 4.5], ["outcome", 4.5]]) {
    const sample = snapshot.surfaces[name];
    const foreground = parseRgb(sample?.color);
    if (!sample || !foreground || !panelBackground) continue;
    const ratio = contrastRatio(foreground, panelBackground);
    if (ratio < minimum) failures.push(`${label}: ${name} contrast is ${ratio.toFixed(2)}:1, expected at least ${minimum}:1`);
  }

  for (const name of ["activeTab", "action"]) {
    const sample = snapshot.surfaces[name];
    const foreground = parseRgb(sample?.color);
    const background = parseRgb(sample?.backgroundColor);
    if (!sample || !foreground || !background) {
      failures.push(`${label}: ${name} does not expose testable foreground/background colors`);
      continue;
    }
    const ratio = contrastRatio(foreground, background);
    if (ratio < 4.5) failures.push(`${label}: ${name} contrast is ${ratio.toFixed(2)}:1, expected at least 4.5:1`);
  }

  if (!snapshot.surfaces.heading?.text) failures.push(`${label}: journey heading is empty`);
  if (snapshot.overflow != null && snapshot.overflow > 2) failures.push(`${label}: how-it-works section has ${snapshot.overflow}px horizontal overflow`);
}

async function captureSection(page, label) {
  const section = page.locator(".landing-how");
  await section.screenshot({ path: path.join(artifactRoot, `${label}.png`) });
}

async function selectPersona(page, persona) {
  const owner = persona === "owner";
  await page.locator(owner ? "#landing-persona-tab-owner" : "#landing-persona-tab-renter").click();
  await page.waitForFunction(
    (shouldBeOwner) => document.querySelector(".landing-how-tabs-shell")?.classList.contains("owner") === shouldBeOwner,
    owner,
  );
}

async function main() {
  await fs.mkdir(artifactRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const snapshots = [];

  try {
    // Locale and theme preference are request inputs, so each combination gets
    // one real server navigation. Viewport is purely responsive state: resize the
    // same hydrated page instead of repeatedly re-rendering the dynamic landing
    // route. This preserves every breakpoint/persona assertion while keeping the
    // specialized suite from exhausting the server after the larger theme matrix.
    for (const scenario of scenarios) {
      for (const locale of locales) {
        const context = await browser.newContext({
          viewport: { width: viewports[0].width, height: viewports[0].height },
          colorScheme: scenario.colorScheme,
          reducedMotion: "reduce",
        });

        await context.addCookies([
          { name: "nb_theme", value: scenario.preference, url: baseURL, sameSite: "Lax" },
          { name: "nb_locale", value: locale, url: baseURL, sameSite: "Lax" },
        ]);

        const page = await context.newPage();
        const requestPrefix = `how-${locale}-${scenario.name}`;

        try {
          const response = await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
          if (!response || response.status() >= 400) throw new Error(`HTTP ${response?.status() ?? "no response"}`);
          await page.waitForFunction(() => document.documentElement.dataset.themeReady === "true", null, { timeout: 8_000 });

          for (const viewport of viewports) {
            const prefix = `${requestPrefix}-${viewport.name}`;
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await selectPersona(page, "renter");
            await page.locator(".landing-how").scrollIntoViewIfNeeded();
            await page.waitForTimeout(120);

            const renter = await inspectJourney(page);
            snapshots.push({ label: `${prefix}-renter`, viewport, scenario: scenario.name, locale, ...renter });
            validateSnapshot(renter, `${prefix}-renter`, failures);
            await captureSection(page, `${prefix}-renter`);

            await selectPersona(page, "owner");
            await page.waitForTimeout(80);

            const owner = await inspectJourney(page);
            snapshots.push({ label: `${prefix}-owner`, viewport, scenario: scenario.name, locale, ...owner });
            validateSnapshot(owner, `${prefix}-owner`, failures);
            if (owner.persona !== "owner") failures.push(`${prefix}-owner: owner interaction did not activate owner state`);
            await captureSection(page, `${prefix}-owner`);
          }
        } catch (error) {
          failures.push(`${requestPrefix}: ${error instanceof Error ? error.message : String(error)}`);
          try { await captureSection(page, `${requestPrefix}-failure`); } catch { /* page may not have rendered */ }
        }

        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  await fs.writeFile(path.join(artifactRoot, "computed-how-theme-snapshots.json"), `${JSON.stringify(snapshots, null, 2)}\n`);

  if (failures.length) {
    console.error("How-it-works theme QA failed:\n");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`How-it-works theme QA passed (${snapshots.length} renter/owner snapshots).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
