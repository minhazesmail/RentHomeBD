-- Keep profile role and owned listing lifecycle consistent.
-- Owners/agents may only switch back to renter after all owned listings are terminal or removed.

create or replace function private.guard_profile_role_downgrade_with_active_listings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.primary_role is distinct from old.primary_role
     and old.primary_role in ('owner'::public.profile_role, 'agent'::public.profile_role)
     and new.primary_role = 'renter'::public.profile_role
  then
    if exists (
      select 1
      from public.properties p
      where p.owner_id = old.id
        and p.status in (
          'draft'::public.listing_status,
          'pending_review'::public.listing_status,
          'rejected'::public.listing_status,
          'available'::public.listing_status,
          'pending_confirmation'::public.listing_status
        )
    ) then
      raise exception 'Resolve or remove active listings before switching this account to renter';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_profile_role_downgrade_with_active_listings() from public;

drop trigger if exists profile_role_downgrade_requires_terminal_listings on public.profiles;
create trigger profile_role_downgrade_requires_terminal_listings
before update of primary_role on public.profiles
for each row execute function private.guard_profile_role_downgrade_with_active_listings();
