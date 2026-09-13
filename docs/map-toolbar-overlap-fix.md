# Map toolbar overlap fix — 2026-09-13

## Reported issues

The supplied 1348 × 602 screenshot shows:

1. A large blank band between navigation and the search filters.
2. The toolbar covering the top of the results/map workspace, hiding the results header and intersecting the map zoom buttons with tenant badges.
3. The long area placeholder and one-line helper text being clipped.

The empty-results message alone does not establish a search-data defect. Tenant selection remains mandatory.

## Diagnosis

The desktop search shell inherits a viewport height and `overflow: hidden` from `homes.css`. Its toolbar used `position: sticky; top: 72px`, even though navigation already precedes the shell. Sticky positioning uses this overflow container, shifting the toolbar down inside its own grid without moving the following workspace row. The workspace also subtracted an assumed 116px toolbar height (104px at compact desktop sizes), which cannot track wrapped text or status messages.

Existing browser QA checked full-width columns and explicit grid-row numbers, but deliberately skipped visual row boundaries. It therefore could pass while the toolbar visibly covered the map and results header.

## Fix plan and implementation

- Keep the toolbar in normal grid flow with relative positioning and no top offset. Keep its stacking order for the More filters popover.
- Let the workspace fill the remaining `minmax(0, 1fr)` row instead of subtracting an estimated toolbar height.
- Isolate the map panel stacking context so Leaflet's internal controls stay below toolbar popovers.
- Wrap the helper description and use a concise localized area placeholder: “Choose Dhaka area” / “ঢাকার এলাকা বাছুন”.
- Extend browser QA with the supplied viewport and assertions for toolbar/shell alignment, adjacent toolbar/workspace boundaries, remaining height, visible results header geometry, and zoom-control containment. Existing desktop sizes and light/dark scenarios remain covered.

## Validation

- TypeScript check: passed.
- Map workspace contract checks: passed.
- ESLint and CSS ownership: passed with seven existing unrelated image-element warnings.
- Local rendered verification: blocked. Chromium download timed out; agent-browser could not start; the connected browser refused the localhost URL. Updated rendered regression checks must run in GitHub CI before merging.
- Database and search behavior were not tested against a real backend; local commands use placeholder public Supabase configuration.

This change is prepared on a fix branch for review; production deployment is not asserted.
