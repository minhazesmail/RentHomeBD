\set ON_ERROR_STOP on

begin;

insert into auth.users (id, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', '{"role":"owner","display_name":"Owner QA"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', '{"role":"renter","display_name":"Renter QA"}'::jsonb),
  ('33333333-3333-4333-8333-333333333333', '{"role":"renter","display_name":"Moderator QA"}'::jsonb);

insert into public.moderators (user_id)
values ('33333333-3333-4333-8333-333333333333');

-- Media is created while listings are editable, then the listing lifecycle is
-- advanced. This models production media instead of bypassing an immutable
-- published-listing guard.
insert into public.properties (id, owner_id, title, property_type, rent_bdt, available_from, latitude, longitude, status)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Public QA home', 'apartment', 10000, current_date, 23.7465, 90.3760, 'draft'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'Draft QA home', 'apartment', 11000, current_date, 23.7466, 90.3761, 'draft'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '11111111-1111-4111-8111-111111111111', 'Expired QA home', 'apartment', 12000, current_date, 23.7467, 90.3762, 'draft');

set local session_replication_role = replica;
insert into storage.objects (bucket_id, name)
values
  ('property-media', '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg'),
  ('property-media', '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg'),
  ('property-media', '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3/expired.jpg');
set local session_replication_role = origin;

update public.properties
set status = 'available', published_at = now() - interval '1 day', last_confirmed_at = now(), expires_at = now() + interval '13 days'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

update public.properties
set status = 'expired', published_at = now() - interval '20 days', last_confirmed_at = now() - interval '15 days', expires_at = now() - interval '1 day'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';

select case when public.is_public_property_media_path('11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg') then 1 else 1 / 0 end as helper_accepts_public;
select case when not public.is_public_property_media_path('11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg') then 1 else 1 / 0 end as helper_rejects_draft;
select case when not public.is_public_property_media_path('22222222-2222-4222-8222-222222222222/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg') then 1 else 1 / 0 end as helper_rejects_wrong_owner_path;

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('storage.operation', 'storage.object.sign', true);
select case when count(*) = 1 then 1 else 1 / 0 end as anon_can_sign_public
from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg';
select case when count(*) = 0 then 1 else 1 / 0 end as anon_cannot_sign_draft
from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg';
select case when count(*) = 0 then 1 else 1 / 0 end as anon_cannot_sign_expired
from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3/expired.jpg';
select set_config('storage.operation', 'storage.object.sign_many', true);
select case when count(*) = 1 then 1 else 1 / 0 end as anon_can_sign_many_public
from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg';
select set_config('storage.operation', 'storage.object.list', true);
select case when count(*) = 0 then 1 else 1 / 0 end as anon_cannot_list
from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg';
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"22222222-2222-4222-8222-222222222222"}', true);
select set_config('storage.operation', 'storage.object.sign', true);
select case when count(*) = 1 then 1 else 1 / 0 end as renter_can_sign_public
from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/public.jpg';
select case when count(*) = 0 then 1 else 1 / 0 end as renter_cannot_sign_foreign_draft
from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg';
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111"}', true);
select set_config('storage.operation', 'storage.object.sign', true);
select case when count(*) = 1 then 1 else 1 / 0 end as owner_can_sign_own_draft
from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg';
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"33333333-3333-4333-8333-333333333333"}', true);
select set_config('storage.operation', 'storage.object.sign', true);
select case when count(*) = 1 then 1 else 1 / 0 end as moderator_can_sign_draft
from storage.objects where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/draft.jpg';
reset role;

rollback;
\echo 'F26 public media signing RLS QA passed.'
