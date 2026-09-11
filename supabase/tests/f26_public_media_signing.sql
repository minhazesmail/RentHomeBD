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
values
  ('11111111-1111-4111-8111-111111111111', '{"role":"owner","display_name":"Owner QA"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', '{"role":"renter","display_name":"Renter QA"}'::jsonb),
  ('33333333-3333-4333-8333-333333333333', '{"role":"renter","display_name":"Moderator QA"}'::jsonb);

insert into public.moderators (user_id)
values ('33333333-3333-4333-8333-333333333333');

-- This test is for Storage visibility, not listing lifecycle. Seed exact public,
-- draft and expired fixture states without invoking owner/moderation transitions.
set local session_replication_role = replica;
insert into public.properties (id, owner_id, title, property_type, rent_bdt, available_from, latitude, longitude, status, published_at, last_confirmed_at, expires_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Public QA home', 'apartment', 10000, current_date, 23.7465, 90.3760, 'available', now() - interval '1 day', now(), now() + interval '13 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'Draft QA home', 'apartment', 11000, current_date, 23.7466, 90.3761, 'draft', null, null, null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '11111111-1111-4111-8111-111111111111', 'Expired QA home', 'apartment', 12000, current_date, 23.7467, 90.3762, 'expired', now() - interval '20 days', now() - interval '15 days', now() - interval '1 day');
insert into storage.objects (bucket_id, name)
values
  ('property-media', '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg'),
  ('property-media', '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg'),
  ('property-media', '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3/expired.jpg');
set local session_replication_role = origin;

select pg_temp.assert_true(
  public.is_public_property_media_path('11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg'),
  'helper should accept published, unexpired public media'
);
select pg_temp.assert_true(
  not public.is_public_property_media_path('11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg'),
  'helper should reject draft media'
);
select pg_temp.assert_true(
  not public.is_public_property_media_path('22222222-2222-4222-8222-222222222222/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg'),
  'helper should reject a path with the wrong owner segment'
);

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('storage.operation', 'storage.object.sign', true);
select pg_temp.assert_true(
  (select count(*) = 1 from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg'),
  'anonymous user should be able to sign public media'
);
select pg_temp.assert_true(
  (select count(*) = 0 from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg'),
  'anonymous user must not sign draft media'
);
select pg_temp.assert_true(
  (select count(*) = 0 from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3/expired.jpg'),
  'anonymous user must not sign expired media'
);
select set_config('storage.operation', 'storage.object.sign_many', true);
select pg_temp.assert_true(
  (select count(*) = 1 from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg'),
  'anonymous user should be able to sign_many public media'
);
select set_config('storage.operation', 'storage.object.list', true);
select pg_temp.assert_true(
  (select count(*) = 0 from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg'),
  'anonymous object listing must remain denied'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"22222222-2222-4222-8222-222222222222"}', true);
select set_config('storage.operation', 'storage.object.sign', true);
select pg_temp.assert_true(
  (select count(*) = 1 from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg'),
  'renter should sign public media'
);
select pg_temp.assert_true(
  (select count(*) = 0 from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg'),
  'renter must not sign another owner draft media'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111"}', true);
select set_config('storage.operation', 'storage.object.sign', true);
select pg_temp.assert_true(
  (select count(*) = 1 from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg'),
  'owner should retain own draft media access'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"33333333-3333-4333-8333-333333333333"}', true);
select set_config('storage.operation', 'storage.object.sign', true);
select pg_temp.assert_true(
  (select count(*) = 1 from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg'),
  'moderator should retain review-time draft media access'
);
reset role;

rollback;
\echo 'F26 public media signing RLS QA passed.'
