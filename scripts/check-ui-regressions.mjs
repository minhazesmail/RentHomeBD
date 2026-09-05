import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: file is missing`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(relativePath, text, label = text) {
  const source = read(relativePath);
  if (!source.includes(text)) failures.push(`${relativePath}: missing ${label}`);
}

function requireRegex(relativePath, regex, label) {
  const source = read(relativePath);
  if (!regex.test(source)) failures.push(`${relativePath}: missing ${label}`);
}

function collectFiles(directory, predicate) {
  const output = [];
  if (!fs.existsSync(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...collectFiles(fullPath, predicate));
    else if (predicate(fullPath)) output.push(fullPath);
  }
  return output;
}

// Shared text-spacing contract: keep the tokens and prevent helper/status copy
// from drifting back to legacy negative-margin attachment patterns.
const tokens = read("src/app/tokens.css");
for (const token of [
  "--leading-helper",
  "--text-gap-tight",
  "--text-gap-control",
  "--text-gap-action",
  "--text-gap-related",
  "--text-gap-block",
]) {
  if (!tokens.includes(token)) failures.push(`src/app/tokens.css: missing ${token}`);
}

const spacingFiles = collectFiles(path.join(root, "src/app"), (file) => file.endsWith("spacing-fixes.css") || file.endsWith("spacing-normalization.css"));
const protectedTextSelectors = /\.(?:form-hint|success-message|auth-message|contact-note|contact-error)\b/;
for (const file of spacingFiles) {
  const source = fs.readFileSync(file, "utf8");
  const blocks = source.matchAll(/([^{}]+)\{([^{}]*)\}/g);
  for (const match of blocks) {
    const selector = match[1];
    const body = match[2];
    if (!protectedTextSelectors.test(selector)) continue;
    if (/margin(?:-top)?\s*:\s*-\s*(?:\d|\.)/i.test(body)) {
      failures.push(`${path.relative(root, file)}: protected helper/status copy uses a negative margin in ${selector.trim()}`);
    }
  }
}

// Recovery/error states must use one branded component instead of route-specific
// dashboard or one-off cards.
for (const route of ["src/app/error.tsx", "src/app/not-found.tsx", "src/app/auth/error/page.tsx"]) {
  requireText(route, "RecoveryState", "shared RecoveryState");
}
requireText("src/components/recovery-state.module.css", "@media (max-width: 560px)", "mobile recovery breakpoint");
requireText("src/components/recovery-state.module.css", "focus-visible", "visible keyboard focus treatment");

// Product and marketing navigation must remain horizontally safe at narrow widths.
requireText("src/components/product-navigation.module.css", "@media (max-width: 860px)", "tablet product-nav breakpoint");
requireText("src/components/product-navigation.module.css", "@media (max-width: 480px)", "phone product-nav breakpoint");
requireText("src/components/product-navigation.module.css", "overflow-x: auto", "horizontal product-nav overflow handling");
requireText("src/components/marketing-navigation.module.css", "@media (max-width: 920px)", "tablet marketing-nav breakpoint");
requireText("src/components/marketing-navigation.module.css", "@media (max-width: 600px)", "phone marketing-nav breakpoint");
requireText("src/components/marketing-navigation.module.css", "overflow-x: auto", "horizontal marketing-nav overflow handling");

// Core mobile interaction models from the redesign program.
requireText("src/components/mobile-map-model.tsx", "data-mobile-view", "explicit mobile map/list state");
requireText("src/components/mobile-map-model.tsx", "aria-pressed", "map/list pressed-state semantics");
requireText("src/components/mobile-map-model.tsx", "aria-expanded", "filter-sheet expanded semantics");
requireText("src/components/mobile-map-model.tsx", "focusSelector", "focus transfer between map and list views");

requireText("src/components/listing-editor.module.css", "@media (max-width: 1120px)", "listing editor tablet collapse");
requireText("src/components/listing-editor.module.css", "@media (max-width: 700px)", "listing editor phone collapse");
requireRegex("src/components/listing-editor.module.css", /listing-location-section[\s\S]*?grid-template-columns:\s*1fr;/, "single-column mobile location step");

requireText("src/app/messages/messages-workspace-redesign.css", "@media (max-width: 980px)", "messages single-pane breakpoint");
requireRegex("src/app/messages/messages-workspace-redesign.css", /messages-thread-route\s+\.messages-workspace-inbox\s*\{\s*display:\s*none;/, "mobile thread-only messages state");
requireText("src/app/messages/messages-workspace-redesign.css", ".messages-thread-pane .thread-back-button", "mobile thread back navigation");

requireText("src/app/homes/property-detail-flow-redesign.css", "@media (max-width: 760px)", "property-detail mobile dock breakpoint");
requireText("src/app/homes/property-detail-flow-redesign.css", "env(safe-area-inset-bottom)", "property-detail safe-area support");
requireRegex("src/app/homes/property-detail-flow-redesign.css", /contact-action-stack[\s\S]*?position:\s*fixed;/, "fixed mobile property actions");

// The newest operational/editorial redesigns should retain their responsive workbench/navigation layers.
requireText("src/app/moderation/styles.css", "moderation-workbench.css", "moderation workbench style layer");
requireText("src/app/information-styles.css", "information-navigation-redesign.css", "information navigation refinement layer");

if (failures.length) {
  console.error("UI regression check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`UI regression check passed (${spacingFiles.length} spacing files scanned).`);
