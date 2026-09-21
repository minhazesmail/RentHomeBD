\set ON_ERROR_STOP on
begin;

-- Test the migrated function against isolated fixtures, never production rows.
create temporary table properties (like public.properties including defaults including generated);
create temporary table property_tenant_types (like public.property_tenant_types including defaults);
create temporary table property_media (like public.property_media including defaults);

do $$
declare definition text;
begin
  select pg_get_functiondef('public.search_available_properties(double precision,double precision,double precision,integer,integer,public.tenant_type,smallint,text,public.tenant_type,jsonb)'::regprocedure)
    into definition;
  definition := replace(definition, 'public.search_available_properties', 'pg_temp.search_available_properties');
  definition := replace(definition, 'public.properties', 'pg_temp.properties');
  definition := replace(definition, 'public.property_tenant_types', 'pg_temp.property_tenant_types');
  definition := replace(definition, 'public.property_media', 'pg_temp.property_media');
  execute definition;
end;
$$;

create function pg_temp.assert_true(condition boolean, message text) returns void
language plpgsql as $$
begin
  if condition is not true then raise exception 'Assertion failed: %', message; end if;
end;
$$;

-- 200 nearby but stale homes exhaust the old nearest-first candidate window.
insert into pg_temp.properties (
  id, owner_id, title, description, address_text, property_type, rent_bdt,
  deposit_bdt, bedrooms, bathrooms, furnishing, gender_preference, available_from,
  latitude, longitude, status, published_at, last_confirmed_at, expires_at
)
select md5('smart-search-' || n)::uuid, md5('smart-owner')::uuid,
  'Nearby home ' || n, 'Fixture', 'Fixture address', 'apartment', 30000,
  0, 2, 1, 'unfurnished', 'any', current_date,
  23.8103 + n * 0.000001, 90.4125, 'available', now() - interval '30 days',
  now() - interval '30 days', now() + interval '20 days'
from generate_series(1, 200) n;

-- A 500m farther, cheaper, freshly confirmed home should win Recommended.
insert into pg_temp.properties (
  id, owner_id, title, description, address_text, property_type, rent_bdt,
  deposit_bdt, bedrooms, bathrooms, furnishing, gender_preference, available_from,
  latitude, longitude, status, published_at, last_confirmed_at, expires_at
)
values (md5('smart-best')::uuid, md5('smart-owner')::uuid,
  'Best balanced home', 'Fixture', 'Fixture address', 'apartment', 10000,
  0, 2, 1, 'unfurnished', 'any', current_date,
  23.8163, 90.4125, 'available', now() - interval '2 days', now(), now() + interval '20 days');

insert into pg_temp.property_tenant_types(property_id, tenant_type)
select id, 'family' from pg_temp.properties;

set local role anon;
select pg_temp.assert_true(
  (select id = md5('smart-best')::uuid from pg_temp.search_available_properties(
    23.8103, 90.4125, 10, 5000, 35000, 'family', 2::smallint, 'recommended') limit 1),
  'recommended must rank the best balanced home before the 200-row cap');
select pg_temp.assert_true(
  (select count(*) = 200 and min(total_matches) = 201 and bool_and(results_truncated)
   from pg_temp.search_available_properties(23.8103, 90.4125, 10, 5000, 35000, 'family', 2::smallint, 'recommended')),
  'counts and truncation must reflect the full candidate set');
select pg_temp.assert_true(
  not exists (select 1 from pg_temp.search_available_properties(23.8103, 90.4125, 10)
    where id = md5('smart-best')::uuid), 'legacy nearest ordering must be unchanged');
select pg_temp.assert_true(
  (select id = md5('smart-best')::uuid from pg_temp.search_available_properties(
    23.8103, 90.4125, 10, null, null, null, null, 'rent-asc') limit 1), 'rent ascending unchanged');
select pg_temp.assert_true(
  (select rent_bdt = 30000 from pg_temp.search_available_properties(
    23.8103, 90.4125, 10, null, null, null, null, 'rent-desc') limit 1), 'rent descending unchanged');
