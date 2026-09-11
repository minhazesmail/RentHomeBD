-- F07 follow-up: `location` is a derived geography column maintained by
-- private.prepare_property_listing() from latitude/longitude on every property
-- write. Comparing the derived geography value in the published-content guard
-- can reject an otherwise status-only live -> draft transition after the
-- prepare trigger normalizes it. Protect the source coordinates instead.
--
-- This does not weaken renter-facing content protection: latitude and longitude
-- remain frozen while a listing is public, and prepare_property_listing always
-- overwrites `location` from those protected source values.

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
    then
      raise exception 'Published listing details are locked. Return the listing to review before changing its content';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_owner_moderated_listing_content() from public;
