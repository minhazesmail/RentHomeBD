\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('44444444-4444-4444-8444-444444444444', 'renter-support@example.com', '{"role":"renter","display_name":"Renter Support QA"}'::jsonb),
  ('55555555-5555-4555-8555-555555555555', 'owner-support@example.com', '{"role":"owner","display_name":"Owner Support QA"}'::jsonb);

-- Signed-out users can create a durable support request without table INSERT grants.
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
select public.submit_support_request(
  'locked-out@example.com',
  'account_recovery',
  'Cannot sign in',
  'My normal sign-in flow returns an error and I need account recovery help.',
  '{"source":"qa"}'::jsonb
) as anonymous_support_request;
reset role;

select case when count(*) = 1 then 1 else 1 / 0 end as anonymous_request_persisted
from public.support_requests where email = 'locked-out@example.com' and category = 'account_recovery';

-- Authenticated requests are attached to the caller and visible only as their own request.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"44444444-4444-4444-8444-444444444444"}', true);
select public.submit_support_request(
  'renter-support@example.com',
  'data_export',
  'Export my data',
  'Please start the verified process for a copy of the data associated with my account.',
  '{}'::jsonb
);
select case when count(*) = 1 then 1 else 1 / 0 end as user_can_read_own_request
from public.support_requests where user_id = '44444444-4444-4444-8444-444444444444';
reset role;

-- Seed an existing conversation; blocking is allowed only between real participants.
set local session_replication_role = replica;
insert into public.properties (id, owner_id, title, property_type, rent_bdt, available_from, latitude, longitude, status)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '55555555-5555-4555-8555-555555555555', 'Support QA home', 'apartment', 15000, current_date, 23.75, 90.38, 'draft');
insert into public.conversations (id, property_id, renter_id, owner_id, renter_display_name, owner_display_name, property_title, created_at)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555', 'Renter Support QA', 'Owner Support QA', 'Support QA home', now());
set local session_replication_role = origin;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"44444444-4444-4444-8444-444444444444"}', true);
select case when public.set_user_block('55555555-5555-4555-8555-555555555555', true) then 1 else 1 / 0 end as block_succeeds;
select case when blocked and blocked_by_me then 1 else 1 / 0 end as block_state_visible
from public.get_conversation_block_state('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

do $$
begin
  begin
    insert into public.messages (conversation_id, sender_id, body)
    values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '44444444-4444-4444-8444-444444444444', 'This message must be blocked');
    raise exception 'expected blocked message insert to fail';
  exception when others then
    if position('Messaging is blocked between these accounts' in sqlerrm) = 0 then
      raise;
    end if;
  end;
end;
$$;

select case when not public.set_user_block('55555555-5555-4555-8555-555555555555', false) then 1 else 1 / 0 end as unblock_succeeds;
select case when not blocked and not blocked_by_me then 1 else 1 / 0 end as unblock_state_visible
from public.get_conversation_block_state('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
reset role;

rollback;
\echo 'F20 support and chat blocking QA passed.'