select pg_temp.assert_true(
  (select count(*) = 200 from pg_temp.search_available_properties(
    23.8103, 90.4125, 10, 30000, 30000, 'family', null, 'recommended')),
  'an exact budget must not divide by zero');
select pg_temp.assert_true(
  not exists (select 1 from pg_temp.search_available_properties(
    23.8103, 90.4125, 10, null, 9000, 'family', null, 'recommended')),
  'ranking cannot relax a hard budget');
select pg_temp.assert_true(
  not exists (select 1 from pg_temp.search_available_properties(
    23.8103, 90.4125, 10, null, null, 'bachelor', null, 'recommended')),
  'ranking cannot relax tenant compatibility');
select pg_temp.assert_true(
  not exists (select 1 from pg_temp.search_available_properties(
    23.8103, 90.4125, 10, null, null, 'family', 3::smallint, 'recommended')),
  'ranking cannot relax bedroom requirements');
select pg_temp.assert_true(
  (select id = md5('smart-best')::uuid from pg_temp.search_available_properties(
    23.8103, 90.4125, 0.5, 5000, 35000, 'family', null, 'recommended', null,
    '{"type":"Polygon","coordinates":[[[90.40,23.80],[90.43,23.80],[90.43,23.83],[90.40,23.83],[90.40,23.80]]]}'::jsonb) limit 1),
  'polygon searches must rank their full candidate set');
reset role;

-- Equal distance and price isolate confirmation freshness, not edit time.
delete from pg_temp.properties where id <> md5('smart-best')::uuid;
insert into pg_temp.properties (id, owner_id, title, description, address_text,
  property_type, rent_bdt, bedrooms, bathrooms, furnishing, gender_preference,
  latitude, longitude, status, published_at, last_confirmed_at, expires_at, updated_at)
select md5('smart-stale')::uuid, owner_id, 'Stale edited home', description, address_text,
  property_type, rent_bdt, bedrooms, bathrooms, furnishing, gender_preference,
  latitude, longitude, status, published_at, now() - interval '30 days', expires_at, now() + interval '1 day'
from pg_temp.properties;
insert into pg_temp.property_tenant_types(property_id, tenant_type) values (md5('smart-stale')::uuid, 'family');
set local role anon;
select pg_temp.assert_true(
  (select id = md5('smart-best')::uuid from pg_temp.search_available_properties(
    23.8103, 90.4125, 10, null, null, 'family', null, 'recommended') limit 1),
  'confirmed freshness must beat a newer edit even without a budget');
reset role;

-- Equal distance and freshness isolate affordability.
update pg_temp.properties set last_confirmed_at = now(), rent_bdt = 30000
where id = md5('smart-stale')::uuid;
set local role anon;
select pg_temp.assert_true(
  (select id = md5('smart-best')::uuid from pg_temp.search_available_properties(
    23.8103, 90.4125, 10, 5000, 35000, 'family', null, 'recommended') limit 1),
  'a lower price within the requested budget should rank higher');
reset role;

-- With no budget, do not assume that the cheapest property is preferred.
update pg_temp.properties set updated_at = '2026-01-01', last_confirmed_at = null;
set local role anon;
select pg_temp.assert_true(
  (select id = least(md5('smart-best')::uuid, md5('smart-stale')::uuid)
   from pg_temp.search_available_properties(23.8103, 90.4125, 10, null, null, 'family', null, 'recommended') limit 1),
  'missing confirmation and budget must be neutral, with stable UUID tie breaking');
reset role;

-- Moderation and expiry rules are eligibility gates, irrespective of score.
update pg_temp.properties set expires_at = now() - interval '1 second' where id = md5('smart-best')::uuid;
update pg_temp.properties set published_at = null where id = md5('smart-stale')::uuid;
set local role anon;
select pg_temp.assert_true(
  not exists (select 1 from pg_temp.search_available_properties(
    23.8103, 90.4125, 10, null, null, null, null, 'recommended')),
  'expired and unpublished homes must remain excluded');
reset role;
rollback;
\echo 'F28 smart property recommendation QA passed.'
