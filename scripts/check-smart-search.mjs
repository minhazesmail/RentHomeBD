import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual browser sorting function with deliberately conflicting
// server recommendation, distance and price orders.
const source = fs.readFileSync(new URL("../src/components/renter-map-workspace.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("workspace.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "sortedResults");
assert.ok(declaration, "Search result ordering must be testable");
const javascript = ts.transpileModule(declaration.getText(ast), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const sort = vm.runInNewContext(`${javascript}\nsortedResults`);
const listings = [
  { id: "balanced", distance_meters: 700, rent_bdt: 15000 },
  { id: "near", distance_meters: 30, rent_bdt: 30000 },
  { id: "cheap", distance_meters: 1200, rent_bdt: 10000 },
  { id: "unknown", distance_meters: 1500, rent_bdt: null },
];
const original = structuredClone(listings);
const ids = (mode) => Array.from(sort(listings, mode), (listing) => listing.id);
assert.deepEqual(ids("recommended"), ["balanced", "near", "cheap", "unknown"]);
assert.deepEqual(ids("distance"), ["near", "balanced", "cheap", "unknown"]);
assert.deepEqual(ids("rent-asc"), ["cheap", "balanced", "near", "unknown"]);
assert.deepEqual(ids("rent-desc"), ["near", "balanced", "cheap", "unknown"]);
assert.deepEqual(listings, original, "Ordering must not mutate React state");
assert.equal(sort([], "recommended").length, 0);
console.log("Smart search browser ordering QA passed.");
