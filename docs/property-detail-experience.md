# Property detail experience — Tasks 6 and 7

This batch extends the completed map-first redesign into the property decision and contact journey. It is intentionally stacked on Phase 5 and does not change the search RPC, listing moderation model, phone reveal RPC, conversation permissions, or saved-home data model.

## Task 6 — Premium property detail experience

The existing property-detail composition remains the visual foundation: immersive signed-media gallery, rent and availability hero, concise home facts, renter policy, amenities, exact map location, trust signals, and a sticky contact card. The task completes the surface rather than replacing working mechanics.

### Localization contract

- The property-detail page uses the locale cookie through `getLocale()` and one `property-detail-copy` source for English and Bangla.
- Dates, currency, counts, media numbering, navigation, facts, renter-fit explanations, trust copy, contact states, map actions, sharing, reporting, messaging and phone-reveal states are locale-aware.
- Listing-authored content such as title, description and arbitrary amenity names is displayed as supplied; the application does not fabricate translations for owner-authored data.
- Known enum-like presentation values may use localized labels, with a readable fallback for unknown future values.

### Accessibility contract

- Gallery dialog keyboard/focus behavior is preserved.
- Media, map and action aria labels are localized.
- Compatibility is communicated with explicit text and icons, never color alone.
- Existing reduced-motion behavior remains intact.

## Task 7 — Tenant compatibility, trust and contact continuity

### Search-specific tenant context

The renter type selected in the map search is part of the validated `/homes?...` return path. Property details read that tenant from the already-sanitized `returnTo` value and use it before any saved profile preference.

Precedence:

1. Search-specific renter type from the validated map return path.
2. Saved profile renter preference when there is no search-specific type.
3. No personalized compatibility signal when neither exists.

`everyone` is a listing policy/profile openness value, not a search identity. Missing listing tenant policy remains `neutral`/unknown and must never be presented as a match.

### Compatibility states

- `match`: the listing accepts the selected renter type or `everyone`.
- `mismatch`: the listing policy conflicts with the selected renter type.
- `neutral`: the listing has insufficient tenant-policy information.

The renter-fit section and sticky contact card repeat the effective context so users cannot lose the mandatory renter constraint immediately before contact. A stale/shared detail page that conflicts with a search-specific renter type offers a clear route back to compatible homes instead of silently relaxing the requirement.

### Contact continuity

Sign-in links generated from a property reached through map search preserve the validated `returnTo` value and the relevant `#contact` or `#trust` anchor. Returning from authentication therefore retains the renter search context instead of dropping the map state.

In-app messaging remains the primary contact action. Direct phone reveal remains secondary and requires the existing viewer/owner verification rules and rate-limit protections.

### Trust language

NearBasha distinguishes:

- listing moderation review,
- exact map pin supplied during listing creation,
- freshness/reconfirmation lifecycle,
- account phone verification,
- account role verification,
- private in-app contact.

These are platform trust signals. None is described as proof of legal property ownership, and the property page keeps an explicit due-diligence disclaimer.

## Regression gate

`npm run detailqa` is part of `npm run uiqa`. It prevents regressions in:

- EN/BN property detail copy,
- search-tenant precedence,
- missing-policy neutrality,
- map-state-preserving sign-in URLs,
- localized gallery/contact/trust actions,
- explicit legal-ownership disclaimer language.
