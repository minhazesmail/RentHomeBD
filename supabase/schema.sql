-- RentHomeBD core database schema
-- This is the source schema for Task 2. Once a dedicated Supabase project exists,
-- create a migration with the Supabase CLI and apply this schema there.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

create type public.profile_role as enum ('renter', 'owner', 'agent');
create type public.property_type as enum ('apartment', 'house', 'room_share', 'sublet', 'hostel_seat');
create type public.tenant_type as enum ('family', 'bachelor', 'student', 'job_holder', 'everyone');
create type public.gender_preference as enum ('male', 'female', 'any');
create type public.furnishing_status as enum ('furnished', 'semi_furnished', 'unfurnished');
create type public.listing_status as enum (
  'draft',
  'pending_review',
  'available',
  'pending_confirmation',
  'rented',
  'expired',
  'rejected'
);
create type public.media_type as enum ('photo', 'video');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_path text,
  primary_role public.profile_role not null default 'renter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 2 and 80)
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  property_type public.property_type not null,
  rent_bdt integer not null,
  deposit_bdt integer not null default 0,
  utilities_included text[] not null default '{}',
  size_sqft integer,
  bedrooms smallint,
  bathrooms smallint,
  floor_number smallint,
  total_floors smallint,
  furnishing public.furnishing_status not null default 'unfurnished',
  gender_preference public.gender_preference not null default 'any',
  available_from date not null,
  latitude double precision not null,
  longitude double precision not null,
  location extensions.geography(Point, 4326)
    generated always as (
      extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
    ) stored,
  status public.listing_status not null default 'draft',
  moderation_notes text,
  published_at timestamptz,
  last_confirmed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_title_length check (char_length(title) between 5 and 140),
  constraint properties_description_length check (description is null or char_length(description) <= 5000),
  constraint properties_rent_positive check (rent_bdt > 0),
  constraint properties_deposit_nonnegative check (deposit_bdt >= 0),
  constraint properties_size_positive check (size_sqft is null or size_sqft > 0),
  constraint properties_bedrooms_nonnegative check (bedrooms is null or bedrooms >= 0),
  constraint properties_bathrooms_nonnegative check (bathrooms is null or bathrooms >= 0),
  constraint properties_floor_nonnegative check (floor_number is null or floor_number >= 0),
  constraint properties_total_floors_positive check (total_floors is null or total_floors > 0),
  constraint properties_floor_within_building check (
    floor_number is null or total_floors is null or floor_number <= total_floors
  ),
  constraint properties_latitude_range check (latitude between -90 and 90),
  constraint properties_longitude_range check (longitude between -180 and 180),
  constraint properties_expiry_after_publish check (
    expires_at is null or published_at is null or expires_at > published_at
  )
);

create table public.property_tenant_types (
  property_id uuid not null references public.properties(id) on delete cascade,
  tenant_type public.tenant_type not null,
  created_at timestamptz not null default now(),
  primary key (property_id, tenant_type)
);

create table public.amenities (
  slug text primary key,
  name text not null unique,
  created_at timestamptz not null default now(),
  constraint amenities_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint amenities_name_length check (char_length(name) between 2 and 80)
);

create table public.property_amenities (
  property_id uuid not null references public.properties(id) on delete cascade,
  amenity_slug text not null references public.amenities(slug) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (property_id, amenity_slug)
);

create table public.property_media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  media_type public.media_type not null default 'photo',
  storage_path text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint property_media_path_not_blank check (btrim(storage_path) <> ''),
  constraint property_media_sort_nonnegative check (sort_order >= 0),
  unique (property_id, storage_path)
);

insert into public.amenities (slug, name) values
  ('lift', 'Lift'),
  ('generator', 'Generator'),
  ('gas-line', 'Gas line'),
  ('parking', 'Parking'),
  ('wifi-ready', 'Wi-Fi ready'),
  ('security', 'Security'),
  ('cctv', 'CCTV'),
  ('balcony', 'Balcony'),
  ('water-supply', 'Water supply')
on conflict (slug) do nothing;

