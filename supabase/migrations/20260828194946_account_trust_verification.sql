create type public.profile_verification_decision as enum ('verify', 'revoke');

alter table public.profiles
  add column phone_verified_at timestamptz,
  add column role_verified_at timestamptz,
  add column role_verified_by uuid references public.profiles(id) on delete set null,
  add column role_verified_role public.profile_role,
  add constraint profiles_role_verification_consistency check (
    (role_verified_at is null and role_verified_by is null and role_verified_role is null)
    or
    (role_verified_at is not null and role_verified_by is not null and role_verified_role in ('owner'::public.profile_role, 'agent'::public.profile_role))
  );

alter table public.properties
  add column public_owner_phone_verified_at timestamptz,
  add column public_owner_role_verified_at timestamptz,
  add column public_owner_role_verified_role public.profile_role;

create table public.profile_verification_actions (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  decision public.profile_verification_decision not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint profile_verification_notes_length check (notes is null or char_length(notes) <= 1000),
  constraint profile_verification_revoke_notes check (
    decision <> 'revoke'::public.profile_verification_decision
    or (notes is not null and char_length(btrim(notes)) between 3 and 1000)
  )
);

create index profile_verification_actions_target_idx on public.profile_verification_actions(target_user_id, created_at desc);
create index profile_verification_actions_reviewer_idx on public.profile_verification_actions(reviewer_id, created_at desc);

alter table public.profile_verification_actions enable row level security;
revoke all on table public.profile_verification_actions from anon, authenticated;
grant select, insert on table public.profile_verification_actions to authenticated;

create policy "moderators can read profile verification actions"
on public.profile_verification_actions for select to authenticated
using (exists (select 1 from public.moderators m where m.user_id = (select auth.uid())));

create policy "moderators can create profile verification actions"
on public.profile_verification_actions for insert to authenticated
with check (
  reviewer_id = (select auth.uid())
  and exists (select 1 from public.moderators m where m.user_id = (select auth.uid()))
);

revoke update on table public.profiles from authenticated;
grant update (display_name, avatar_path, primary_role) on table public.profiles to authenticated;

create or replace function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_role public.profile_role;
begin
  requested_role := case new.raw_user_meta_data ->> 'role'
    when 'owner' then 'owner'::public.profile_role
    when 'agent' then 'agent'::public.profile_role
    else 'renter'::public.profile_role
  end;
  insert into public.profiles (id, display_name, primary_role, phone_verified_at)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    requested_role,
    case when new.phone is not null and new.phone_confirmed_at is not null then new.phone_confirmed_at else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_auth_user() from public;

create or replace function private.sync_profile_phone_verification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles
  set phone_verified_at = case when new.phone is not null and new.phone_confirmed_at is not null then new.phone_confirmed_at else null end
  where id = new.id;
  return new;
end;
$$;
revoke all on function private.sync_profile_phone_verification() from public;

drop trigger if exists on_auth_user_phone_verification_changed on auth.users;
create trigger on_auth_user_phone_verification_changed
after update of phone, phone_confirmed_at on auth.users
for each row execute function private.sync_profile_phone_verification();

create or replace function private.invalidate_role_verification_on_profile_role_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.primary_role is distinct from old.primary_role then
    new.role_verified_at := null;
    new.role_verified_by := null;
    new.role_verified_role := null;
  end if;
  return new;
end;
$$;
revoke all on function private.invalidate_role_verification_on_profile_role_change() from public;

drop trigger if exists profile_role_change_invalidates_verification on public.profiles;
create trigger profile_role_change_invalidates_verification
before update of primary_role on public.profiles
for each row execute function private.invalidate_role_verification_on_profile_role_change();

create or replace function private.sync_owner_trust_snapshots()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.properties
  set public_owner_display_name = new.display_name,
      public_owner_role = new.primary_role,
      public_owner_phone_verified_at = new.phone_verified_at,
      public_owner_role_verified_at = new.role_verified_at,
      public_owner_role_verified_role = new.role_verified_role
  where owner_id = new.id and status = 'available'::public.listing_status;
  return new;
end;
$$;
revoke all on function private.sync_owner_trust_snapshots() from public;

