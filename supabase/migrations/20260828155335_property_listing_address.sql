alter table public.properties
  add column if not exists address_text text;

alter table public.properties
  drop constraint if exists properties_address_length;
alter table public.properties
  add constraint properties_address_length
  check (address_text is null or char_length(address_text) between 3 and 500);

revoke update on table public.properties from authenticated;
grant update (
  title, description, address_text, property_type, rent_bdt, deposit_bdt,
  utilities_included, size_sqft, bedrooms, bathrooms, floor_number, total_floors,
  furnishing, gender_preference, available_from, latitude, longitude, location, status
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
    if new.address_text is null or char_length(btrim(new.address_text)) < 3 then raise exception 'Address or area is required before submission'; end if;
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
