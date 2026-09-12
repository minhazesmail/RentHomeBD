# NearBasha redesign system — phases 1–2

Status: implementation baseline for the map-first SaaS redesign.

## Product rule

NearBasha helps a renter answer three questions in order:

1. **Where do I want to live?** — area, landmark, exact pin, radius, or custom map area.
2. **Can I afford it?** — monthly budget and listing rent.
3. **Can I actually rent it?** — explicit tenant-type compatibility.

Tenant type is therefore a primary search input, not a decorative preference. A personalized search must deliberately choose one of `family`, `bachelor`, `student`, or `job_holder`. Listing-side `everyone` remains a compatibility policy, not a renter identity.

## Baseline inventory

The implementation already has the expensive search mechanics and should preserve them while the presentation is redesigned:

- radius-based PostGIS search and server-side ordering;
- price markers, clusters, marker/list selection, and exact map pins;
- custom polygon search;
- on-demand and continuous location modes;
- saved homes and saved searches;
- listing freshness/moderation signals;
- mobile map/list switching;
- English/Bangla locale infrastructure;
- light/dark appearance infrastructure;
- public landing inventory loaded through the privacy-preserving landing RPC.

The first two phases intentionally do **not** replace these mechanics. They establish a stable visual/search contract that later desktop and mobile map phases can reuse.

## Canonical visual tokens

The phase-1 landing implementation owns these semantic values in `landing-redesign-v2.css`.

| Token | Light value | Purpose |
| --- | --- | --- |
| Primary | `#0B4F3C` | Primary actions, selected search state, map emphasis |
| Background | `#F7F5EF` | Main marketing canvas |
| Sand | `#E8DFCF` | Secondary accents and quiet emphasis |
| Surface | `#FFFFFF` | Search/card surfaces |
| Ink | `#172D25` | Primary text |
| Muted ink | `#5F6F68` | Explanatory text |
| Border | `rgba(23,45,37,.14)` | Fine UI boundaries |
| Corner | `12–16px` | Default controls/cards; larger radii reserved for major compositions |

Dark mode keeps the same semantic hierarchy with a deep green canvas, elevated green-black surfaces, light text, and the same restrained border/shadow model. Tenant categories must never rely on color alone.

## Landing composition contract

Desktop uses an approximately **45% search / 55% map** hero. Mobile keeps the search before the map preview.

Primary search order:

1. Area or landmark — required.
2. Tenant type — required.
3. Monthly budget — optional preset or custom maximum.
4. Find homes — submits to `/homes`.

Bedrooms move behind **More filters**. The current radius remains explicit in the URL so the receiving map accurately represents a radius search instead of pretending to be a viewport query.

### URL handoff

The landing form and hero map CTA share this contract:

```text
/homes?area=<preset>&tenant=<tenant>&maxRent=<optional>&bedrooms=<optional>&radius=<km>
```

Popular-area shortcuts change only the area selection; they do not discard a renter's tenant type or budget. The map CTA becomes actionable once area and tenant type are selected and carries the same draft criteria.

## Component ownership

- `src/app/page.tsx` — server composition for the marketing route.
- `src/components/landing-hero-search.tsx` — client-owned landing search state, validation, criteria-preserving shortcuts, and hero map CTA.
- `src/components/landing-map-preview.tsx` — server-loaded public inventory adapter.
- `src/components/landing-map-preview-client.tsx` — existing interactive preview.
- `src/i18n/landing-redesign-copy.ts` — redesign-specific English/Bangla copy; shared tenant labels still come from the canonical dictionaries.
- `src/app/landing-redesign-v2.css` — single final landing implementation layer for phases 1–2. Do not add new landing `*-fix.css` files for this redesign.

Legacy landing styles remain underneath the new final layer during the staged rollout. They are removed or folded into canonical route styles in phase 5 after the map surfaces are migrated and regression-tested.

## Interaction and accessibility contract

- All primary controls have at least a 44px touch target.
- Native labels remain associated with every form control.
- Required tenant/area inputs use native form validation and visible copy.
- Keyboard focus uses a visible emerald focus ring.
- Popular areas use real buttons because they mutate the current search draft rather than navigate with stale criteria.
- The map CTA exposes a disabled state until the minimum personalized-search criteria exist.
- Motion is short and nonessential; reduced-motion disables decorative animation/transition behavior.
- Bangla uses the existing locale provider and Hind Siliguri path; redesign copy must exist in both locales.

## Phase-1 completion criteria

- Design tokens and route ownership are explicit.
- Landing implementation has one final scoped override layer rather than another chain of fix files.
- Light/dark and English/Bangla behavior remain supported.
- Existing search/map backend mechanics are left intact.

## Phase-2 completion criteria

- Hero communicates location + budget + tenant fit.
- Area and tenant type are required before form submission.
- Budget accepts presets and a custom maximum.
- Bedrooms are optional/secondary.
- Landing-to-`/homes` handoff preserves every selected criterion.
- Popular areas preserve the rest of the draft search.
- Hero map CTA carries the same search state.
- Real public inventory remains the source of the map preview.
- Source-level QA guards the contract and runs as part of `uiqa`.

## Next sequential batch

Phase 3 redesigns the desktop map workspace and phase 4 redesigns the mobile map workspace. They should consume the same tenant-first search semantics established here instead of creating parallel state rules.
