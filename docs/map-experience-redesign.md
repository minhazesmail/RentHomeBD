# Map experience redesign

## Direction

Use a calm emerald-and-sand map interface across discovery, renter search and owner pin placement. Real geography must replace decorative approximations. Keep tenant matching mandatory for rental searches, and keep map controls clear of filters, results and attribution.

## Implementation plan

1. Replace the landing schematic with a lazy-loaded Leaflet neighborhood explorer using existing map providers. Neighborhood buttons and map markers share selection. A selected-area link hands off to /homes; actual inventory pins link to the corresponding homes. Never fabricate inventory or clamp coordinates into fake positions.
2. Establish shared theme-aware map chrome: consistent borders, accessible zoom controls at the upper right, legible attribution and popup surfaces. Preserve street labels and real coordinates.
3. Refine the renter toolbar into a compact full-width filter row with an introductory row and readable tenant guidance. Group map actions at the upper left, separated from zoom. Retain map/list synchronization, search-this-area, drawing, saved searches and mobile sheets.
4. Apply shared map chrome and dark basemap support to the owner location picker, retaining exact pin placement, disabled state and drag behavior.
5. Verify English/Bangla, light/dark, desktop/mobile, neighborhood handoff, keyboard controls and map/filter separation. Run existing CI before merging and deploying.

## Acceptance criteria

- Landing neighborhoods use location presets and real map coordinates; no approximate decorative listing pins.
- All map controls have readable labels, keyboard focus and touch-sized targets.
- Zoom never overlaps map action buttons or the toolbar.
- Landing map scrolling does not trap page scrolling; open full search for the complete map workflow.
- No changes to database schemas, tenant rules, logo animation or saved-search semantics.
- The release passes build, type, lint, localization and rendered geometry checks.
