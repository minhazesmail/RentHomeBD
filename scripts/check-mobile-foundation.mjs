import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireText(source, text, label) {
  if (!source.includes(text)) failures.push(`missing ${label}`);
}

function forbidText(source, text, label) {
  if (source.includes(text)) failures.push(label);
}

const productNav = read("src/components/product-navigation.tsx");
const productNavCss = read("src/components/product-navigation.module.css");
const mobileLanding = read("src/components/mobile-landing-experience.tsx");
const mobileCss = read("src/app/mobile-app.css");
const en = read("src/i18n/dictionaries/en.ts");
const bn = read("src/i18n/dictionaries/bn.ts");

requireText(productNav, 'const accountLabel = nav.account;', "stable Account navigation label");
requireText(productNav, 'const accountHref = authenticated ? "/dashboard" : "/login";', "authenticated/guest Account destinations");
requireText(productNav, 'data-mobile-tabs={showMobileTabs ? "true" : "false"}', "mobile tab visibility contract");
requireText(productNav, 'data-mobile-primary-tabs', "shared mobile primary-tab marker");
requireText(productNav, '/^\\/messages\\/[^/]+$/.test(pathname)', "contextual message-thread route");
requireText(productNav, '/^\\/owner\\/properties\\/(?:new|[^/]+)$/.test(pathname)', "contextual listing-editor route");
forbidText(productNav, 'authenticated ? nav.dashboard : nav.signIn', "product navigation still changes the visible Account label by auth state");

for (const href of ["/homes", "/saved", "/messages", "/login"]) {
  requireText(mobileLanding, `href="${href}"`, `landing primary destination ${href}`);
}
for (const label of [
  "dictionary.navigation.explore",
  "dictionary.navigation.saved",
  "dictionary.navigation.messages",
  "dictionary.navigation.account",
]) {
  requireText(mobileLanding, label, `landing navigation label ${label}`);
}
requireText(mobileLanding, "data-mobile-primary-tabs", "landing primary-tab marker");
forbidText(mobileLanding, "homeLabel", "legacy Home label remains in mobile landing tabs");
forbidText(mobileLanding, "listLabel", "legacy List label remains in mobile landing tabs");

requireText(en, 'account: "Account"', "English Account label");
requireText(bn, 'account: "অ্যাকাউন্ট"', "Bangla Account label");

for (const token of [
  "--mobile-app-gutter: 16px",
  "--mobile-app-safe-left:",
  "--mobile-app-safe-right:",
  "--mobile-app-control-height: 48px",
  "--mobile-app-hit-target: 44px",
  "--mobile-app-bottom-action-offset:",
]) {
  requireText(mobileCss, token, `mobile foundation token ${token}`);
}
requireText(mobileCss, ':has([data-product-navigation][data-mobile-tabs="true"])', "top-level tab safe-space selector");
requireText(mobileCss, "bottom: var(--mobile-app-bottom-action-offset);", "single bottom-action offset contract");
requireText(mobileCss, '.nb-global-shell[data-route^="/messages/"] .messages-page', "contextual message-thread viewport contract");
requireText(productNavCss, "--mobile-app-safe-left", "shared left safe-area usage in product navigation");
requireText(productNavCss, "--mobile-app-safe-right", "shared right safe-area usage in product navigation");

if (failures.length) {
  console.error("Mobile foundation QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Mobile foundation QA passed: navigation vocabulary, contextual tabs, safe areas, and bottom-action ownership are stable.");
