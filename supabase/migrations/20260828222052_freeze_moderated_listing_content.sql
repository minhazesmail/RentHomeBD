-- Prevent owners from changing moderated listing content without returning it to review.
-- Available and pending-confirmation listings may only use the explicit freshness/rented transitions.

create or replace function private.guard_owner_moderated_listing_content()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  acting_user uuid := (select auth.uid());
begin
  if acting_user is not null
     and acting_user = old.owner_id
     and old.status in ('available'::public.listing_status, 'pending_confirmation'::public.listing_status)
  then
    if new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.address_text is distinct from old.address_text
       or new.property_type is distinct from old.property_type
       or new.rent_bdt is distinct from old.rent_bdt
       or new.deposit_bdt is distinct from old.deposit_bdt
       or new.utilities_included is distinct from old.utilities_included
       or new.size_sqft is distinct from old.size_sqft
       or new.bedrooms is distinct from old.bedrooms
       or new.bathrooms is distinct from old.bathrooms
       or new.floor_number is distinct from old.floor_number
       or new.total_floors is distinct from old.total_floors
       or new.furnishing is distinct from old.furnishing
       or new.gender_preference is distinct from old.gender_preference
       or new.available_from is distinct from old.available_from
       or new.latitude is distinct from old.latitude
       or new.longitude is distinct from old.longitude
       or new.location is distinct from old.location
    then
      raise exception 'Published listing details are locked. Return the listing to review before changing its content';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_owner_moderated_listing_content() from public;

drop trigger if exists properties_guard_owner_moderated_content on public.properties;
create trigger properties_guard_owner_moderated_content
before update on public.properties
for each row execute function private.guard_owner_moderated_listing_content();

alter policy "owners can add tenant types"
on public.property_tenant_types
to authenticated
with check (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
);

alter policy "owners can update tenant types"
on public.property_tenant_types
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
)
with check (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
);

alter policy "owners can delete tenant types"
on public.property_tenant_types
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
);

alter policy "owners can add property amenities"
on public.property_amenities
to authenticated
with check (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
);

alter policy "owners can update property amenities"
on public.property_amenities
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
)
with check (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
);

alter policy "owners can delete property amenities"
on public.property_amenities
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
);

alter policy "owners can add property media"
on public.property_media
to authenticated
with check (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
);

alter policy "owners can update property media"
on public.property_media
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
)
with check (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
);

alter policy "owners can delete property media"
on public.property_media
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
);

alter policy "owners can upload own property media files"
on storage.objects
to authenticated
with check (
  bucket_id = 'property-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.properties p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
);

alter policy "owners can update own property media files"
on storage.objects
to authenticated
using (
  bucket_id = 'property-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.properties p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
)
with check (
  bucket_id = 'property-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.properties p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
);

alter policy "owners can delete own property media files"
on storage.objects
to authenticated
using (
  bucket_id = 'property-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.properties p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
      and p.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
  )
);
