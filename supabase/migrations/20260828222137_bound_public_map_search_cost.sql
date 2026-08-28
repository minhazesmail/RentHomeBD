-- Bound public map-search inputs and add the spatial index used by ST_DWithin.

create index if not exists properties_location_gist_idx
on public.properties
using gist (location);

alter table public.saved_searches
  drop constraint if exists saved_searches_radius,
  drop constraint if exists saved_searches_min_rent,
  drop constraint if exists saved_searches_max_rent,
  drop constraint if exists saved_searches_bedrooms;

alter table public.saved_searches
  add constraint saved_searches_radius
    check (radius_km is not null and radius_km between 0.5 and 100),
  add constraint saved_searches_min_rent
    check (min_rent is null or min_rent between 0 and 10000000),
  add constraint saved_searches_max_rent
    check (max_rent is null or max_rent between 0 and 10000000),
  add constraint saved_searches_bedrooms
    check (min_bedrooms is null or min_bedrooms between 0 and 20);

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
  distance_meters double precision,
  cover_media_path text
)
language plpgsql
security invoker
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
  select
    p.id, p.title, p.address_text, p.property_type, p.rent_bdt, p.bedrooms, p.bathrooms,
    p.furnishing, p.available_from, p.latitude, p.longitude,
    extensions.st_distance(p.location, extensions.st_point(center_long, center_lat)::extensions.geography) as distance_meters,
    (
      select pm.storage_path
      from public.property_media pm
      where pm.property_id = p.id and pm.media_type = 'photo'::public.media_type
      order by pm.sort_order, pm.created_at
      limit 1
    ) as cover_media_path
  from public.properties p
  where p.status = 'available'::public.listing_status
    and p.published_at is not null
    and (p.expires_at is null or p.expires_at > now())
    and p.location is not null
    and (min_rent is null or p.rent_bdt >= min_rent)
    and (max_rent is null or p.rent_bdt <= max_rent)
    and (min_bedrooms is null or coalesce(p.bedrooms, 0) >= min_bedrooms)
    and (
      renter_tenant_type is null
      or exists (
        select 1 from public.property_tenant_types ptt
        where ptt.property_id = p.id
          and (ptt.tenant_type = renter_tenant_type or ptt.tenant_type = 'everyone'::public.tenant_type)
      )
    )
    and extensions.st_dwithin(
      p.location,
      extensions.st_point(center_long, center_lat)::extensions.geography,
      radius_km * 1000
    )
  order by
    extensions.st_distance(p.location, extensions.st_point(center_long, center_lat)::extensions.geography) asc,
    p.updated_at desc
  limit 200;
end;
$$;

revoke all on function public.search_available_properties(double precision, double precision, double precision, integer, integer, public.tenant_type, smallint) from public;
grant execute on function public.search_available_properties(double precision, double precision, double precision, integer, integer, public.tenant_type, smallint) to anon, authenticated;
