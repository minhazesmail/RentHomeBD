-- Remove a duplicate spatial index and consolidate equivalent permissive SELECT
-- policies so each authenticated read evaluates one policy per table.

drop index if exists public.properties_location_gist_idx;

drop policy if exists "users can read own profile" on public.profiles;
drop policy if exists "moderators can read profiles" on public.profiles;
create policy "authenticated can read own profile or moderator-visible profiles"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.moderators m
    where m.user_id = (select auth.uid())
  )
);

drop policy if exists "authenticated can read public or own properties" on public.properties;
drop policy if exists "moderators can read properties" on public.properties;
create policy "authenticated can read public own or moderated properties"
on public.properties
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or (
    status = 'available'::public.listing_status
    and published_at is not null
    and (expires_at is null or expires_at > now())
  )
  or exists (
    select 1
    from public.moderators m
    where m.user_id = (select auth.uid())
  )
);
