-- F26: Public pages create signed URLs for media in the private property-media
-- bucket. Keep the existing publication predicate and authorize only the
-- Storage operations required for authenticated object reads and signed URLs.
--
-- Supabase Storage exposes signing as storage.object.sign and
-- storage.object.sign_many. storage.allow_any_operation() normalizes the
-- storage. prefix, so the legacy read operation names below remain compatible.

drop policy if exists "public can read media files for available properties" on storage.objects;

create policy "public can read media files for available properties"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'property-media'
  and storage.allow_any_operation(array[
    'object.get_authenticated_info',
    'object.get_authenticated',
    'storage.object.sign',
    'storage.object.sign_many'
  ])
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
