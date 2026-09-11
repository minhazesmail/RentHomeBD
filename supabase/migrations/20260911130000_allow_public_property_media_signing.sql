-- F26: Public listing media stays in the private property-media bucket, but
-- anonymous/renter pages must be allowed to ask Storage for short-lived signed
-- URLs. Keep owner identity private while validating both path segments.

create or replace function public.is_public_property_media_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.properties property
    where property.id::text = (storage.foldername(object_name))[2]
      and property.owner_id::text = (storage.foldername(object_name))[1]
      and property.status = 'available'::public.listing_status
      and property.published_at is not null
      and (property.expires_at is null or property.expires_at > now())
  );
$$;

revoke all on function public.is_public_property_media_path(text) from public;
revoke all on function public.is_public_property_media_path(text) from anon, authenticated;
grant execute on function public.is_public_property_media_path(text) to anon, authenticated;

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
  and public.is_public_property_media_path(name)
);
