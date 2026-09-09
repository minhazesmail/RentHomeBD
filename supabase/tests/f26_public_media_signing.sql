\set ON_ERROR_STOP on

begin;

-- Stable fixture identities. Inserting auth users exercises the repository's
-- auth->profile provisioning trigger before properties are created.
insert into auth.users (id, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', '{"role":"owner","display_name":"Owner QA"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', '{"role":"renter","display_name":"Renter QA"}'::jsonb),
  ('33333333-3333-4333-8333-333333333333', '{"role":"renter","display_name":"Moderator QA"}'::jsonb);

insert into public.moderators (user_id)
values ('33333333-3333-4333-8333-333333333333');

insert into public.properties (
  id,
  owner_id,
  title,
  property_type,
  rent_bdt,
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
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'Public QA home',
    'apartment',
    10000,
    current_date,
    23.7465,
    90.3760,
    'available',
    now() - interval '1 day',
    now(),
    now() + interval '13 days'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '11111111-1111-4111-8111-111111111111',
    'Draft QA home',
    'apartment',
    11000,
    current_date,
    23.7466,
    90.3761,
    'draft',
    null,
    null,
    null
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    '11111111-1111-4111-8111-111111111111',
    'Expired QA home',
    'apartment',
    12000,
    current_date,
    23.7467,
    90.3762,
    'available',
    now() - interval '20 days',
    now() - interval '15 days',
    now() - interval '1 day'
  );

insert into storage.objects (bucket_id, name)
values
  ('property-media', '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg'),
  ('property-media', '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg'),
  ('property-media', '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3/expired.jpg');

-- Anonymous signing: only currently public listing media is visible.
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('storage.operation', 'storage.object.sign', true);

select case when count(*) = 1 then 1 else 1 / 0 end as anon_can_sign_public
from storage.objects
where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg';

select case when count(*) = 0 then 1 else 1 / 0 end as anon_cannot_sign_draft
from storage.objects
where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg';

select case when count(*) = 0 then 1 else 1 / 0 end as anon_cannot_sign_expired
from storage.objects
where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3/expired.jpg';

select set_config('storage.operation', 'storage.object.sign_many', true);
select case when count(*) = 1 then 1 else 1 / 0 end as anon_can_sign_many_public
from storage.objects
where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg';

-- F26 must not accidentally grant object listing through the public policy.
select set_config('storage.operation', 'storage.object.list', true);
select case when count(*) = 0 then 1 else 1 / 0 end as anon_cannot_list_public_bucket
from storage.objects
where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg';

-- Preserve the existing ordinary authenticated-object read path.
select set_config('storage.operation', 'storage.object.get_authenticated', true);
select case when count(*) = 1 then 1 else 1 / 0 end as anon_can_read_public_object
from storage.objects
where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg';

reset role;

-- Ordinary authenticated renters get public media signing, not foreign drafts.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('storage.operation', 'storage.object.sign', true);

select case when count(*) = 1 then 1 else 1 / 0 end as renter_can_sign_public
from storage.objects
where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg';

select case when count(*) = 0 then 1 else 1 / 0 end as renter_cannot_sign_foreign_draft
from storage.objects
where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg';

reset role;

-- Existing owner SELECT policy must continue to permit the owner's own draft.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('storage.operation', 'storage.object.sign', true);

select case when count(*) = 1 then 1 else 1 / 0 end as owner_can_sign_own_draft
from storage.objects
where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg';

reset role;

-- Existing moderator SELECT policy must continue to permit review-time media.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config('storage.operation', 'storage.object.sign', true);

select case when count(*) = 1 then 1 else 1 / 0 end as moderator_can_sign_draft
from storage.objects
where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg';

reset role;
rollback;

\echo 'F26 public media signing RLS QA passed.'
