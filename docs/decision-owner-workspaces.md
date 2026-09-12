# Decision and owner workspaces — Tasks 8 and 9

This batch extends the redesign stack beyond the property-detail/contact journey without changing the database schema or weakening existing moderation, search, saved-state, or listing-lifecycle controls.

## Task 8 — Saved homes and saved searches

Saved is the renter's decision workspace, not a generic bookmark page. Existing comparison, unavailable-home archiving, saved-search editing, and new-match counts remain intact.

### Mandatory renter identity for saved searches

A saved personalized search must use one renter identity:

- Family
- Bachelor
- Student
- Job holder

`Everyone` remains a listing-policy value and is not offered as a renter identity. A legacy saved search with a missing tenant type or `everyone` is allowed to remain stored, but it cannot be run from Saved until the user edits it and chooses a valid renter identity. This prevents Saved from becoming a bypass around the mandatory tenant-compatibility rule.

The editor keeps the existing radius/rent/bedroom validation bounds. Duplicate actions preserve a valid tenant type and keep invalid legacy tenant state unset so the duplicate also requires repair before it can run.

## Task 9 — Owner portfolio and listing management

The owner workbench keeps its current information architecture: portfolio summary, priority queue, search/status/sort controls, listing cards, moderation feedback, freshness controls, and listing editor handoff.

### Localization

The portfolio surface now follows the active EN/BN locale for:

- page heading, notices, summary cards and empty states,
- status descriptions and freshness messaging,
- search, status filters, sorting and result counts,
- rent/date formatting,
- moderator-feedback labels,
- reconfirm, mark-rented, edit and relist actions/errors.

Owner-authored listing title, address and moderator-authored feedback remain as stored and are not machine-translated.

### Actionable freshness queue

`Need attention` now represents work the owner can act on, not only database status names. It includes:

1. `pending_confirmation`,
2. `rejected`,
3. `available` listings whose confirmation expires within 3 days.

The same predicate powers the summary count, priority queue, and `status=attention` filter so those surfaces cannot disagree. Live listings nearing expiry remain live, but they are visibly prioritized before they become hidden from renter search.

## Regression gate

`npm run workspaceqa` is included in `npm run uiqa` and checks that:

- saved-search tenant identity is required,
- `everyone` is excluded from renter identity choices,
- legacy invalid saved searches cannot render a Run search link,
- existing radius/rent/bedroom validation remains present,
- the owner portfolio uses shared EN/BN copy,
- expiring live listings participate in the attention predicate,
- attention count/filter/queue use the same predicate,
- owner controls and freshness actions are localized,
- locale-aware rent/date/number formatting is used.
