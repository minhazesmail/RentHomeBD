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

    if (value.trim().startsWith('"')) {
      keys.add([...stack, key].join("."));
    }
  }

  return [...keys].sort();
}

const enKeys = translationLeafPaths("src/i18n/dictionaries/en.ts");
const bnKeys = translationLeafPaths("src/i18n/dictionaries/bn.ts");

if (JSON.stringify(enKeys) !== JSON.stringify(bnKeys)) {
  failures.push("translation dictionaries do not have matching leaf keys");
}

requireText("src/i18n/config.ts", '["en", "bn"]', "supported locale list");
requireText("src/i18n/config.ts", 'LOCALE_COOKIE_NAME = "nb_locale"', "locale cookie name");
requireText("src/app/layout.tsx", "const locale = await getLocale()", "server locale resolution");
requireText("src/app/layout.tsx", "<html lang={locale}", "locale-aware html lang");
requireText("src/app/layout.tsx", "<LocaleProvider initialLocale={locale}>", "locale provider");
requireText("src/components/language-switcher.tsx", "aria-pressed={active}", "language selected state");
requireText("src/app/localization.css", 'html[lang="bn"]', "Bangla typography rules");
requireText("src/i18n/format.ts", '"bn-BD"', "Bangla number/date locale");
requireText("src/i18n/format.ts", '"en-BD"', "English Bangladesh locale");
forbidText("src/components/marketing-navigation.tsx", ">Find on map<", "marketing nav must source labels from dictionaries");
forbidText("src/components/product-navigation.tsx", 'label: "Explore"', "product nav must source labels from dictionaries");

if (failures.length) {
  console.error("Localization QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Localization QA passed (${enKeys.length} translated leaf keys in parity).`);
