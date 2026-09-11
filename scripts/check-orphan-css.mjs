import fs from "node:fs";
import path from "node:path";

const cssPath = path.join(process.cwd(), "src/app/globals.css");
let css = fs.readFileSync(cssPath, "utf8");
const fix = process.argv.includes("--fix");

const orphanSelectors = [
  ".map-road.one",
  ".map-pin-demo.p1",
  ".status-dot",
  ".message-bubble.own",
  ".message-bubble.is-own",
];

const auditedRulePatterns = [
  /\s*\.map-road\.one\s*\{[^{}]*\}\s*/g,
  /\s*\.map-pin-demo\.p1\s*\{[^{}]*\}\s*/g,
  /\s*\.status-dot\s*\{[^{}]*\}\s*/g,
  /\s*\.message-bubble\.own\s*,\s*\.message-bubble\.is-own\s*\{[^{}]*\}\s*/g,
];

if (fix) {
  for (const pattern of auditedRulePatterns) css = css.replace(pattern, "\n");
  fs.writeFileSync(cssPath, css);
}

const remaining = orphanSelectors.filter((selector) => css.includes(selector));
if (remaining.length) {
  console.error(`Orphan CSS QA failed: ${remaining.join(", ")}`);
  process.exit(1);
}

console.log("Orphan CSS QA passed: audited unused selectors are absent.");
