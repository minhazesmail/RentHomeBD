# RentHomeBD Supabase

## Source of truth

**`supabase/migrations/` is the only schema source of truth.**

`schema.sql` is a **historical Task 2 snapshot** kept for reference. Do not apply it on a fresh project by itself. Always apply the full ordered migration set.

The foundational migration is `20260828153047_core_rental_schema.sql`. This file was restored from the migration already recorded in the RentHomeBD Supabase project, so its historical timestamp must not be changed or duplicated. Later migrations depend on the schemas, enums, tables, grants, RLS policies, indexes, and helper trigger it creates.

## What the migrations cover

- Profiles linked 1:1 to `auth.users` (provisioning trigger)
- Property listings with PostGIS geography + GiST index
- Tenant types, amenities, media metadata
- Listing lifecycle (draft → moderation → available → reconfirm / rented / expired / rejected)
- Moderators and moderation action audit trail
- Saved homes and saved searches
- Private messaging with abuse controls
- Account trust (phone verification sync, role verification by moderators)
- Listing reports, freshness controls, storage path hardening
- RLS policies and column-level grants (including locked `primary_role` updates)

## Security model (summary)

- Anonymous users may only read currently **available**, published, non-expired listings and related public metadata.
- Authenticated owners manage their own listings (including non-public states).
- Profiles are private to the owning user; moderators get controlled read access via membership.
- `primary_role` is set at signup by a security-definer trigger (from metadata) and cannot be changed by clients afterward.
- Role verification badges and phone verification timestamps are not client-writable trust flags.
- Public owner identity/trust fields on listings are database-maintained snapshots. They are refreshed when a listing becomes available, when an owner reconfirms an active listing, and while an available listing's profile trust state changes.
- SMS provider credentials must never appear in `NEXT_PUBLIC_*` or the app repo (see `docs/phone-otp-production.md`).

## Fresh local verification

A clean database must be reproducible from the repository alone. With Docker available and the Supabase CLI installed:

```bash
supabase init --force
supabase db start
supabase db reset
```

`supabase db start` applies the ordered migrations to a fresh local database, and `supabase db reset` destroys and recreates that database from the same migration history. CI runs both commands on pull requests so a missing or out-of-order foundation cannot silently ship again.

Do not run `supabase db reset --linked` against production.

## Applying to a project

1. Link the CLI to the intended Supabase project.
2. Compare local and remote migration history before pushing.
3. Run `supabase db push` (or equivalent) so only migrations not already recorded remotely are applied.
4. Run Supabase security/performance advisors.
5. Regenerate types:

```bash
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

6. Keep `database.types.ts` committed and in sync after every schema change.

## Publishing rules

Minimum photo count and required tenant types are enforced at the publish / moderation transition (not only as row checks). See the listing workflow and completeness migrations.
