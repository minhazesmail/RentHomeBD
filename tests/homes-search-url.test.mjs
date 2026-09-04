import assert from "node:assert/strict";
import test from "node:test";

import { buildHomesSearchPath } from "../src/lib/homes-search-url.ts";

test("buildHomesSearchPath serializes map center and active filters", () => {
  assert.equal(
    buildHomesSearchPath({
      centerLat: 23.7465,
      centerLong: 90.376,
      radiusKm: "10",
      minRent: "12000",
      maxRent: "35000",
      tenantType: "family",
      bedrooms: "2",
      sort: "rent-asc",
    }),
    "/homes?lat=23.746500&lng=90.376000&radius=10&sort=rent-asc&minRent=12000&maxRent=35000&tenant=family&bedrooms=2",
  );
});

test("buildHomesSearchPath includes a selected listing only when present", () => {
  const base = {
    centerLat: 23.8103,
    centerLong: 90.4125,
    radiusKm: "15",
    sort: "recommended",
  };

  assert.equal(
    buildHomesSearchPath({ ...base, selectedId: "550e8400-e29b-41d4-a716-446655440000" }),
    "/homes?lat=23.810300&lng=90.412500&radius=15&sort=recommended&selected=550e8400-e29b-41d4-a716-446655440000",
  );
  assert.equal(
    buildHomesSearchPath({ ...base, selectedId: null }),
    "/homes?lat=23.810300&lng=90.412500&radius=15&sort=recommended",
  );
});
