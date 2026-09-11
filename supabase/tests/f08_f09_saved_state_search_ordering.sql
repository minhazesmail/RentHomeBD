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

-- One owner is enough for the public-search fixture. The normal auth trigger
-- provisions the matching profile row before we seed published listings.
insert into auth.users (id, raw_user_meta_data)
values (
  '81111111-1111-4111-8111-111111111111',
  '{"role":"owner","display_name":"Search Ordering QA"}'::jsonb
);

-- Build 200 very-close family listings. These deliberately fill the old
-- distance-first LIMIT 200 window.
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
select
  md5('f09-near-' || series)::uuid,
  '81111111-1111-4111-8111-111111111111'::uuid,
  'Nearby family home ' || series,
  'F09 ordering fixture',
  'Near search center',
  'apartment'::public.property_type,
  30000 + series,
  0,
  2,
  1,
  'unfurnished'::public.furnishing_status,
  'any'::public.gender_preference,
  current_date,
  23.8103 + (series * 0.000001),
  90.4125,
  'available'::public.listing_status,
  now() - interval '2 days',
  now() - interval '1 day',
  now() + interval '20 days'
from generate_series(1, 200) as series;

insert into public.property_tenant_types (property_id, tenant_type)
select md5('f09-near-' || series)::uuid, 'family'::public.tenant_type
from generate_series(1, 200) as series;

-- These two listings are several kilometres farther away, so neither belongs
-- to the nearest 200. They must still win when rent or renter-fit ordering is
-- applied before the response cap.
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
    '89999999-9999-4999-8999-999999999991',
    '81111111-1111-4111-8111-111111111111',
    'Farther best bachelor value',
    'F09 cheapest and preferred-type fixture',
    'Farther south of search center',
    'apartment',
    10000,
    0,
    2,
    1,
    'unfurnished',
    'any',
    current_date,
    23.8500,
    90.4125,
    'available',
    now() - interval '2 days',
    now() - interval '1 day',
    now() + interval '20 days'
  ),
  (
    '89999999-9999-4999-8999-999999999992',
    '81111111-1111-4111-8111-111111111111',
    'Farther premium bachelor home',
    'F09 highest-rent fixture',
    'Farther north of search center',
    'apartment',
    100000,
    0,
    3,
    2,
    'furnished',
    'any',
    current_date,
    23.8600,
    90.4125,
    'available',
    now() - interval '2 days',
    now() - interval '1 day',
    now() + interval '20 days'
  );

insert into public.property_tenant_types (property_id, tenant_type)
values
  ('89999999-9999-4999-8999-999999999991', 'bachelor'),
  ('89999999-9999-4999-8999-999999999992', 'bachelor');

set local session_replication_role = origin;

-- Exercise the same public role used by signed-out map searches.
set local role anon;

select pg_temp.assert_true(
  (select count(*) = 200 from public.search_available_properties(
    center_lat => 23.8103,
    center_long => 90.4125,
    radius_km => 10,
    sort_mode => 'distance'
  )),
  'distance search should keep the bounded 200-row response'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.search_available_properties(
      center_lat => 23.8103,
      center_long => 90.4125,
      radius_km => 10,
      sort_mode => 'distance'
    )
    where id in (
      '89999999-9999-4999-8999-999999999991'::uuid,
      '89999999-9999-4999-8999-999999999992'::uuid
    )
  ),
  'fixture must place both special homes outside the nearest 200'
);

select pg_temp.assert_true(
  (select id = '89999999-9999-4999-8999-999999999991'::uuid
   from public.search_available_properties(
     center_lat => 23.8103,
     center_long => 90.4125,
     radius_km => 10,
     sort_mode => 'rent-asc'
   )
   limit 1),
  'rent ascending must select the global cheapest match before LIMIT 200'
);

select pg_temp.assert_true(
  (select id = '89999999-9999-4999-8999-999999999992'::uuid
   from public.search_available_properties(
     center_lat => 23.8103,
     center_long => 90.4125,
     radius_km => 10,
     sort_mode => 'rent-desc'
   )
   limit 1),
  'rent descending must select the global highest-rent match before LIMIT 200'
);

select pg_temp.assert_true(
  (select id = '89999999-9999-4999-8999-999999999991'::uuid
   from public.search_available_properties(
     center_lat => 23.8103,
     center_long => 90.4125,
     radius_km => 10,
     sort_mode => 'recommended',
     preferred_tenant_type => 'bachelor'
   )
   limit 1),
  'recommended search must surface a preferred renter-type match outside the nearest 200'
);

select pg_temp.assert_true(
  (select total_matches = 202 and results_truncated
   from public.search_available_properties(
     center_lat => 23.8103,
     center_long => 90.4125,
     radius_km => 10,
     sort_mode => 'rent-asc'
   )
   limit 1),
  'search response must report total matches and truncation before the 200-row cap'
);

-- Existing callers that omit the new parameters must retain nearest-first
-- behavior through the defaults.
select pg_temp.assert_true(
  not exists (
    select 1
    from public.search_available_properties(23.8103, 90.4125, 10, null, null, null, null)
    where id = '89999999-9999-4999-8999-999999999991'::uuid
  ),
  'legacy seven-argument search calls must remain nearest-first'
);

reset role;
rollback;

\echo 'F08/F09 saved-state and server-side search ordering QA passed.'
