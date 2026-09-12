-- Enforce one unambiguous listing tenant policy.
-- `everyone` means the listing accepts every renter type, so combining it with
-- specific renter identities is redundant and makes owner/reviewer UI ambiguous.

-- Normalize any historical ambiguous rows by keeping the broader `everyone`
-- policy and removing redundant specifics.
delete from public.property_tenant_types specific
where specific.tenant_type <> 'everyone'
  and exists (
    select 1
    from public.property_tenant_types universal
    where universal.property_id = specific.property_id
      and universal.tenant_type = 'everyone'
  );

create or replace function private.enforce_listing_tenant_policy_exclusivity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tenant_type = 'everyone' then
    if exists (
      select 1
      from public.property_tenant_types existing
      where existing.property_id = new.property_id
        and existing.tenant_type <> 'everyone'
    ) then
      raise exception using
        errcode = '23514',
        message = 'preferred tenant type policy cannot combine Everyone with specific renter types';
    end if;
  elsif exists (
    select 1
    from public.property_tenant_types existing
    where existing.property_id = new.property_id
      and existing.tenant_type = 'everyone'
  ) then
    raise exception using
      errcode = '23514',
      message = 'preferred tenant type policy cannot combine Everyone with specific renter types';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_listing_tenant_policy_exclusivity() from public;

create trigger property_tenant_types_enforce_exclusivity
before insert on public.property_tenant_types
for each row execute function private.enforce_listing_tenant_policy_exclusivity();
