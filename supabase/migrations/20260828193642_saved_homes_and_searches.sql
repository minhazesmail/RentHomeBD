create table public.saved_properties (
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  center_lat double precision not null,
  center_long double precision not null,
  radius_km double precision,
  min_rent integer,
  max_rent integer,
  tenant_type public.tenant_type,
  min_bedrooms smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_searches_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint saved_searches_latitude check (center_lat between -90 and 90),
  constraint saved_searches_longitude check (center_long between -180 and 180),
  constraint saved_searches_radius check (radius_km is null or radius_km > 0),
  constraint saved_searches_min_rent check (min_rent is null or min_rent >= 0),
  constraint saved_searches_max_rent check (max_rent is null or max_rent >= 0),
  constraint saved_searches_rent_order check (min_rent is null or max_rent is null or min_rent <= max_rent),
  constraint saved_searches_bedrooms check (min_bedrooms is null or min_bedrooms >= 0)
);

create index saved_properties_property_idx on public.saved_properties(property_id);
create index saved_searches_user_updated_idx on public.saved_searches(user_id, updated_at desc);

alter table public.saved_properties enable row level security;
alter table public.saved_searches enable row level security;

revoke all on public.saved_properties from anon, authenticated;
revoke all on public.saved_searches from anon, authenticated;
grant select, insert, delete on public.saved_properties to authenticated;
grant select, insert, update, delete on public.saved_searches to authenticated;

create policy "users can read own saved properties" on public.saved_properties for select to authenticated using (user_id = (select auth.uid()));
create policy "users can save available properties" on public.saved_properties for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.properties property
    where property.id = property_id
      and property.status = 'available'::public.listing_status
      and property.published_at is not null
      and (property.expires_at is null or property.expires_at > now())
  )
);
create policy "users can remove own saved properties" on public.saved_properties for delete to authenticated using (user_id = (select auth.uid()));

create policy "users can read own saved searches" on public.saved_searches for select to authenticated using (user_id = (select auth.uid()));
create policy "users can create own saved searches" on public.saved_searches for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users can update own saved searches" on public.saved_searches for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users can delete own saved searches" on public.saved_searches for delete to authenticated using (user_id = (select auth.uid()));

create trigger saved_searches_set_updated_at
before update on public.saved_searches
for each row execute function private.set_updated_at();