drop trigger if exists profile_trust_syncs_public_listings on public.profiles;
create trigger profile_trust_syncs_public_listings
after update of display_name, primary_role, phone_verified_at, role_verified_at, role_verified_role on public.profiles
for each row execute function private.sync_owner_trust_snapshots();

create or replace function private.apply_profile_verification_action()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_role public.profile_role;
begin
  if new.reviewer_id <> (select auth.uid()) then raise exception 'Reviewer identity does not match authenticated user'; end if;
  if not exists (select 1 from public.moderators m where m.user_id = (select auth.uid())) then raise exception 'Moderator access required'; end if;
  select p.primary_role into target_role from public.profiles p where p.id = new.target_user_id for update;
  if target_role not in ('owner'::public.profile_role, 'agent'::public.profile_role) then raise exception 'Only owner or agent accounts can receive a role verification badge'; end if;
  if new.decision = 'verify'::public.profile_verification_decision then
    update public.profiles set role_verified_at = now(), role_verified_by = new.reviewer_id, role_verified_role = target_role where id = new.target_user_id;
  else
    update public.profiles set role_verified_at = null, role_verified_by = null, role_verified_role = null where id = new.target_user_id;
  end if;
  return new;
end;
$$;
revoke all on function private.apply_profile_verification_action() from public;

drop trigger if exists profile_verification_action_apply on public.profile_verification_actions;
create trigger profile_verification_action_apply
after insert on public.profile_verification_actions
for each row execute function private.apply_profile_verification_action();

update public.profiles p
set phone_verified_at = case when u.phone is not null and u.phone_confirmed_at is not null then u.phone_confirmed_at else null end
from auth.users u where u.id = p.id;

update public.properties property
set public_owner_phone_verified_at = profile.phone_verified_at,
    public_owner_role_verified_at = profile.role_verified_at,
    public_owner_role_verified_role = profile.role_verified_role
from public.profiles profile
where profile.id = property.owner_id and property.status = 'available'::public.listing_status;

drop function public.get_public_property_detail(uuid);
create function public.get_public_property_detail(property_uuid uuid)
returns table (
  id uuid, title text, description text, address_text text, property_type public.property_type,
  rent_bdt integer, deposit_bdt integer, utilities_included text[], size_sqft integer, bedrooms integer,
  bathrooms integer, floor_number integer, total_floors integer, furnishing public.furnishing_status,
  gender_preference public.gender_preference, available_from date, latitude double precision, longitude double precision,
  published_at timestamptz, expires_at timestamptz, owner_display_name text, owner_role public.profile_role,
  owner_phone_verified_at timestamptz, owner_role_verified_at timestamptz, owner_role_verified_role public.profile_role,
  tenant_types public.tenant_type[], amenities jsonb, media jsonb
)
language sql security invoker set search_path = '' stable as $$
  select
    p.id, p.title, p.description, p.address_text, p.property_type, p.rent_bdt, p.deposit_bdt,
    p.utilities_included, p.size_sqft, p.bedrooms, p.bathrooms, p.floor_number, p.total_floors,
    p.furnishing, p.gender_preference, p.available_from, p.latitude, p.longitude, p.published_at,
    p.expires_at, p.public_owner_display_name, p.public_owner_role, p.public_owner_phone_verified_at,
    p.public_owner_role_verified_at, p.public_owner_role_verified_role,
    coalesce((select array_agg(ptt.tenant_type order by ptt.tenant_type::text) from public.property_tenant_types ptt where ptt.property_id = p.id), array[]::public.tenant_type[]),
    coalesce((select jsonb_agg(jsonb_build_object('slug', a.slug, 'name', a.name) order by a.name) from public.property_amenities pa join public.amenities a on a.slug = pa.amenity_slug where pa.property_id = p.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('id', pm.id, 'storage_path', pm.storage_path, 'media_type', pm.media_type, 'sort_order', pm.sort_order) order by pm.sort_order, pm.created_at) from public.property_media pm where pm.property_id = p.id), '[]'::jsonb)
  from public.properties p
  where p.id = property_uuid
    and p.status = 'available'::public.listing_status
    and p.published_at is not null
    and (p.expires_at is null or p.expires_at > now());
$$;
revoke all on function public.get_public_property_detail(uuid) from public;
grant execute on function public.get_public_property_detail(uuid) to anon, authenticated;