create index properties_owner_id_idx on public.properties using btree (owner_id);
create index properties_status_idx on public.properties using btree (status);
create index properties_rent_idx on public.properties using btree (rent_bdt);
create index properties_available_from_idx on public.properties using btree (available_from);
create index properties_property_type_idx on public.properties using btree (property_type);
create index properties_location_gix on public.properties using gist (location);
create index property_tenant_types_tenant_type_idx on public.property_tenant_types using btree (tenant_type);
create index property_amenities_amenity_slug_idx on public.property_amenities using btree (amenity_slug);
create index property_media_property_id_idx on public.property_media using btree (property_id);

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger properties_set_updated_at
before update on public.properties
for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_tenant_types enable row level security;
alter table public.amenities enable row level security;
alter table public.property_amenities enable row level security;
alter table public.property_media enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.properties from anon, authenticated;
revoke all on table public.property_tenant_types from anon, authenticated;
revoke all on table public.amenities from anon, authenticated;
revoke all on table public.property_amenities from anon, authenticated;
revoke all on table public.property_media from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select on table public.properties to anon;
grant select, insert, update, delete on table public.properties to authenticated;
grant select on table public.property_tenant_types to anon;
grant select, insert, update, delete on table public.property_tenant_types to authenticated;
grant select on table public.amenities to anon, authenticated;
grant select on table public.property_amenities to anon;
grant select, insert, update, delete on table public.property_amenities to authenticated;
grant select on table public.property_media to anon;
grant select, insert, update, delete on table public.property_media to authenticated;

create policy "users can read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "users can create own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "users can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "public can read available properties"
on public.properties for select
to anon
using (
  status = 'available'
  and published_at is not null
  and (expires_at is null or expires_at > now())
);

create policy "authenticated can read public or own properties"
on public.properties for select
to authenticated
using (
  owner_id = (select auth.uid())
  or (
    status = 'available'
    and published_at is not null
    and (expires_at is null or expires_at > now())
  )
);

create policy "users can create own properties"
on public.properties for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "owners can update own properties"
on public.properties for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "owners can delete own properties"
on public.properties for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "public can read tenant types for available properties"
on public.property_tenant_types for select
to anon
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.status = 'available'
      and p.published_at is not null
      and (p.expires_at is null or p.expires_at > now())
  )
);

create policy "authenticated can read tenant types for visible properties"
on public.property_tenant_types for select
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
  )
);

create policy "owners can add tenant types"
on public.property_tenant_types for insert
to authenticated
with check (
  exists (
    select 1 from public.properties p
    where p.id = property_id and p.owner_id = (select auth.uid())
  )
);

create policy "owners can update tenant types"
on public.property_tenant_types for update
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id and p.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.properties p
    where p.id = property_id and p.owner_id = (select auth.uid())
  )
);

create policy "owners can delete tenant types"
on public.property_tenant_types for delete
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id and p.owner_id = (select auth.uid())
  )
);

create policy "amenities are public"
on public.amenities for select
to anon, authenticated
using (true);

create policy "public can read amenities for available properties"
on public.property_amenities for select
to anon
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.status = 'available'
      and p.published_at is not null
      and (p.expires_at is null or p.expires_at > now())
  )
);

create policy "authenticated can read amenities for visible properties"
on public.property_amenities for select
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
  )
);

create policy "owners can add property amenities"
on public.property_amenities for insert
to authenticated
with check (
  exists (
    select 1 from public.properties p
    where p.id = property_id and p.owner_id = (select auth.uid())
  )
);

create policy "owners can update property amenities"
on public.property_amenities for update
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id and p.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.properties p
    where p.id = property_id and p.owner_id = (select auth.uid())
  )
);

create policy "owners can delete property amenities"
on public.property_amenities for delete
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id and p.owner_id = (select auth.uid())
  )
);

create policy "public can read media for available properties"
on public.property_media for select
to anon
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and p.status = 'available'
      and p.published_at is not null
      and (p.expires_at is null or p.expires_at > now())
  )
);

create policy "authenticated can read media for visible properties"
on public.property_media for select
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
  )
);

create policy "owners can add property media"
on public.property_media for insert
to authenticated
with check (
  exists (
    select 1 from public.properties p
    where p.id = property_id and p.owner_id = (select auth.uid())
  )
);

create policy "owners can update property media"
on public.property_media for update
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id and p.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.properties p
    where p.id = property_id and p.owner_id = (select auth.uid())
  )
);

create policy "owners can delete property media"
on public.property_media for delete
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id and p.owner_id = (select auth.uid())
  )
);
