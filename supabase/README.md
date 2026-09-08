# RentHomeBD Supabase

## Source of truth

**`supabase/migrations/` is the only schema source of truth.**

`schema.sql` is a **historical Task 2 snapshot** kept for reference. Do not apply it on a fresh project by itself. Always apply the full ordered migration set (CLI `supabase db push` or equivalent).

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
- SMS provider credentials must never appear in `NEXT_PUBLIC_*` or the app repo (see `docs/phone-otp-production.md`).

## Applying to a project

1. Enable PostGIS in the `extensions` schema.
2. Link the CLI to the project and run `supabase db push` (or apply migrations in timestamp order).
3. Run Supabase security/performance advisors.
4. Regenerate types:

```bash
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

5. Keep `database.types.ts` committed and in sync after every schema change.

## Publishing rules

Minimum photo count and required tenant types are enforced at the publish / moderation transition (not only as row checks). See the listing workflow and completeness migrations.
