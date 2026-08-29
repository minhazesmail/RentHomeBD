alter table public.profiles
add column if not exists preferred_tenant_type public.tenant_type;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role public.profile_role;
  requested_tenant_type public.tenant_type;
begin
  requested_role := case new.raw_user_meta_data ->> 'role'
    when 'owner' then 'owner'::public.profile_role
    when 'agent' then 'agent'::public.profile_role
    else 'renter'::public.profile_role
  end;

  requested_tenant_type := case
    when requested_role <> 'renter'::public.profile_role then null
    when new.raw_user_meta_data ->> 'tenant_type' = 'family' then 'family'::public.tenant_type
    when new.raw_user_meta_data ->> 'tenant_type' = 'bachelor' then 'bachelor'::public.tenant_type
    when new.raw_user_meta_data ->> 'tenant_type' = 'student' then 'student'::public.tenant_type
    when new.raw_user_meta_data ->> 'tenant_type' = 'job_holder' then 'job_holder'::public.tenant_type
    else null
  end;

  insert into public.profiles (id, display_name, primary_role, preferred_tenant_type)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    requested_role,
    requested_tenant_type
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public;
