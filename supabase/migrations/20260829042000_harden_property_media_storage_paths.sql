-- Bind storage paths to both the authenticated user and a property that user owns.
-- This prevents orphaned uploads and prevents files from being placed under another
-- owner's public property path.

drop policy if exists "owners can read own property media files" on storage.objects;
create policy "owners can read own property media files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'property-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.properties p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "owners can upload own property media files" on storage.objects;
create policy "owners can upload own property media files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'property-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.properties p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "owners can update own property media files" on storage.objects;
create policy "owners can update own property media files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'property-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.properties p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'property-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.properties p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "owners can delete own property media files" on storage.objects;
create policy "owners can delete own property media files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'property-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.properties p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "public can read media files for available properties" on storage.objects;
create policy "public can read media files for available properties"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'property-media'
  and storage.allow_any_operation(array['object.get_authenticated_info', 'object.get_authenticated'])
  and exists (
    select 1
    from public.properties p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id::text = (storage.foldername(name))[1]
      and p.status = 'available'::public.listing_status
      and p.published_at is not null
      and (p.expires_at is null or p.expires_at > now())
  )
);
