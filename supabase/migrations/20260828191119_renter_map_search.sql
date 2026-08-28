create or replace function public.search_available_properties(
  center_lat double precision default null,
  center_long double precision default null,
  radius_km double precision default null,
  min_rent integer default null,
  max_rent integer default null,
  renter_tenant_type public.tenant_type default null,
  min_bedrooms smallint default null
)
returns table (
  id uuid,
  title text,
  address_text text,
  property_type public.property_type,
  rent_bdt integer,
  bedrooms smallint,
  bathrooms smallint,
  furnishing public.furnishing_status,
  available_from date,
  latitude double precision,
  longitude double precision,
  distance_meters double precision,
  cover_media_path text
)
language sql
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.title,
    p.address_text,
    p.property_type,
    p.rent_bdt,
    p.bedrooms,
    p.bathrooms,
    p.furnishing,
    p.available_from,
    p.latitude,
    p.longitude,
    case
      when center_lat is not null and center_long is not null then
        extensions.st_distance(
          p.location,
          extensions.st_point(center_long, center_lat)::extensions.geography
        )
      else null
    end as distance_meters,
    (
      select pm.storage_path
      from public.property_media pm
      where pm.property_id = p.id
        and pm.media_type = 'photo'::public.media_type
      order by pm.sort_order, pm.created_at
      limit 1
    ) as cover_media_path
  from public.properties p
  where p.status = 'available'::public.listing_status
    and p.published_at is not null
    and (p.expires_at is null or p.expires_at > now())
    and p.location is not null
    and (min_rent is null or p.rent_bdt >= min_rent)
    and (max_rent is null or p.rent_bdt <= max_rent)
    and (min_bedrooms is null or coalesce(p.bedrooms, 0) >= min_bedrooms)
    and (
      renter_tenant_type is null
      or exists (
        select 1
        from public.property_tenant_types ptt
        where ptt.property_id = p.id
          and (ptt.tenant_type = renter_tenant_type or ptt.tenant_type = 'everyone'::public.tenant_type)
      )
    )
    and (
      radius_km is null
      or center_lat is null
      or center_long is null
      or extensions.st_dwithin(
        p.location,
        extensions.st_point(center_long, center_lat)::extensions.geography,
        radius_km * 1000
      )
    )
  order by
    case when center_lat is not null and center_long is not null then
      extensions.st_distance(p.location, extensions.st_point(center_long, center_lat)::extensions.geography)
    end asc nulls last,
    p.updated_at desc
  limit 200;
$$;

revoke all on function public.search_available_properties(double precision, double precision, double precision, integer, integer, public.tenant_type, smallint) from public;
grant execute on function public.search_available_properties(double precision, double precision, double precision, integer, integer, public.tenant_type, smallint) to anon, authenticated;

drop policy if exists "public can read media files for available properties" on storage.objects;
create policy "public can read media files for available properties"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'property-media'
  and storage.allow_any_operation(array['object.get_authenticated_info', 'object.get_authenticated'])
  and exists (
    select 1
    from public.properties p
    where p.id::text = (storage.foldername(name))[2]
      and p.status = 'available'::public.listing_status
      and p.published_at is not null
      and (p.expires_at is null or p.expires_at > now())
  )
);
