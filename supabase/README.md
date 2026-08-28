# RentHomeBD Supabase foundation

`schema.sql` contains the Task 2 database foundation for the rental marketplace.

## Included

- user profiles linked 1:1 to `auth.users`
- property listings with structured rental fields
- exact latitude/longitude plus a PostGIS `geography(Point, 4326)` column and GiST index
- mandatory-capable normalized tenant-type associations
- normalized amenities and property amenities
- property photo/video metadata
- listing lifecycle states for draft, moderation, availability, reconfirmation, rented, expiry, and rejection
- explicit Data API grants and Row Level Security policies
- ownership indexes and map/search indexes
- automatic `updated_at` triggers

## Security model

Public/anonymous users can only read currently available, published, non-expired properties and their associated tenant types, amenities, and media metadata. Authenticated owners can read and manage their own listings, including non-public states. Profiles are private to their authenticated user in this phase.

Verification/moderation authority is intentionally not stored as user-editable profile flags. Admin/moderator authorization and ID verification will be introduced separately so those fields cannot be self-elevated by clients.

## Applying the schema

A dedicated Supabase project has not been created from this repository yet. When the project is created:

1. Enable/use PostGIS in the `extensions` schema.
2. Use the Supabase CLI to create the migration file (`supabase migration new ...`) rather than manually inventing a migration filename.
3. Apply the contents of `schema.sql` through that migration.
4. Run database tests and Supabase security/performance advisors.
5. Generate TypeScript database types and commit them to the app.

The photo-count publishing rule (minimum 3 photos) and tenant-type required rule are cross-row workflow rules. They should be enforced at the publish transition rather than as simple row constraints; that publish workflow is intentionally outside Task 2.
