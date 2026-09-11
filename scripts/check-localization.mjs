import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireText(relativePath, text, label) {
  if (!read(relativePath).includes(text)) failures.push(`${relativePath}: missing ${label}`);
}

function forbidText(relativePath, text, label) {
  if (read(relativePath).includes(text)) failures.push(`${relativePath}: ${label}`);
}

function translationLeafPaths(relativePath) {
  const source = read(relativePath);
  const stack = [];
  const keys = new Set();
  for (const line of source.split("\n")) {
    const match = line.match(/^(\s*)([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (!match) continue;
    const [, whitespace, key, value] = match;
    const depth = Math.max(0, Math.floor(whitespace.length / 2) - 1);
    stack.length = depth;
    if (value.trim().startsWith("{")) {
      stack[depth] = key;
      continue;
    }
    if (value.trim().startsWith('"')) keys.add([...stack, key].join("."));
  }
  return [...keys].sort();
}

const enKeys = translationLeafPaths("src/i18n/dictionaries/en.ts");
const bnKeys = translationLeafPaths("src/i18n/dictionaries/bn.ts");
if (JSON.stringify(enKeys) !== JSON.stringify(bnKeys)) failures.push("translation dictionaries do not have matching leaf keys");

requireText("src/i18n/config.ts", '["en", "bn"]', "supported locale list");
requireText("src/i18n/config.ts", 'LOCALE_COOKIE_NAME = "nb_locale"', "locale cookie name");
requireText("src/app/layout.tsx", "const locale = await getLocale()", "server locale resolution");
requireText("src/app/layout.tsx", "<html lang={locale}", "locale-aware html lang");
requireText("src/app/layout.tsx", "<LocaleProvider initialLocale={locale}>", "locale provider");
requireText("src/i18n/locale-provider.tsx", "router.refresh()", "server-component locale refresh");
requireText("src/components/language-switcher.tsx", "aria-pressed={active}", "language selected state");
requireText("src/app/localization.css", 'html[lang="bn"]', "Bangla typography rules");
requireText("src/i18n/format.ts", '"bn-BD"', "Bangla number/date locale");
requireText("src/i18n/format.ts", '"en-BD"', "English Bangladesh locale");
requireText("src/i18n/workflow-copy.ts", "const bnWorkflowCopy", "authenticated workflow Bangla copy");
requireText("src/i18n/workflow-copy.ts", "savedSearchLimit", "saved-search quota copy");
requireText("src/i18n/workflow-copy.ts", "propertyDraftLimit", "property-draft quota copy");

requireText("src/app/page.tsx", "dictionary.landing", "landing dictionary usage");
requireText("src/app/login/auth-form.tsx", "dictionary.auth.form", "auth dictionary usage");
requireText("src/components/phone-verification-form.tsx", "dictionary.auth.phoneVerification", "phone verification dictionary usage");
requireText("src/components/renter-map-search.tsx", "getWorkflowCopy(locale).homes.search", "renter map workflow copy");
requireText("src/components/renter-results-list.tsx", "getWorkflowCopy(locale)", "renter result-card workflow copy");
requireText("src/app/saved/page.tsx", "getWorkflowCopy(locale).saved", "saved page workflow copy");
requireText("src/components/saved-search-card.tsx", "getWorkflowCopy(locale).saved.searchCard", "saved-search editor workflow copy");
requireText("src/components/saved-homes-workspace.tsx", "getWorkflowCopy(locale).saved.homes", "saved-home comparison workflow copy");
requireText("src/components/message-composer.tsx", "getWorkflowCopy(locale).messages.composer", "message composer workflow copy");
requireText("src/components/messages-inbox-pane.tsx", "getWorkflowCopy(locale).messages.inbox", "messages inbox workflow copy");
requireText("src/components/realtime-message-thread.tsx", "getWorkflowCopy(locale).messages.live", "live message-thread workflow copy");
requireText("src/app/messages/[id]/page.tsx", "getWorkflowCopy(locale).messages.thread", "message thread server workflow copy");
requireText("src/components/property-listing-form.tsx", "getWorkflowCopy(locale).owner.form", "owner listing-form workflow copy");
requireText("src/components/property-listing-form.tsx", "property draft limit reached", "localized unfinished-listing quota mapping");
requireText("src/components/listing-workflow-nav.tsx", "getOwnerEditorCopy(locale).workflow", "listing workflow navigation localization");
requireText("src/components/listing-readiness.tsx", "getOwnerEditorCopy(locale).readiness", "listing readiness localization");
requireText("src/components/listing-draft-guard.tsx", "getOwnerEditorCopy(locale).draftGuard", "listing draft-guard localization");
requireText("src/lib/message-time.ts", "toIntlLocale(locale)", "locale-aware message timestamp formatting");

forbidText("src/components/marketing-navigation.tsx", ">Find on map<", "marketing nav must source labels from dictionaries");
forbidText("src/components/product-navigation.tsx", 'label: "Explore"', "product nav must source labels from dictionaries");
forbidText("src/app/page.tsx", "Find a home close to the life you already live.", "landing hero must source copy from dictionaries");
forbidText("src/app/login/auth-form.tsx", ">Welcome back<", "auth form must source copy from dictionaries");
forbidText("src/components/renter-map-search.tsx", "Find a home around you.", "renter map title must source workflow copy");
forbidText("src/components/saved-search-card.tsx", ">Save changes<", "saved-search actions must source workflow copy");
forbidText("src/components/message-composer.tsx", "Write a polite message about this property", "message composer placeholder must source workflow copy");
forbidText("src/components/property-listing-form.tsx", ">Property basics<", "listing form sections must source workflow copy");
forbidText("src/components/property-listing-form.tsx", ">Submit for review<", "listing submit action must source workflow copy");

if (failures.length) {
  console.error("Localization QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Localization QA passed (${enKeys.length} translated leaf keys in parity plus authenticated workflow coverage).`);
