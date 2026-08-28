create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role public.profile_role;
begin
  requested_role := case new.raw_user_meta_data ->> 'role'
    when 'owner' then 'owner'::public.profile_role
    when 'agent' then 'agent'::public.profile_role
    else 'renter'::public.profile_role
  end;

  insert into public.profiles (id, display_name, primary_role)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    requested_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

insert into public.profiles (id, display_name, primary_role)
select
  u.id,
  nullif(btrim(coalesce(u.raw_user_meta_data ->> 'display_name', '')), ''),
  case u.raw_user_meta_data ->> 'role'
    when 'owner' then 'owner'::public.profile_role
    when 'agent' then 'agent'::public.profile_role
    else 'renter'::public.profile_role
  end
from auth.users u
on conflict (id) do nothing;
