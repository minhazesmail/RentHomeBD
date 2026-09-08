# CSS consolidation strategy

The app currently carries many layered stylesheets (`*-redesign.css`, `*-spacing-fixes.css`, `*-theme.css`, large page CSS files). This was intentional during rapid UI iteration. QA scripts already guard against class collisions and theme regressions:

- `npm run lint` → `scripts/check-css-collisions.mjs`
- `npm run uiqa` / `themeqa` / `themebrowser`

## Goals

1. Keep visual stability (do not bulk-delete fix files in one PR).
2. Reduce specificity wars and duplicate rules over time.
3. Prefer design tokens in `globals.css` / foundation/theme files over one-off overrides.

## Recommended process

1. Pick one surface (e.g. auth, dashboard, homes list).
2. Run theme/browser QA and capture screenshots.
3. Fold spacing-fix and redesign rules that are still needed into the primary stylesheet for that surface.
4. Delete empty or fully superseded override files only after QA is green.
5. Keep collision + theme scripts in CI.

## Out of scope for security work

Full visual redesign is not part of the security fix plan. Consolidation is ongoing hygiene.
