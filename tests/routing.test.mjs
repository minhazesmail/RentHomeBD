import assert from "node:assert/strict";
import test from "node:test";

import { isUuid, safeInternalPath } from "../src/lib/routing.ts";

test("safeInternalPath preserves a valid internal path, query and hash", () => {
  assert.equal(
    safeInternalPath("/homes?lat=23.8103&lng=90.4125#results"),
    "/homes?lat=23.8103&lng=90.4125#results",
  );
});

test("safeInternalPath rejects external and encoded scheme-relative redirects", () => {
  for (const value of ["https://evil.example", "//evil.example", "/%2F%2Fevil.example", "/\\evil.example"]) {
    assert.equal(safeInternalPath(value), "/dashboard");
  }
});

test("isUuid accepts a canonical property UUID", () => {
  assert.equal(isUuid("550e8400-e29b-41d4-a716-446655440000"), true);
});

test("isUuid rejects malformed property route IDs", () => {
  for (const value of ["not-a-uuid", "550e8400-e29b-41d4-a716", "../../etc/passwd", ""]) {
    assert.equal(isUuid(value), false);
  }
});
