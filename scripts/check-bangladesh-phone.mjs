import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "src/lib/bangladesh-phone.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
});

const module = { exports: {} };
new Function("exports", "module", compiled.outputText)(module.exports, module);
const {
  BD_MOBILE_PREFIX_PATTERN,
  BD_MOBILE_PREFIXES,
  bangladeshPhoneSubscriberDigits,
  normalizeBangladeshPhone,
} = module.exports;

if (!(BD_MOBILE_PREFIX_PATTERN instanceof RegExp) || BD_MOBILE_PREFIX_PATTERN.source !== "^1[3-9]\\d{8}$") {
  console.error("bangladesh-phone.ts: unexpected Bangladesh mobile prefix pattern.");
  process.exit(1);
}

const requiredPrefixes = ["13", "14", "15", "16", "17", "18", "19"];
if (JSON.stringify([...BD_MOBILE_PREFIXES]) !== JSON.stringify(requiredPrefixes)) {
  console.error("bangladesh-phone.ts: documented Bangladesh mobile prefixes drifted.");
  process.exit(1);
}

const validSamples = [
  ["01712345678", "+8801712345678"],
  ["1712345678", "+8801712345678"],
  ["8801712345678", "+8801712345678"],
  ["+8801712345678", "+8801712345678"],
  ["01312345678", "+8801312345678"],
  ["01912345678", "+8801912345678"],
];

const invalidSamples = ["01212345678", "01112345678", "171234567", "abc", ""];

for (const [sample, expected] of validSamples) {
  const result = normalizeBangladeshPhone(sample);
  if (result !== expected) {
    console.error(`Expected ${sample} to normalize to ${expected}, got ${result}.`);
    process.exit(1);
  }
}

for (const sample of invalidSamples) {
  const result = normalizeBangladeshPhone(sample);
  if (result !== null) {
    console.error(`Expected invalid sample to reject: ${sample} → ${result}`);
    process.exit(1);
  }
}

if (bangladeshPhoneSubscriberDigits("+880 17-1234-5678") !== "1712345678") {
  console.error("Subscriber digit extraction no longer handles formatted E.164 input.");
  process.exit(1);
}

console.log("Bangladesh phone QA passed against the real application helpers (013–019).");
