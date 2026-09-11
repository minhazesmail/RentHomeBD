import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

async function loadSafeRedirectModule() {
  const helperPath = path.join(root, "src", "lib", "safe-redirect.ts");
  const source = fs.readFileSync(helperPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: helperPath,
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  return import(dataUrl);
}

const { safeRelativePath, safeRedirectUrl } = await loadSafeRedirectModule();

assert.equal(safeRelativePath("/dashboard"), "/dashboard");
assert.equal(
  safeRelativePath("/saved?tab=homes#map"),
  "/saved?tab=homes#map",
  "query strings and fragments must survive validation",
);
assert.equal(safeRelativePath("https://evil.example/path"), "/dashboard");
assert.equal(safeRelativePath("//evil.example/path"), "/dashboard");
assert.equal(safeRelativePath("/\\evil.example/path"), "/dashboard");
assert.equal(safeRelativePath("/safe\u0000bad"), "/dashboard");

const trustedBase = "https://app.nearbasha.example/some/base/path";
assert.equal(
  safeRedirectUrl(trustedBase, "/saved?tab=homes#map").href,
  "https://app.nearbasha.example/saved?tab=homes#map",
  "the trusted base origin must be used while preserving search/hash",
);

const nestedFinalDestination = "/saved?tab=homes#map";
const resetDestination = `/auth/reset?next=${encodeURIComponent(nestedFinalDestination)}`;
assert.equal(
  safeRedirectUrl(trustedBase, resetDestination).href,
  "https://app.nearbasha.example/auth/reset?next=%2Fsaved%3Ftab%3Dhomes%23map",
  "password-reset destinations must keep the nested next URL encoded as query data",
);

const confirmRoutePath = path.join(root, "src", "app", "auth", "confirm", "route.ts");
const confirmRoute = fs.readFileSync(confirmRoutePath, "utf8");
assert.match(confirmRoute, /NEXT_PUBLIC_APP_URL/);
assert.match(confirmRoute, /process\.env\.VERCEL_URL/);
assert.match(confirmRoute, /process\.env\.VERCEL === "1"/);
assert.match(confirmRoute, /safeRedirectUrl\(trustedAppUrl\(\), destination\)/);
assert.doesNotMatch(
  confirmRoute,
  /headers\s*\(/,
  "auth confirmation must not derive its trusted origin from request headers",
);
assert.doesNotMatch(
  confirmRoute,
  /\.pathname\s*=/,
  "auth confirmation must not assign a full relative URL to URL.pathname",
);
assert.doesNotMatch(
  confirmRoute,
  /\.search\s*=/,
  "auth confirmation must not discard a validated destination's own search string",
);

const resetPagePath = path.join(root, "src", "app", "auth", "reset", "page.tsx");
const resetPage = fs.readFileSync(resetPagePath, "utf8");
assert.match(resetPage, /safeRelativePath\(candidate\)/);
assert.doesNotMatch(resetPage, /function\s+safeNext\s*\(/);

const authFormPath = path.join(root, "src", "app", "login", "auth-form.tsx");
const authForm = fs.readFileSync(authFormPath, "utf8");
assert.match(authForm, /const resetDestination = `\/auth\/reset\?next=\$\{encodeURIComponent\(safeNext\)\}`/);
assert.match(authForm, /next=\$\{encodeURIComponent\(resetDestination\)\}/);

console.log("Auth redirect QA passed: nested path/query/hash destinations stay same-origin and Vercel previews use only platform-controlled origin fallback.");
