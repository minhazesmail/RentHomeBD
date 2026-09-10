\set ON_ERROR_STOP on

begin;

-- PostgreSQL may constant-fold `1 / 0` even inside an unselected CASE branch.
-- Keep assertions procedural so a failure means the condition actually failed.
create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
volatile
as $$
begin
  if condition is not true then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (id, raw_user_meta_data)
values
  ('61111111-1111-4111-8111-111111111111', '{"role":"owner","display_name":"Save QA Owner"}'::jsonb),
  ('62222222-2222-4222-8222-222222222222', '{"role":"owner","display_name":"Other QA Owner"}'::jsonb);

-- Model the owner request scope used by PostgREST/Storage.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '61111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"61111111-1111-4111-8111-111111111111"}',
  true
);

-- F06: the browser-chosen draft UUID is safe to retry. A lost response cannot
-- create a second draft because both calls resolve to the same row.
select public.ensure_property_draft('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
select public.ensure_property_draft('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
select pg_temp.assert_true(
  (select count(*) = 1 from public.properties where id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  'repeated ensure_property_draft must keep one property row'
);

reset role;

-- Storage bytes are intentionally outside the Postgres save transaction. Seed
-- the object that represents a successful stable-path upload, then let the
-- normal property_media integrity trigger verify it when metadata is saved.
set local session_replication_role = replica;
insert into storage.objects (bucket_id, name, metadata)
values (
  'property-media',
  '61111111-1111-4111-8111-111111111111/6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1.jpg',
  '{"mimetype":"image/jpeg"}'::jsonb
);
set local session_replication_role = origin;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '61111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"61111111-1111-4111-8111-111111111111"}',
  true
);

select public.save_property_draft(
  '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  jsonb_build_object(
    'title', 'Retry-safe Dhanmondi apartment',
    'description', 'Initial atomic save',
    'address_text', 'Road 8, Dhanmondi, Dhaka',
    'property_type', 'apartment',
    'rent_bdt', 25000,
    'deposit_bdt', 25000,
    'utilities_included', jsonb_build_array('water'),
    'size_sqft', 1200,
    'bedrooms', 3,
    'bathrooms', 2,
    'floor_number', 4,
    'total_floors', 8,
    'furnishing', 'semi_furnished',
    'gender_preference', 'any',
    'available_from', current_date,
    'latitude', 23.7465,
    'longitude', 90.3760
  ),
  array['family'::public.tenant_type],
  array[]::text[],
  jsonb_build_array(jsonb_build_object(
    'id', '6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'storage_path', '61111111-1111-4111-8111-111111111111/6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1.jpg',
    'media_type', 'photo',
    'sort_order', 0
  ))
);

-- Retry the exact same save. IDs, relationships and media remain singular.
select public.save_property_draft(
  '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  jsonb_build_object(
    'title', 'Retry-safe Dhanmondi apartment',
    'description', 'Initial atomic save',
    'address_text', 'Road 8, Dhanmondi, Dhaka',
    'property_type', 'apartment',
    'rent_bdt', 25000,
    'deposit_bdt', 25000,
    'utilities_included', jsonb_build_array('water'),
    'size_sqft', 1200,
    'bedrooms', 3,
    'bathrooms', 2,
    'floor_number', 4,
    'total_floors', 8,
    'furnishing', 'semi_furnished',
    'gender_preference', 'any',
    'available_from', current_date,
    'latitude', 23.7465,
    'longitude', 90.3760
  ),
  array['family'::public.tenant_type],
  array[]::text[],
  jsonb_build_array(jsonb_build_object(
    'id', '6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'storage_path', '61111111-1111-4111-8111-111111111111/6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1.jpg',
    'media_type', 'photo',
    'sort_order', 0
  ))
);

