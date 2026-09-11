\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (id, raw_user_meta_data)
values (
  'a1111111-1111-4111-8111-111111111111',
  '{"role":"owner","display_name":"Polygon Search QA"}'::jsonb
);

set local session_replication_role = replica;

insert into public.properties (
  id,
  owner_id,
  title,
  description,
  address_text,
  property_type,
  rent_bdt,
  deposit_bdt,
  bedrooms,
  bathrooms,
  furnishing,
  gender_preference,
  available_from,
  latitude,
  longitude,
  status,
  published_at,
  last_confirmed_at,
  expires_at
)
values
  (
    'a9999999-9999-4999-8999-999999999991',
    'a1111111-1111-4111-8111-111111111111',
    'Far inside custom polygon',
    'F10 polygon fixture outside the tiny radius',
    'Inside custom area',
    'apartment',
    25000,
    0,
    2,
    1,
    'unfurnished',
    'any',
    current_date,
    23.8504,
    90.4154,
    'available',
    now() - interval '2 days',
    now() - interval '1 day',
    now() + interval '20 days'
  ),
  (
    'a9999999-9999-4999-8999-999999999992',
    'a1111111-1111-4111-8111-111111111111',
    'Near radius but outside polygon',
    'F10 old-radius false-positive fixture',
    'Near map center',
    'apartment',
    18000,
    0,
    1,
    1,
    'unfurnished',
    'any',
    current_date,
    23.8104,
    90.4125,
    'available',
    now() - interval '2 days',
    now() - interval '1 day',
    now() + interval '20 days'
  ),
  (
    'a9999999-9999-4999-8999-999999999993',
    'a1111111-1111-4111-8111-111111111111',
    'Home on polygon boundary',
    'F10 boundary inclusion fixture',
    'On custom area edge',
    'apartment',
    32000,
    0,
    3,
    2,
    'furnished',
    'any',
    current_date,
    23.8400,
    90.4150,
    'available',
    now() - interval '2 days',
    now() - interval '1 day',
    now() + interval '20 days'
  );

set local session_replication_role = origin;
set local role anon;

-- The custom polygon is several kilometres north of the map center while the
-- radius is only 0.5 km. A correct polygon query must ignore that radius for
-- inclusion and must exclude the near-center listing outside the polygon.
select pg_temp.assert_true(
  (select count(*) = 2
   from public.search_available_properties(
     center_lat => 23.8103,
     center_long => 90.4125,
     radius_km => 0.5,
     sort_mode => 'distance',
     search_polygon => '{"type":"Polygon","coordinates":[[[90.41,23.84],[90.42,23.84],[90.42,23.86],[90.41,23.86],[90.41,23.84]]]}'::jsonb
   )),
  'polygon search must return the two homes inside/on the drawn area even outside the radius'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.search_available_properties(
      center_lat => 23.8103,
      center_long => 90.4125,
      radius_km => 0.5,
      search_polygon => '{"type":"Polygon","coordinates":[[[90.41,23.84],[90.42,23.84],[90.42,23.86],[90.41,23.86],[90.41,23.84]]]}'::jsonb
    )
    where id = 'a9999999-9999-4999-8999-999999999991'::uuid
  ),
  'polygon search must include a home outside the old radius when it is inside the polygon'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.search_available_properties(
      center_lat => 23.8103,
      center_long => 90.4125,
      radius_km => 0.5,
      search_polygon => '{"type":"Polygon","coordinates":[[[90.41,23.84],[90.42,23.84],[90.42,23.86],[90.41,23.86],[90.41,23.84]]]}'::jsonb
    )
    where id = 'a9999999-9999-4999-8999-999999999992'::uuid
  ),
  'polygon search must exclude a home inside the radius but outside the polygon'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.search_available_properties(
      center_lat => 23.8103,
      center_long => 90.4125,
      radius_km => 0.5,
      search_polygon => '{"type":"Polygon","coordinates":[[[90.41,23.84],[90.42,23.84],[90.42,23.86],[90.41,23.86],[90.41,23.84]]]}'::jsonb
    )
    where id = 'a9999999-9999-4999-8999-999999999993'::uuid
  ),
  'polygon boundary points must be included'
);

select pg_temp.assert_true(
  (select total_matches = 2 and not results_truncated
   from public.search_available_properties(
     center_lat => 23.8103,
     center_long => 90.4125,
     radius_km => 0.5,
     search_polygon => '{"type":"Polygon","coordinates":[[[90.41,23.84],[90.42,23.84],[90.42,23.86],[90.41,23.86],[90.41,23.84]]]}'::jsonb
   )
   limit 1),
  'polygon search metadata must count the polygon candidate set rather than the radius set'
);

select pg_temp.assert_true(
  (select latitude = 23.850 and longitude = 90.415
   from public.search_available_properties(
     center_lat => 23.8103,
     center_long => 90.4125,
     radius_km => 0.5,
     search_polygon => '{"type":"Polygon","coordinates":[[[90.41,23.84],[90.42,23.84],[90.42,23.86],[90.41,23.86],[90.41,23.84]]]}'::jsonb
   )
   where id = 'a9999999-9999-4999-8999-999999999991'::uuid),
  'polygon search must preserve three-decimal public coordinate rounding'
);

-- Ordinary radius callers must still use ST_DWithin semantics when no polygon
-- is supplied. This near-center home is the only fixture inside 0.5 km.
select pg_temp.assert_true(
  (select count(*) = 1
   from public.search_available_properties(
     center_lat => 23.8103,
     center_long => 90.4125,
     radius_km => 0.5
   )),
  'radius search semantics must remain unchanged when no polygon is provided'
);

-- Hard filters still apply to polygon candidates.
select pg_temp.assert_true(
  (select count(*) = 1
   from public.search_available_properties(
     center_lat => 23.8103,
     center_long => 90.4125,
     radius_km => 0.5,
     min_rent => 30000,
     search_polygon => '{"type":"Polygon","coordinates":[[[90.41,23.84],[90.42,23.84],[90.42,23.86],[90.41,23.86],[90.41,23.84]]]}'::jsonb
   )),
  'rent filters must be applied to polygon searches'
);

-- Invalid/unclosed GeoJSON must be rejected at the database boundary.
do $$
begin
  perform *
  from public.search_available_properties(
    center_lat => 23.8103,
    center_long => 90.4125,
    radius_km => 0.5,
    search_polygon => '{"type":"Polygon","coordinates":[[[90.41,23.84],[90.42,23.84],[90.42,23.86]]]}'::jsonb
  );
  raise exception 'Expected invalid polygon to be rejected';
exception
  when others then
    if sqlerrm = 'Expected invalid polygon to be rejected' then
      raise;
    end if;
    if sqlerrm not like 'Custom search polygon%' then
      raise exception 'Unexpected invalid polygon error: %', sqlerrm;
    end if;
end;
$$;

reset role;
rollback;

\echo 'F10 server-side polygon search QA passed.'
