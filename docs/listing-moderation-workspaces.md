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