select pg_temp.assert_true(
  (select count(*) = 1 from public.property_media where property_id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  'retry must keep one property_media row'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.property_tenant_types where property_id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  'retry must keep one tenant relation'
);

-- A failure late in the atomic reconciliation must roll back fields and
-- relationships together. The invalid amenity causes a FK violation after the
-- property update and tenant replacement have already executed inside the RPC.
do $$
declare
  rejected boolean := false;
begin
  begin
    perform public.save_property_draft(
      '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      jsonb_build_object(
        'title', 'This title must roll back',
        'description', 'Should never commit',
        'address_text', 'Road 9, Dhanmondi, Dhaka',
        'property_type', 'apartment',
        'rent_bdt', 30000,
        'deposit_bdt', 30000,
        'utilities_included', jsonb_build_array(),
        'size_sqft', 1300,
        'bedrooms', 4,
        'bathrooms', 3,
        'floor_number', 5,
        'total_floors', 8,
        'furnishing', 'furnished',
        'gender_preference', 'any',
        'available_from', current_date,
        'latitude', 23.7465,
        'longitude', 90.3760
      ),
      array['bachelor'::public.tenant_type],
      array['amenity-that-does-not-exist'],
      jsonb_build_array(jsonb_build_object(
        'id', '6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
        'storage_path', '61111111-1111-4111-8111-111111111111/6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1.jpg',
        'media_type', 'photo',
        'sort_order', 0
      ))
    );
  exception when foreign_key_violation then
    rejected := true;
  end;

  if not rejected then
    raise exception 'Expected invalid amenity save to fail';
  end if;
end;
$$;

select pg_temp.assert_true(
  (select title = 'Retry-safe Dhanmondi apartment' from public.properties where id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  'failed atomic save must roll back scalar property changes'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.property_tenant_types where property_id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and tenant_type = 'family'::public.tenant_type),
  'failed atomic save must roll back tenant replacement'
);

-- Submission is also idempotent. A retry after a lost response leaves the same
-- row in pending_review and does not duplicate any listing data.
select public.submit_property_for_review('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
select public.submit_property_for_review('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
select pg_temp.assert_true(
  (select status = 'pending_review'::public.listing_status from public.properties where id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  'repeated submission must remain pending_review'
);

reset role;

-- Model a previously approved public listing. This is fixture setup, not the
-- behavior under test, so bypass lifecycle triggers while creating the prior
-- state and then restore all triggers before owner actions.
set local session_replication_role = replica;
update public.properties
set status = 'available'::public.listing_status,
    published_at = now() - interval '2 days',
    last_confirmed_at = now() - interval '1 day',
    expires_at = now() + interval '13 days',
    public_owner_display_name = 'Save QA Owner',
    public_owner_role = 'owner'::public.profile_role
where id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
set local session_replication_role = origin;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '61111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"61111111-1111-4111-8111-111111111111"}',
  true
);

-- F07: beginning an edit takes the old publication private and clears stale
-- freshness/trust snapshots. Existing moderation history is untouched.
select public.begin_property_edit('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
select pg_temp.assert_true(
  (select
    status = 'draft'::public.listing_status
    and published_at is null
    and last_confirmed_at is null
    and expires_at is null
    and public_owner_display_name is null
    and public_owner_role is null
    and public_owner_phone_verified_at is null
    and public_owner_role_verified_at is null
    and public_owner_role_verified_role is null
   from public.properties
   where id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  'available listing must become a private clean draft before editing'
);

-- Repeated begin-edit requests are harmless once already a draft.
select public.begin_property_edit('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');

reset role;

-- The same explicit relist path supports completed and expired listings.
set local session_replication_role = replica;
update public.properties
set status = 'rented'::public.listing_status,
    published_at = now() - interval '30 days',
    last_confirmed_at = now() - interval '20 days',
    expires_at = now() - interval '6 days'
where id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
set local session_replication_role = origin;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '61111111-1111-4111-8111-111111111111', true);
select public.begin_property_edit('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
select pg_temp.assert_true(
  (select status = 'draft'::public.listing_status and published_at is null and expires_at is null from public.properties where id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  'rented listing must support relisting as a private draft'
);
reset role;

set local session_replication_role = replica;
update public.properties
set status = 'expired'::public.listing_status,
    published_at = now() - interval '45 days',
    last_confirmed_at = now() - interval '30 days',
    expires_at = now() - interval '8 days'
where id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
set local session_replication_role = origin;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '61111111-1111-4111-8111-111111111111', true);
select public.begin_property_edit('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
select pg_temp.assert_true(
  (select status = 'draft'::public.listing_status and published_at is null and expires_at is null from public.properties where id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  'expired listing must support relisting as a private draft'
);

-- A different owner cannot hijack the draft or start its lifecycle.
select set_config('request.jwt.claim.sub', '62222222-2222-4222-8222-222222222222', true);
do $$
declare
  denied boolean := false;
begin
  begin
    perform public.begin_property_edit('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
  exception when others then
    denied := true;
  end;
  if not denied then
    raise exception 'Cross-owner edit must be denied';
  end if;
end;
$$;

reset role;
rollback;

\echo 'F06/F07 atomic listing save and relist lifecycle QA passed.'