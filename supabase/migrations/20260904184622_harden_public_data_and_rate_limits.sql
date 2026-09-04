-- Keep reviewer notes private, publish approximate coordinates to anonymous
-- visitors, and make security-sensitive counters atomic and bounded.

revoke select on table public.properties from anon, authenticated;

grant select (
  id, title, description, address_text, property_type, rent_bdt, deposit_bdt,
  utilities_included, size_sqft, bedrooms, bathrooms, floor_number, total_floors,
  furnishing, gender_preference, available_from, published_at, expires_at,
  last_confirmed_at, status, created_at, updated_at, public_owner_display_name,
  public_owner_role, public_owner_phone_verified_at, public_owner_role_verified_at,
  public_owner_role_verified_role
) on public.properties to anon;

grant select (
  id, owner_id, title, description, address_text, property_type, rent_bdt,
  deposit_bdt, utilities_included, size_sqft, bedrooms, bathrooms, floor_number,
  total_floors, furnishing, gender_preference, available_from, latitude,
  longitude, location, status, published_at, last_confirmed_at, expires_at,
  created_at, updated_at, public_owner_display_name, public_owner_role,
  public_owner_phone_verified_at, public_owner_role_verified_at,
  public_owner_role_verified_role
) on public.properties to authenticated;

create or replace function public.get_my_property_moderation_notes(property_ids uuid[])
returns table (property_id uuid, moderation_notes text)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id, p.moderation_notes
  from public.properties p
  where p.id = any(coalesce(property_ids, array[]::uuid[]))
    and (
      p.owner_id = (select auth.uid())
      or exists (select 1 from public.moderators m where m.user_id = (select auth.uid()))
    );
$$;

revoke all on function public.get_my_property_moderation_notes(uuid[]) from public;
grant execute on function public.get_my_property_moderation_notes(uuid[]) to authenticated;

