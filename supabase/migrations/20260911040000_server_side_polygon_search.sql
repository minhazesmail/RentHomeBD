-- F10: query drawn custom areas in PostGIS instead of filtering the bounded
-- radius result set in the browser.
--
-- The optional GeoJSON polygon keeps all existing radius callers compatible.
-- Public coordinate rounding, public-listing visibility checks, server-side
-- ordering, and the 200-row response bound remain unchanged.

drop function if exists public.search_available_properties(
  double precision,
  double precision,
  double precision,
  integer,
  integer,
  public.tenant_type,
  smallint,
  text,
  public.tenant_type
);

create or replace function public.search_available_properties(
  center_lat double precision default null,
  center_long double precision default null,
  radius_km double precision default null,
  min_rent integer default null,
  max_rent integer default null,
  renter_tenant_type public.tenant_type default null,
  min_bedrooms smallint default null,
  sort_mode text default 'distance',
  preferred_tenant_type public.tenant_type default null,
  search_polygon jsonb default null
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
  cover_media_path text,
  total_matches bigint,
  results_truncated boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  polygon_geometry extensions.geometry;
  polygon_ring jsonb;
  polygon_point jsonb;
  polygon_point_count integer;
begin
  if center_lat is null or center_long is null then
    raise exception 'Search center is required';
  end if;
  if center_lat < -90 or center_lat > 90 then
    raise exception 'Search latitude is outside the allowed range';
  end if;
  if center_long < -180 or center_long > 180 then
    raise exception 'Search longitude is outside the allowed range';
  end if;
  if radius_km is null or radius_km < 0.5 or radius_km > 100 then
    raise exception 'Search radius must be between 0.5 and 100 km';
  end if;
  if min_rent is not null and (min_rent < 0 or min_rent > 10000000) then
    raise exception 'Minimum rent is outside the allowed range';
  end if;
  if max_rent is not null and (max_rent < 0 or max_rent > 10000000) then
    raise exception 'Maximum rent is outside the allowed range';
  end if;
  if min_rent is not null and max_rent is not null and min_rent > max_rent then
    raise exception 'Minimum rent cannot be higher than maximum rent';
  end if;
  if min_bedrooms is not null and (min_bedrooms < 0 or min_bedrooms > 20) then
    raise exception 'Bedroom filter is outside the allowed range';
  end if;
  if sort_mode not in ('recommended', 'distance', 'rent-asc', 'rent-desc') then
    raise exception 'Search sort mode is not supported';
  end if;

  if search_polygon is not null then
    if coalesce(jsonb_typeof(search_polygon), 'null') <> 'object'
      or coalesce(search_polygon ->> 'type', '') <> 'Polygon'
      or coalesce(jsonb_typeof(search_polygon -> 'coordinates'), 'null') <> 'array'
    then
      raise exception 'Custom search polygon must be a GeoJSON Polygon';
    end if;

    if jsonb_array_length(search_polygon -> 'coordinates') <> 1 then
      raise exception 'Custom search polygon must contain exactly one exterior ring';
    end if;

    polygon_ring := search_polygon -> 'coordinates' -> 0;
    if coalesce(jsonb_typeof(polygon_ring), 'null') <> 'array' then
      raise exception 'Custom search polygon ring is invalid';
    end if;

    polygon_point_count := jsonb_array_length(polygon_ring);
    if polygon_point_count < 4 or polygon_point_count > 101 then
      raise exception 'Custom search polygon must contain between 3 and 100 vertices';
    end if;

    if polygon_ring -> 0 <> polygon_ring -> (polygon_point_count - 1) then
      raise exception 'Custom search polygon ring must be closed';
    end if;

    for polygon_point in
      select value
      from jsonb_array_elements(polygon_ring)
    loop
      if coalesce(jsonb_typeof(polygon_point), 'null') <> 'array'
        or jsonb_array_length(polygon_point) <> 2
        or coalesce(jsonb_typeof(polygon_point -> 0), 'null') <> 'number'
        or coalesce(jsonb_typeof(polygon_point -> 1), 'null') <> 'number'
      then
        raise exception 'Custom search polygon coordinates are invalid';
      end if;

      if (polygon_point ->> 0)::double precision < -180
        or (polygon_point ->> 0)::double precision > 180
        or (polygon_point ->> 1)::double precision < -90
        or (polygon_point ->> 1)::double precision > 90
      then
        raise exception 'Custom search polygon coordinates are outside the allowed range';
      end if;
    end loop;

    polygon_geometry := extensions.st_geomfromgeojson(search_polygon);
    if polygon_geometry is null or not extensions.st_isvalid(polygon_geometry) then
      raise exception 'Custom search polygon is invalid';
    end if;

    if extensions.st_area(polygon_geometry::extensions.geography) <= 1 then
      raise exception 'Custom search polygon is too small';
    end if;

    -- Keep public custom-area queries within the same broad area envelope as
    -- the existing 100 km maximum radius search.
    if extensions.st_area(polygon_geometry::extensions.geography) > 31415926536 then
      raise exception 'Custom search polygon is too large';
    end if;
  end if;

  return query
  with candidates as (
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
      round(p.latitude::numeric, 3)::double precision as latitude,
      round(p.longitude::numeric, 3)::double precision as longitude,
      extensions.st_distance(
        p.location,
        extensions.st_point(center_long, center_lat)::extensions.geography
      ) as distance_meters,
      p.updated_at,
      case
        when preferred_tenant_type is null or preferred_tenant_type = 'everyone'::public.tenant_type then 1
        when exists (
          select 1
          from public.property_tenant_types preferred_ptt
          where preferred_ptt.property_id = p.id
            and preferred_ptt.tenant_type in (preferred_tenant_type, 'everyone'::public.tenant_type)
        ) then 0
        when not exists (
          select 1
          from public.property_tenant_types any_ptt
          where any_ptt.property_id = p.id
        ) then 1
        else 2
      end as compatibility_rank
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
          select 1
          from public.property_tenant_types filtered_ptt
          where filtered_ptt.property_id = p.id
            and (
              filtered_ptt.tenant_type = renter_tenant_type
              or filtered_ptt.tenant_type = 'everyone'::public.tenant_type
            )
        )
      )
      and (
        (
          search_polygon is null
          and extensions.st_dwithin(
            p.location,
            extensions.st_point(center_long, center_lat)::extensions.geography,
            radius_km * 1000
          )
        )
        or (
          search_polygon is not null
          and p.location operator(extensions.&&) polygon_geometry
          and extensions.st_intersects(
            p.location::extensions.geometry,
            polygon_geometry
          )
        )
      )
  ),
  ranked as (
    select
      candidates.*,
      count(*) over () as total_matches,
      row_number() over (
        order by
          case when sort_mode = 'recommended' then candidates.compatibility_rank end asc,
          case when sort_mode = 'rent-asc' then candidates.rent_bdt end asc nulls last,
          case when sort_mode = 'rent-desc' then candidates.rent_bdt end desc nulls last,
          candidates.distance_meters asc,
          candidates.updated_at desc,
          candidates.id asc
      ) as result_rank
    from candidates
  )
  select
    ranked.id,
    ranked.title,
    ranked.address_text,
    ranked.property_type,
    ranked.rent_bdt,
    ranked.bedrooms,
    ranked.bathrooms,
    ranked.furnishing,
    ranked.available_from,
    ranked.latitude,
    ranked.longitude,
    ranked.distance_meters,
    (
      select pm.storage_path
      from public.property_media pm
      where pm.property_id = ranked.id
        and pm.media_type = 'photo'::public.media_type
      order by pm.sort_order, pm.created_at
      limit 1
    ) as cover_media_path,
    ranked.total_matches,
    ranked.total_matches > 200 as results_truncated
  from ranked
  where ranked.result_rank <= 200
  order by ranked.result_rank;
end;
$$;

revoke all on function public.search_available_properties(
  double precision,
  double precision,
  double precision,
  integer,
  integer,
  public.tenant_type,
  smallint,
  text,
  public.tenant_type,
  jsonb
) from public;

grant execute on function public.search_available_properties(
  double precision,
  double precision,
  double precision,
  integer,
  integer,
  public.tenant_type,
  smallint,
  text,
  public.tenant_type,
  jsonb
) to anon, authenticated;
