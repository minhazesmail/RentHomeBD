import assert from "node:assert/strict";
import { readMapSession, writeMapSession } from "../src/lib/map-session.ts";

const storage = new Map();
Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
} });
const session = { view: "list", sheet: "expanded", selectedId: "home", listScroll: 420,
  viewport: { center: [23.75, 90.38], zoom: 14 }, polygon: [[23, 90], [24, 90], [24, 91]] };
writeMapSession("/homes?tenant=family&radius=5&selected=a", session);
assert.equal(readMapSession("/homes?radius=5&tenant=family&selected=b&listScroll=20")?.listScroll, 420);
assert.equal(readMapSession("/homes?radius=10&tenant=family"), null, "different query must not inherit state");
assert.deepEqual(readMapSession("/homes?radius=5&tenant=family")?.polygon, session.polygon);
const key = [...storage.keys()][0];
const saved = JSON.parse(storage.get(key));
for (const change of [
  { savedAt: Date.now() - 31 * 60_000 }, { savedAt: null }, { savedAt: Date.now() + 60_000 },
  { viewport: { center: [91, 90], zoom: 12 } }, { viewport: { center: [23, 90], zoom: 100 } },
  { polygon: [[23, 90]] }, { polygon: [[23, 90], [24, 90], [24, 190]] },
  { view: "invalid" }, { sheet: "unknown" }, { listScroll: -1 },
]) {
  storage.set(key, JSON.stringify({ ...saved, ...change }));
  assert.equal(readMapSession("/homes?radius=5&tenant=family"), null);
}
storage.set(key, "bad json");
assert.equal(readMapSession("/homes?radius=5&tenant=family"), null);
Object.defineProperty(globalThis, "sessionStorage", { get() { throw new Error("Storage blocked"); } });
assert.doesNotThrow(() => writeMapSession("/homes", session));
assert.equal(readMapSession("/homes"), null);
console.log("Map session QA passed: query isolation, polygon/viewport restoration, expiry, malformed and blocked storage.");
