# Tasks 12–13 — Listing authoring and moderation workspaces

## Task 12 — Owner listing creation/edit policy hardening

A listing tenant policy has one unambiguous meaning. Owners may choose one or more specific renter types (`family`, `bachelor`, `student`, `job_holder`) or choose `everyone` by itself. `everyone` must never coexist with a specific renter type on the same property.

The invariant is enforced at the database boundary so stale clients, retries, direct API calls, and future UI changes cannot persist contradictory policy rows. Historical ambiguous rows are normalized to the broader `everyone` policy. The owner readiness panel uses the same rule and explains the conflict in English and Bangla before review submission.

All existing retry-safe draft UUIDs, atomic draft saves, media reconciliation, exact-pin requirements, moderation lifecycle and destructive-storage ordering remain unchanged.

## Task 13 — Moderation/review workspace

The moderator workbench is localized in English and Bangla across listing queues, listing inspection, safety-report queues/details, account trust review, queue navigation, and primary decision controls. Counts, dates and currency follow the active locale.

Reviewer evidence labels must describe only the signal being checked:
- phone verification is shown as **phone verified**, not generic identity verification;
- role verification is shown as a verified owner/agent role badge;
- listing moderation approval is not legal ownership verification;
- account role badges are NearBasha platform moderation signals, not government-ID or property-ownership proof.

The account queue keeps all owner/agent accounts visible but prioritizes accounts without a valid role badge so the operational queue aligns with its count. Existing moderator authorization, self-verification prohibition, audit tables, report actions and listing publication/rejection rules remain unchanged.

## Regression boundary

`npm run listingmoderationqa` guards the tenant-policy exclusivity contract, readiness parity, EN/BN moderation copy, evidence wording, localized queue formatting, and actionable account ordering. CI also runs `supabase/tests/f27_listing_tenant_policy.sql` against a fresh/reset database to prove the exclusivity trigger accepts multiple specific renter types and rejects `everyone` mixed with specifics in either insertion order.

## Current mobile plan — Task 8 five-step listing editor

The phone editor keeps the existing retry-safe listing lifecycle and presents it as five explicit steps:

1. Basics & pricing
2. Home details
3. Renter fit
4. Exact map pin
5. Photos & video

The active step stays centered in the mobile step rail and Back/Continue remain visible beneath it. The bottom action surface is singular: steps 1–4 expose **Save draft**, while step 5 exposes **Save draft** plus **Submit for review**. Submission validation and the atomic `ensure_property_draft` → `save_property_draft` → `submit_property_for_review` sequence are unchanged.

Mobile fields retain at least 48px primary controls and 16px input text, exact-location controls stay within the dynamic viewport, and media editing becomes horizontally swipeable with touch-sized reorder/cover/remove actions. Browser draft recovery and leave protection remain enabled.

The renter-policy picker now mirrors the database invariant directly: selecting **Everyone** clears specific renter types, while selecting a specific renter type clears **Everyone**. The canonical database/readiness validation remains the final enforcement boundary.

Listing editor routes remain contextual, so the global mobile tab bar stays suppressed while owners are creating or editing a property.

## Current mobile plan — Task 9 moderator workspace

Mobile moderation keeps the existing moderator-only authorization and audit behavior, but compresses the workbench into a queue-first phone flow:

- listing reviews, reports and accounts remain directly switchable from a sticky three-queue navigator with localized counts;
- queue rows become compact evidence summaries that keep the oldest-first ordering and existing route destinations;
- listing/report review screens keep evidence before actions in DOM order, with horizontally scannable attention/media rails and a single-column inspection stack;
- missing review evidence uses explicit localized **Not provided** copy rather than an ambiguous dash;
- approve/return, resolve/hide and issue/revoke controls retain their existing database inserts and redirects, but use distinct mobile action roles with 48px touch targets and 16px note inputs;
- destructive actions remain visually distinct without changing their authorization, note requirements, or audit-table semantics;
- account trust review retains the legal-ownership/government-identity disclaimer and the existing self-verification prohibition.

No moderation RLS, publication/rejection behavior, report resolution semantics, role-badge rules, or audit integrity constraints are changed by Task 9.
