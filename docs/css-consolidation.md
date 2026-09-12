# CSS consolidation strategy

NearBasha uses named cascade layers plus browser/theme regression QA to keep visual changes predictable. During the rapid redesign, landing and renter-map work intentionally shipped as additive layers before cleanup.

## Phase 5 consolidation result

The tenant-first landing and map-first renter workspace now have stable canonical entrypoints:

- `src/app/landing.css` — final tenant-first landing appearance layer (the former temporary v2 layer).
- `src/app/landing-foundation.css` — the active pre-redesign landing cascade manifest loaded by the scroll-atmosphere component.
- `src/app/landing-foundation-base.css` — the historical route-base stylesheet, renamed so it cannot be confused with the final landing appearance owner.
- `src/app/homes/map-workspace.css` — final desktop/mobile renter-map appearance layer.
- `src/app/landing-theme.css` and `src/app/landing-how-theme.css` remain scoped theme bridges.

The first consolidation pass deliberately does **not** delete landing foundation layers that are still imported. Vercel’s production build exposed that the previous `landing-styles.css` file was an active manifest, not dead source. Phase 5 therefore preserves its exact cascade order under the explicit `landing-foundation.css` name and retires only temporary/misleading entrypoint names. This keeps release behavior stable while making future layer-by-layer removal measurable instead of speculative.

For `/homes`, the obsolete `homes-spacing-fixes.css` layer is removed. Its one still-live property-detail rule is folded into `property-detail-spacing-fixes.css`; the redesigned renter workspace owns its complete component appearance in `map-workspace.css`.

## Guardrails

- `npm run lint` checks cascade-layer ownership and selector collisions.
- `npm run releaseqa` prevents temporary `*-v2.css` entrypoints and the retired landing manifest name from returning, verifies the canonical foundation/final wiring, and enforces source-size budgets for the two final redesign appearance stylesheets.
- `npm run uiqa` includes landing, map-workspace, release, general UI, and theme source-level regression contracts.
- CI still performs the production build, server startup, rendered Playwright light/dark/system checks, responsive viewport checks, and dedicated dark-theme regression QA.

## Ongoing rule

Consolidate one active layer at a time. A file is not dead merely because the root stylesheet does not import it; component-level CSS imports count. Fold or remove a foundation layer only after rendered regression coverage proves it redundant. Do not introduce new `*-v2.css` entrypoints for the finalized landing or map workspace.
