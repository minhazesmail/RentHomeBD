\set ON_ERROR_STOP on

begin;

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
  ('c1111111-1111-4111-8111-111111111111', '{"role":"renter","display_name":"Trust QA Renter"}'::jsonb),
  ('c2222222-2222-4222-8222-222222222222', '{"role":"owner","display_name":"Trust QA Owner"}'::jsonb),
  ('c3333333-3333-4333-8333-333333333333', '{"role":"renter","display_name":"Trust QA Outsider"}'::jsonb);

update public.profiles
set phone_verified_at = now() - interval '1 day'
where id = 'c2222222-2222-4222-8222-222222222222';

-- Fixture setup bypasses listing/conversation lifecycle triggers only. RLS is
-- restored before every behavior assertion below.
set local session_replication_role = replica;
insert into public.properties (
  id, owner_id, title, address_text, property_type, rent_bdt, deposit_bdt,
  available_from, latitude, longitude, status, published_at, expires_at,
  public_owner_display_name, public_owner_role, public_owner_phone_verified_at
)
values (
  'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'c2222222-2222-4222-8222-222222222222',
  'Conversation trust QA home',
  'Dhanmondi, Dhaka',
  'apartment'::public.property_type,
  25000,
  25000,
  current_date,
  23.7465,
  90.3760,
  'available'::public.listing_status,
  now() - interval '1 day',
  now() + interval '13 days',
  'Trust QA Owner',
  'owner'::public.profile_role,
  now() - interval '1 day'
);

insert into public.conversations (
  id, property_id, renter_id, owner_id, renter_display_name, owner_display_name,
  property_title, created_at
)
values (
  'cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'c1111111-1111-4111-8111-111111111111',
  'c2222222-2222-4222-8222-222222222222',
  'Trust QA Renter',
  'Trust QA Owner',
  'Conversation trust QA home',
  now()
);
set local session_replication_role = origin;

-- The renter cannot directly read the owner's profile under normal participant
-- RLS, but the scoped RPC can disclose the one boolean needed by the thread UI.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c1111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"c1111111-1111-4111-8111-111111111111"}',
  true
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.profiles where id = 'c2222222-2222-4222-8222-222222222222'),
  'participant RLS must continue hiding the other profile row'
);
select pg_temp.assert_true(
  (select count(*) = 1 and bool_and(phone_verified)
   from public.get_conversation_participant_trust('cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')),
  'renter must see the owner phone-verified boolean through the scoped RPC'
);
reset role;

-- The owner sees the renter's trust fact, and the unverified renter is reported
-- as false rather than exposing profile fields or timestamps.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c2222222-2222-4222-8222-222222222222', true);
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"c2222222-2222-4222-8222-222222222222"}',
  true
);
select pg_temp.assert_true(
  (select count(*) = 1 and not bool_or(phone_verified)
   from public.get_conversation_participant_trust('cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')),
  'owner must see only the renter phone-verified boolean'
);
reset role;

-- A signed-in nonparticipant gets no row at all.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c3333333-3333-4333-8333-333333333333', true);
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"c3333333-3333-4333-8333-333333333333"}',
  true
);
select pg_temp.assert_true(
  (select count(*) = 0
   from public.get_conversation_participant_trust('cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')),
  'nonparticipants must not receive conversation trust data'
);
reset role;

select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.get_conversation_participant_trust(uuid)', 'EXECUTE'),
  'anonymous callers must not execute the participant trust RPC'
);
select pg_temp.assert_true(
  has_function_privilege('authenticated', 'public.get_conversation_participant_trust(uuid)', 'EXECUTE'),
  'authenticated callers need execute privilege on the scoped trust RPC'
);

rollback;

\echo 'F16 conversation participant trust QA passed.'
