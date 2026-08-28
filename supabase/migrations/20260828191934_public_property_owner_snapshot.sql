alter table public.properties
  add column if not exists public_owner_display_name text,
  add column if not exists public_owner_role public.profile_role;

create or replace function private.apply_property_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status public.listing_status;
  owner_name text;
  owner_role public.profile_role;
begin
  if new.reviewer_id <> (select auth.uid()) then
    raise exception 'Reviewer identity does not match authenticated user';
  end if;

  if not exists (
    select 1 from public.moderators m
    where m.user_id = (select auth.uid())
  ) then
    raise exception 'Moderator access required';
  end if;

  select p.status into current_status
  from public.properties p
  where p.id = new.property_id
  for update;

  if current_status is distinct from 'pending_review'::public.listing_status then
    raise exception 'Only pending-review listings can be moderated';
  end if;

  if new.decision = 'approve'::public.moderation_decision then
    select profile.display_name, profile.primary_role
      into owner_name, owner_role
    from public.properties property
    join public.profiles profile on profile.id = property.owner_id
    where property.id = new.property_id;

    update public.properties
    set status = 'available'::public.listing_status,
        moderation_notes = null,
        published_at = coalesce(published_at, now()),
        last_confirmed_at = now(),
        expires_at = now() + interval '14 days',
        public_owner_display_name = owner_name,
        public_owner_role = owner_role
    where id = new.property_id;
  else
    update public.properties
    set status = 'rejected'::public.listing_status,
        moderation_notes = btrim(new.notes),
        published_at = null,
        last_confirmed_at = null,
        expires_at = null,
        public_owner_display_name = null,
        public_owner_role = null
    where id = new.property_id;
  end if;

  return new;
end;
$$;

revoke all on function private.apply_property_moderation() from public;

update public.properties p
set public_owner_display_name = profile.display_name,
    public_owner_role = profile.primary_role
from public.profiles profile
where profile.id = p.owner_id
  and p.status = 'available'::public.listing_status;

create or replace function public.get_public_property_detail(property_uuid uuid)
returns table (
  id uuid,
  title text,
  description text,
  address_text text,
  property_type public.property_type,
  rent_bdt integer,
  deposit_bdt integer,
  utilities_included text[],
  size_sqft integer,
  bedrooms integer,
  bathrooms integer,
  floor_number integer,
  total_floors integer,
  furnishing public.furnishing_status,
  gender_preference public.gender_preference,
  available_from date,
  latitude double precision,
  longitude double precision,
  published_at timestamptz,
  expires_at timestamptz,
  owner_display_name text,
  owner_role public.profile_role,
  tenant_types public.tenant_type[],
  amenities jsonb,
  media jsonb
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    p.id,
    p.title,
    p.description,
    p.address_text,
    p.property_type,
    p.rent_bdt,
    p.deposit_bdt,
    p.utilities_included,
    p.size_sqft,
    p.bedrooms,
    p.bathrooms,
    p.floor_number,
    p.total_floors,
    p.furnishing,
    p.gender_preference,
    p.available_from,
    p.latitude,
    p.longitude,
    p.published_at,
    p.expires_at,
    p.public_owner_display_name,
    p.public_owner_role,
    coalesce((
      select array_agg(ptt.tenant_type order by ptt.tenant_type::text)
      from public.property_tenant_types ptt
      where ptt.property_id = p.id
    ), array[]::public.tenant_type[]),
    coalesce((
      select jsonb_agg(jsonb_build_object('slug', a.slug, 'name', a.name) order by a.name)
      from public.property_amenities pa
      join public.amenities a on a.slug = pa.amenity_slug
      where pa.property_id = p.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', pm.id, 'storage_path', pm.storage_path, 'media_type', pm.media_type, 'sort_order', pm.sort_order) order by pm.sort_order, pm.created_at)
      from public.property_media pm
      where pm.property_id = p.id
    ), '[]'::jsonb)
  from public.properties p
  where p.id = property_uuid
    and p.status = 'available'::public.listing_status
    and p.published_at is not null
    and (p.expires_at is null or p.expires_at > now());
$$;

revoke all on function public.get_public_property_detail(uuid) from public;
grant execute on function public.get_public_property_detail(uuid) to anon, authenticated;
