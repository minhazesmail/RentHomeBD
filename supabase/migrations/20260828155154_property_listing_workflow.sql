alter table public.properties
  alter column title drop not null,
  alter column property_type drop not null,
  alter column rent_bdt drop not null,
  alter column available_from drop not null,
  alter column latitude drop not null,
  alter column longitude drop not null;

drop policy if exists "users can create own properties" on public.properties;
create policy "owners and agents can create draft properties"
on public.properties
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and status = 'draft'::public.listing_status
  and exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.primary_role in ('owner'::public.profile_role, 'agent'::public.profile_role)
  )
);

revoke update on table public.properties from authenticated;
grant update (
  title, description, property_type, rent_bdt, deposit_bdt, utilities_included,
  size_sqft, bedrooms, bathrooms, floor_number, total_floors, furnishing,
  gender_preference, available_from, latitude, longitude, location, status
) on table public.properties to authenticated;

create or replace function private.prepare_property_listing()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  acting_user uuid := (select auth.uid());
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := extensions.st_point(new.longitude, new.latitude)::extensions.geography;
  else
    new.location := null;
  end if;

  if tg_op = 'UPDATE' and acting_user is not null and acting_user = new.owner_id then
    if new.status is distinct from old.status then
      if not (
        (old.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
          and new.status = 'pending_review'::public.listing_status)
        or (old.status = 'pending_review'::public.listing_status
          and new.status = 'draft'::public.listing_status)
        or (old.status in ('available'::public.listing_status, 'pending_confirmation'::public.listing_status)
          and new.status = 'rented'::public.listing_status)
      ) then
        raise exception 'Listing status transition is not allowed for the owner';
      end if;
    end if;
  end if;

  if new.status = 'pending_review'::public.listing_status then
    if new.title is null or char_length(btrim(new.title)) < 5 then raise exception 'A title of at least 5 characters is required before submission'; end if;
    if new.property_type is null then raise exception 'Property type is required before submission'; end if;
    if new.rent_bdt is null or new.rent_bdt <= 0 then raise exception 'Monthly rent is required before submission'; end if;
    if new.available_from is null then raise exception 'Availability date is required before submission'; end if;
    if new.latitude is null or new.longitude is null then raise exception 'Exact map coordinates are required before submission'; end if;
    if not exists (select 1 from public.property_tenant_types tenant where tenant.property_id = new.id) then raise exception 'Choose at least one preferred tenant type before submission'; end if;
    if not exists (select 1 from public.property_media media where media.property_id = new.id and media.media_type = 'photo'::public.media_type) then raise exception 'Upload at least one property photo before submission'; end if;
  end if;

  return new;
end;
$$;

revoke all on function private.prepare_property_listing() from public;

drop trigger if exists properties_prepare_listing on public.properties;
create trigger properties_prepare_listing
before insert or update on public.properties
for each row execute function private.prepare_property_listing();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-media', 'property-media', false, 20971520,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "owners can read own property media files" on storage.objects;
create policy "owners can read own property media files" on storage.objects for select to authenticated
using (bucket_id = 'property-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "owners can upload own property media files" on storage.objects;
create policy "owners can upload own property media files" on storage.objects for insert to authenticated
with check (bucket_id = 'property-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "owners can update own property media files" on storage.objects;
create policy "owners can update own property media files" on storage.objects for update to authenticated
using (bucket_id = 'property-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'property-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "owners can delete own property media files" on storage.objects;
create policy "owners can delete own property media files" on storage.objects for delete to authenticated
using (bucket_id = 'property-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