-- Landing cards need approximate points without restoring direct coordinate access.
create or replace function public.get_public_landing_inventory(p_limit integer default 3)
returns table (
  id uuid,
  title text,
  address_text text,
  property_type public.property_type,
  rent_bdt integer,
  bedrooms smallint,
  bathrooms smallint,
  furnishing public.furnishing_status,
  available_from date,
  latitude double precision,
  longitude double precision,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    p.id,
    p.title,
    p.address_text,
    p.property_type,
    p.rent_bdt,
    p.bedrooms,
    p.bathrooms,
    p.furnishing,
    p.available_from,
    round(p.latitude::numeric, 3)::double precision,
    round(p.longitude::numeric, 3)::double precision,
    p.published_at
  from public.properties p
  where p.status = 'available'
  order by p.published_at desc nulls last
  limit least(greatest(coalesce(p_limit, 3), 1), 12)
$$;

revoke all on function public.get_public_landing_inventory(integer) from public;
grant execute on function public.get_public_landing_inventory(integer) to anon, authenticated;

create or replace function public.search_available_properties(
  center_lat double precision default null,
  center_long double precision default null,
  radius_km double precision default null,
  min_rent integer default null,
  max_rent integer default null,
  renter_tenant_type public.tenant_type default null,
  min_bedrooms smallint default null
)
returns table (
  id uuid, title text, address_text text, property_type public.property_type,
  rent_bdt integer, bedrooms smallint, bathrooms smallint,
  furnishing public.furnishing_status, available_from date,
  latitude double precision, longitude double precision,
  distance_meters double precision, cover_media_path text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if center_lat is null or center_long is null then raise exception 'Search center is required'; end if;
  if center_lat < -90 or center_lat > 90 then raise exception 'Search latitude is outside the allowed range'; end if;
  if center_long < -180 or center_long > 180 then raise exception 'Search longitude is outside the allowed range'; end if;
  if radius_km is null or radius_km < 0.5 or radius_km > 100 then raise exception 'Search radius must be between 0.5 and 100 km'; end if;
  if min_rent is not null and (min_rent < 0 or min_rent > 10000000) then raise exception 'Minimum rent is outside the allowed range'; end if;
  if max_rent is not null and (max_rent < 0 or max_rent > 10000000) then raise exception 'Maximum rent is outside the allowed range'; end if;
  if min_rent is not null and max_rent is not null and min_rent > max_rent then raise exception 'Minimum rent cannot be higher than maximum rent'; end if;
  if min_bedrooms is not null and (min_bedrooms < 0 or min_bedrooms > 20) then raise exception 'Bedroom filter is outside the allowed range'; end if;

  return query
  select p.id, p.title, p.address_text, p.property_type, p.rent_bdt, p.bedrooms,
    p.bathrooms, p.furnishing, p.available_from,
    round(p.latitude::numeric, 3)::double precision,
    round(p.longitude::numeric, 3)::double precision,
    extensions.st_distance(p.location, extensions.st_point(center_long, center_lat)::extensions.geography),
    (select pm.storage_path from public.property_media pm
      where pm.property_id = p.id and pm.media_type = 'photo'::public.media_type
      order by pm.sort_order, pm.created_at limit 1)
  from public.properties p
  where p.status = 'available'::public.listing_status
    and p.published_at is not null
    and (p.expires_at is null or p.expires_at > now())
    and p.location is not null
    and (min_rent is null or p.rent_bdt >= min_rent)
    and (max_rent is null or p.rent_bdt <= max_rent)
    and (min_bedrooms is null or coalesce(p.bedrooms, 0) >= min_bedrooms)
    and (renter_tenant_type is null or exists (
      select 1 from public.property_tenant_types ptt where ptt.property_id = p.id
        and (ptt.tenant_type = renter_tenant_type or ptt.tenant_type = 'everyone'::public.tenant_type)))
    and extensions.st_dwithin(p.location,
      extensions.st_point(center_long, center_lat)::extensions.geography, radius_km * 1000)
  order by extensions.st_distance(p.location,
    extensions.st_point(center_long, center_lat)::extensions.geography), p.updated_at desc
  limit 200;
end;
$$;

revoke all on function public.search_available_properties(double precision, double precision, double precision, integer, integer, public.tenant_type, smallint) from public;
grant execute on function public.search_available_properties(double precision, double precision, double precision, integer, integer, public.tenant_type, smallint) to anon, authenticated;

create or replace function public.get_public_property_detail(property_uuid uuid)
returns table (
  id uuid, title text, description text, address_text text, property_type public.property_type,
  rent_bdt integer, deposit_bdt integer, utilities_included text[], size_sqft integer, bedrooms integer,
  bathrooms integer, floor_number integer, total_floors integer, furnishing public.furnishing_status,
  gender_preference public.gender_preference, available_from date, latitude double precision, longitude double precision,
  published_at timestamptz, expires_at timestamptz, owner_display_name text, owner_role public.profile_role,
  owner_phone_verified_at timestamptz, owner_role_verified_at timestamptz, owner_role_verified_role public.profile_role,
  tenant_types public.tenant_type[], amenities jsonb, media jsonb
)
language sql security definer set search_path = '' stable as $$
  select p.id, p.title, p.description, p.address_text, p.property_type, p.rent_bdt, p.deposit_bdt,
    p.utilities_included, p.size_sqft, p.bedrooms, p.bathrooms, p.floor_number, p.total_floors,
    p.furnishing, p.gender_preference, p.available_from,
    round(p.latitude::numeric, 3)::double precision,
    round(p.longitude::numeric, 3)::double precision,
    p.published_at, p.expires_at, p.public_owner_display_name, p.public_owner_role,
    p.public_owner_phone_verified_at, p.public_owner_role_verified_at, p.public_owner_role_verified_role,
    coalesce((select array_agg(ptt.tenant_type order by ptt.tenant_type::text) from public.property_tenant_types ptt where ptt.property_id = p.id), array[]::public.tenant_type[]),
    coalesce((select jsonb_agg(jsonb_build_object('slug', a.slug, 'name', a.name) order by a.name) from public.property_amenities pa join public.amenities a on a.slug = pa.amenity_slug where pa.property_id = p.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('id', pm.id, 'storage_path', pm.storage_path, 'media_type', pm.media_type, 'sort_order', pm.sort_order) order by pm.sort_order, pm.created_at) from public.property_media pm where pm.property_id = p.id), '[]'::jsonb)
  from public.properties p
  where p.id = property_uuid and p.status = 'available'::public.listing_status
    and p.published_at is not null and (p.expires_at is null or p.expires_at > now());
$$;

revoke all on function public.get_public_property_detail(uuid) from public;
grant execute on function public.get_public_property_detail(uuid) to anon, authenticated;

create or replace function public.count_saved_search_matches(
  center_lat double precision, center_long double precision,
  radius_km double precision default null, min_rent integer default null,
  max_rent integer default null, renter_tenant_type public.tenant_type default null,
  min_bedrooms smallint default null, changed_since timestamptz default null
)
returns table (current_count bigint, new_count bigint)
language plpgsql security invoker set search_path = '' as $$
begin
  if center_lat is null or center_lat < -90 or center_lat > 90 then raise exception 'Search latitude is outside the allowed range'; end if;
  if center_long is null or center_long < -180 or center_long > 180 then raise exception 'Search longitude is outside the allowed range'; end if;
  if radius_km is not null and (radius_km < 0.5 or radius_km > 100) then raise exception 'Search radius must be between 0.5 and 100 km'; end if;
  if min_rent is not null and (min_rent < 0 or min_rent > 10000000) then raise exception 'Minimum rent is outside the allowed range'; end if;
  if max_rent is not null and (max_rent < 0 or max_rent > 10000000) then raise exception 'Maximum rent is outside the allowed range'; end if;
  if min_rent is not null and max_rent is not null and min_rent > max_rent then raise exception 'Minimum rent cannot be higher than maximum rent'; end if;
  if min_bedrooms is not null and (min_bedrooms < 0 or min_bedrooms > 20) then raise exception 'Bedroom filter is outside the allowed range'; end if;

  return query select count(*), count(*) filter (where changed_since is not null and p.published_at > changed_since)
  from public.properties p
  where p.status = 'available'::public.listing_status and p.published_at is not null
    and (p.expires_at is null or p.expires_at > now()) and p.location is not null
    and (min_rent is null or p.rent_bdt >= min_rent) and (max_rent is null or p.rent_bdt <= max_rent)
    and (min_bedrooms is null or coalesce(p.bedrooms, 0) >= min_bedrooms)
    and (renter_tenant_type is null or exists (select 1 from public.property_tenant_types ptt
      where ptt.property_id = p.id and (ptt.tenant_type = renter_tenant_type or ptt.tenant_type = 'everyone'::public.tenant_type)))
    and (radius_km is null or extensions.st_dwithin(p.location,
      extensions.st_point(center_long, center_lat)::extensions.geography, radius_km * 1000));
end;
$$;

revoke all on function public.count_saved_search_matches(double precision, double precision, double precision, integer, integer, public.tenant_type, smallint, timestamptz) from public;
grant execute on function public.count_saved_search_matches(double precision, double precision, double precision, integer, integer, public.tenant_type, smallint, timestamptz) to authenticated;

-- Serialize quota checks for one viewer so parallel calls cannot all pass the
-- same pre-insert count. The existing trigger/function is replaced in place.
create or replace function public.reveal_property_owner_phone(property_uuid uuid)
returns table(phone text, owner_phone_verified_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := (select auth.uid()); viewer_verified_at timestamptz;
  listing record; owner_phone text; recent_reveals integer;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(viewer::text, 0));
  select p.phone_verified_at into viewer_verified_at from public.profiles p where p.id = viewer;
  if viewer_verified_at is null then raise exception 'Phone verification required'; end if;
  select pr.owner_id, owner.phone_verified_at into listing
    from public.properties pr join public.profiles owner on owner.id = pr.owner_id
    where pr.id = property_uuid and pr.status = 'available'::public.listing_status
      and pr.published_at is not null and (pr.expires_at is null or pr.expires_at > now());
  if not found then raise exception 'Property is not currently available'; end if;
  if listing.owner_id = viewer then raise exception 'Owners cannot reveal their own contact through this endpoint'; end if;
  if listing.phone_verified_at is null then raise exception 'Owner phone is not verified'; end if;
  select count(*)::integer into recent_reveals from private.phone_reveal_events e
    where e.viewer_id = viewer and e.revealed_at > now() - interval '1 hour';
  if recent_reveals >= 20 then raise exception 'Phone reveal rate limit reached'; end if;
  select u.phone into owner_phone from auth.users u where u.id = listing.owner_id;
  if owner_phone is null or btrim(owner_phone) = '' then raise exception 'Owner phone is unavailable'; end if;
  insert into private.phone_reveal_events (viewer_id, property_id, owner_id) values (viewer, property_uuid, listing.owner_id);
  return query select owner_phone, listing.phone_verified_at;
end;
$$;

revoke all on function public.reveal_property_owner_phone(uuid) from public;
grant execute on function public.reveal_property_owner_phone(uuid) to authenticated;

create or replace function public.replace_property_listing_relations(
  property_uuid uuid,
  tenant_values public.tenant_type[],
  amenity_values text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare listing_status public.listing_status;
begin
  select p.status into listing_status
  from public.properties p
  where p.id = property_uuid and p.owner_id = (select auth.uid())
  for update;

  if not found then raise exception 'Property not found or access denied'; end if;
  if listing_status not in ('draft'::public.listing_status, 'rejected'::public.listing_status) then
    raise exception 'Listing relations are locked at this stage';
  end if;

  delete from public.property_tenant_types where property_id = property_uuid;
  insert into public.property_tenant_types (property_id, tenant_type)
    select property_uuid, value from unnest(coalesce(tenant_values, array[]::public.tenant_type[])) value;

  delete from public.property_amenities where property_id = property_uuid;
  insert into public.property_amenities (property_id, amenity_slug)
    select property_uuid, value from unnest(coalesce(amenity_values, array[]::text[])) value;
end;
$$;

revoke all on function public.replace_property_listing_relations(uuid, public.tenant_type[], text[]) from public;
grant execute on function public.replace_property_listing_relations(uuid, public.tenant_type[], text[]) to authenticated;
