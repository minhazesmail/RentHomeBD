-- Refresh the public owner identity/trust snapshot whenever a listing becomes
-- available, including owner freshness reconfirmation from pending_confirmation.
-- This keeps renter-facing trust data tied to the publication/reconfirmation
-- event instead of waiting for a later profile update to refresh it.

create or replace function private.refresh_property_owner_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  should_refresh boolean := false;
begin
  if tg_op = 'INSERT' then
    should_refresh := new.status = 'available'::public.listing_status;
  else
    should_refresh :=
      new.status = 'available'::public.listing_status
      and (
        new.status is distinct from old.status
        or new.last_confirmed_at is distinct from old.last_confirmed_at
        or new.owner_id is distinct from old.owner_id
      );
  end if;

  if not should_refresh then
    return new;
  end if;

  select
    profile.display_name,
    profile.primary_role,
    profile.phone_verified_at,
    profile.role_verified_at,
    profile.role_verified_role
  into
    new.public_owner_display_name,
    new.public_owner_role,
    new.public_owner_phone_verified_at,
    new.public_owner_role_verified_at,
    new.public_owner_role_verified_role
  from public.profiles profile
  where profile.id = new.owner_id;

  if not found then
    raise exception 'Property owner profile not found';
  end if;

  return new;
end;
$$;

revoke all on function private.refresh_property_owner_snapshot() from public;

drop trigger if exists properties_refresh_public_owner_snapshot on public.properties;
create trigger properties_refresh_public_owner_snapshot
before insert or update on public.properties
for each row execute function private.refresh_property_owner_snapshot();

-- Align existing active/reconfirmation listings with the current profile state.
-- Future available transitions are maintained by the trigger above, while
-- profile_trust_syncs_public_listings continues to keep already-available rows
-- current when trust/profile data itself changes.
update public.properties property
set public_owner_display_name = profile.display_name,
    public_owner_role = profile.primary_role,
    public_owner_phone_verified_at = profile.phone_verified_at,
    public_owner_role_verified_at = profile.role_verified_at,
    public_owner_role_verified_role = profile.role_verified_role
from public.profiles profile
where profile.id = property.owner_id
  and property.status in (
    'available'::public.listing_status,
    'pending_confirmation'::public.listing_status
  );
