# Tasks 10–11 — Messaging and dashboard workspaces

This batch continues the authenticated NearBasha redesign after the Saved and Owner workspaces. It does not change database permissions, realtime message delivery, read receipts, abuse controls, listing lifecycle RPCs, or public property visibility rules.

## Task 10 — Messaging / Inbox continuity

Messages remain property-scoped conversations, with the inbox and active thread presented as one workspace. Opening a conversation must preserve the inbox page, search query, and unread filter so renters and owners can inspect a thread and return to the exact organized inbox state they came from. The thread-side inbox uses the same state rather than silently jumping back to page 1.

One server request-time clock is shared by inbox relative timestamps and the thread property-availability summary. This avoids different parts of the same rendered workspace evaluating “now” at slightly different moments.

Participant trust language must describe only the evidence NearBasha actually has. The current conversation trust RPC exposes phone-verification state, so the UI may say **phone verified**; it must not convert that into a generic “Verified” identity, role, or property-ownership claim. Existing block/report controls and realtime/read-receipt behavior remain unchanged.

## Task 11 — Account / Dashboard trust and renter-default workspace

The dashboard is a localized EN/BN workspace for renter and owner next actions, saved activity, unread conversations, renter-type defaults, listing freshness, and account trust. Platform-owned dashboard copy, counts, tenant labels, and actions must follow the current locale. User-authored display names are shown as stored.

A renter profile may carry a **profile default** renter type to prefill new tenant-first searches. Valid renter identities are Family, Bachelor, Student, and Job holder. `Everyone` remains a listing policy, not a renter identity. A legacy account with no valid default receives a choose-renter-type prompt; an empty value cannot be saved as a new default. The profile default does not lock a renter into one identity forever: each search can still deliberately choose a different renter type, but personalized search itself continues to require renter context.

Owner dashboard freshness must agree with the Owner portfolio. Both surfaces use the same shared 3-day freshness predicate: `pending_confirmation` and `rejected` listings need action, and an `available` listing also enters the action queue when its confirmation expires within three days. A single server request clock is used to evaluate the dashboard counts for that render.

## Regression boundary

`npm run accountworkspaceqa` guards message-state continuity, request-clock usage, explicit phone-verification wording, dashboard localization, renter identity/default rules, and shared owner freshness. The check also runs inside the standard `uiqa` chain so later visual or workflow changes cannot silently split these contracts again.
