-- Phase 1 security: prevent authenticated clients from changing primary_role.
-- Role is assigned only by:
--   1. private.handle_new_auth_user (signup metadata, security definer)
--   2. Future security-definer admin/moderator paths
-- Clients may still update display_name and avatar_path.

revoke update on table public.profiles from authenticated;

grant update (display_name, avatar_path) on table public.profiles to authenticated;

-- preferred_tenant_type is used by the renter preference UI; grant if the column exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'preferred_tenant_type'
  ) then
    execute 'grant update (display_name, avatar_path, preferred_tenant_type) on table public.profiles to authenticated';
  end if;
end;
$$;
