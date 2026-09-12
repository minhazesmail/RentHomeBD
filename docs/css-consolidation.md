# CSS consolidation strategy

NearBasha uses named cascade layers plus browser/theme regression QA to keep visual changes predictable. During the rapid redesign, landing and renter-map work intentionally shipped as additive layers before cleanup.

## Phase 5 consolidation result

The tenant-first landing and map-first renter workspace now have canonical stylesheet entrypoints:

- `src/app/landing.css` — final landing component appearance layer.
- `src/app/homes/map-workspace.css` — final desktop/mobile renter-map appearance layer.
- `src/app/landing-theme.css` and `src/app/landing-how-theme.css` remain as the scoped landing theme bridge.
- Property-detail CSS remains separate because it is a different route surface with its own regression contract.

The old unreferenced landing override generations were removed rather than left as archaeological CSS. This eliminates about 150 KB of obsolete landing CSS source while preserving the exact active landing stylesheet blob. The temporary `*-v2.css` filenames are also retired.

For `/homes`, the obsolete `homes-spacing-fixes.css` layer was removed. Its only still-live property-detail rule was folded into `property-detail-spacing-fixes.css`; the redesigned renter workspace continues to own its complete component appearance in `map-workspace.css`.

## Guardrails

- `npm run lint` checks cascade-layer ownership and selector collisions.
- `npm run releaseqa` prevents retired landing/map override files and temporary v2 entrypoints from returning, and enforces source-size budgets for the two canonical redesign stylesheets.
- `npm run uiqa` includes landing, map-workspace, release, general UI, and theme source-level regression contracts.
- CI still performs the production build, server startup, rendered Playwright light/dark/system checks, responsive viewport checks, and dedicated dark-theme regression QA.

## Ongoing rule

Consolidate one surface at a time. Fold a fix into the canonical stylesheet or the appropriate route-detail file before deleting the old layer, and only keep the change when the full browser/theme suite remains green. Do not introduce new `*-fix.css`, `*-v2.css`, or one-off landing/map override generations for these finalized surfaces.
