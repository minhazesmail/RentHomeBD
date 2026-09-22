# Desktop interface redesign

## Product direction
Preserve NearBasha's map-first, tenant-aware rental journey and its English/Bangla interface. Make desktop feel like a deliberate rental product: warm paper, forest green, readable typography, useful density, and restrained borders. Use an editorial serif only for the English landing headline; keep the Bengali font and operational UI sans-serif.

## Implementation plan and coverage
1. Shared shell: remove decorative desktop atmosphere, unify control radii, constrain readable content widths, and flatten primary navigation into clearly marked destinations.
2. Discovery: compose the headline and interactive neighborhood map side by side; place location, tenant type, budget, and submission in one full-width search row. Preserve native validation, custom budget, advanced filters, and URL state.
3. Homepage sections: turn trust claims into a quiet four-column explanation, simplify journey steps, and align footer/CTA spacing.
4. Search workspace: join the filter toolbar, results rail, and map into one working surface. Preserve existing map/search state management and asynchronous feedback.
5. Property detail: expand the image gallery, clarify the facts/contact columns, and retain media controls and contact permissions.
6. Saved homes, dashboard, owner portfolio, messaging, and moderation: use consistent page headers, denser summaries, flatter panels, and connected inbox/conversation surfaces.
7. Authentication and information pages: balanced desktop columns, restrained form panel, clear editorial hierarchy.
8. Verify public routes at desktop, laptop, and mobile sizes, light/dark appearance, Bengali, search validation and URL handoff, persona tabs, FAQ, and account navigation. Run existing repository checks.

## Architecture
Desktop geometry starts at 1024px; desktop navigation stays at the existing 1041px threshold. Existing mobile selectors remain authoritative below those breakpoints. Landing styles live in their canonical stylesheets, navigation/gallery/saved-home rules in their existing modules, and cross-route composition in `global-shell.module.css`. Semantic colors follow the existing theme provider. No authentication, authorization, database schema, or listing lifecycle changes.

## Map provider correction
Visual QA exposed CARTO's new API-key watermark. `NEXT_PUBLIC_CARTO_BASEMAP_KEY` enables authenticated dark tiles; otherwise the existing OpenStreetMap provider is used. Request a domain-restricted public key at https://www.carto.com/basemaps/apikey/. No secret keys belong in the browser.

## Verification limits
Local preview uses a non-production loopback Supabase URL when production configuration is unavailable. This exercises actual empty/error states, not invented listings. Signed-in CRUD, saved-home persistence, messaging delivery, moderation, and populated property details need configured Supabase plus representative test accounts before release. The redesign does not bypass these requirements.
