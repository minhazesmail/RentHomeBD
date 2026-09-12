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
values ('63333333-3333-4333-8333-333333333333', '{"role":"owner","display_name":"Tenant Policy QA Owner"}'::jsonb);

insert into public.properties (
  id, owner_id, title, property_type, rent_bdt, available_from, latitude, longitude, status
) values (
  '63aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '63333333-3333-4333-8333-333333333333',
  'Tenant policy QA apartment',
  'apartment',
  24000,
  current_date,
  23.8103,
  90.4125,
  'draft'
);

-- Multiple specific renter identities are valid.
insert into public.property_tenant_types (property_id, tenant_type)
values
  ('63aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'family'),
  ('63aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'job_holder');
select pg_temp.assert_true(
  (select count(*) = 2 from public.property_tenant_types where property_id = '63aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  'multiple specific renter types should remain valid'
);

-- Adding Everyone to specific renter types must fail.
do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.property_tenant_types (property_id, tenant_type)
    values ('63aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'everyone');
  exception
    when check_violation then rejected := true;
  end;
  if not rejected then
    raise exception 'Assertion failed: Everyone must not be combined with specific renter types';
  end if;
end;
$$;

-- Everyone alone is valid, but a later specific type must fail.
delete from public.property_tenant_types where property_id = '63aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
insert into public.property_tenant_types (property_id, tenant_type)
values ('63aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'everyone');

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.property_tenant_types (property_id, tenant_type)
    values ('63aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'student');
  exception
    when check_violation then rejected := true;
  end;
  if not rejected then
    raise exception 'Assertion failed: specific renter type must not be combined with Everyone';
  end if;
end;
$$;

select pg_temp.assert_true(
  (select array_agg(tenant_type order by tenant_type::text)::text = '{everyone}'
   from public.property_tenant_types
   where property_id = '63aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  'Everyone-alone policy must remain intact after rejected insert'
);

rollback;

\echo 'F27 listing tenant policy QA passed: Everyone is exclusive and specific multi-select remains valid.'
