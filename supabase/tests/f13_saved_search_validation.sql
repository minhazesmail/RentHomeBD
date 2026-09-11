\set ON_ERROR_STOP on

begin;

insert into auth.users (id, raw_user_meta_data)
values (
  'b1111111-1111-4111-8111-111111111111',
  '{"role":"renter","display_name":"Saved Search Bounds QA"}'::jsonb
);

-- Boundary values accepted by the public search contract must remain storable.
insert into public.saved_searches (
  id,
  user_id,
  name,
  center_lat,
  center_long,
  radius_km,
  min_rent,
  max_rent,
  min_bedrooms
)
values (
  'b9999999-9999-4999-8999-999999999991',
  'b1111111-1111-4111-8111-111111111111',
  'Valid saved search bounds',
  23.8103,
  90.4125,
  0.5,
  0,
  10000000,
  20
);

-- Radius is mandatory for persisted radius searches.
do $$
begin
  insert into public.saved_searches (
    user_id, name, center_lat, center_long, radius_km
  ) values (
    'b1111111-1111-4111-8111-111111111111',
    'Missing radius must fail',
    23.8103,
    90.4125,
    null
  );
  raise exception 'Expected NULL saved-search radius to fail';
exception
  when check_violation then null;
end;
$$;

-- The same 100 km public-query ceiling must apply to persisted searches.
do $$
begin
  insert into public.saved_searches (
    user_id, name, center_lat, center_long, radius_km
  ) values (
    'b1111111-1111-4111-8111-111111111111',
    'Oversized radius must fail',
    23.8103,
    90.4125,
    100.5
  );
  raise exception 'Expected oversized saved-search radius to fail';
exception
  when check_violation then null;
end;
$$;

-- Bedroom filters share the search RPC's 0..20 bound.
do $$
begin
  insert into public.saved_searches (
    user_id, name, center_lat, center_long, radius_km, min_bedrooms
  ) values (
    'b1111111-1111-4111-8111-111111111111',
    'Oversized bedroom filter must fail',
    23.8103,
    90.4125,
    15,
    21
  );
  raise exception 'Expected oversized saved-search bedroom filter to fail';
exception
  when check_violation then null;
end;
$$;

-- Rent filters must retain the same bounded public-search contract too.
do $$
begin
  insert into public.saved_searches (
    user_id, name, center_lat, center_long, radius_km, max_rent
  ) values (
    'b1111111-1111-4111-8111-111111111111',
    'Oversized rent filter must fail',
    23.8103,
    90.4125,
    15,
    10000001
  );
  raise exception 'Expected oversized saved-search rent filter to fail';
exception
  when check_violation then null;
end;
$$;

rollback;

\echo 'F13 saved-search validation QA passed.'
