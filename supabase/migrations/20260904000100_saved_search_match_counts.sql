create or replace function public.count_saved_search_matches(
  center_lat double precision,
  center_long double precision,
  radius_km double precision default null,
  min_rent integer default null,
  max_rent integer default null,
  renter_tenant_type public.tenant_type default null,
  min_bedrooms smallint default null,
  changed_since timestamptz default null
)
returns table (
  current_count bigint,
  new_count bigint
)
language sql
security invoker
set search_path = ''
as $$
  select
    count(*) as current_count,
    count(*) filter (where changed_since is not null and p.published_at > changed_since) as new_count
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
      or extensions.st_dwithin(
        p.location,
        extensions.st_point(center_long, center_lat)::extensions.geography,
        radius_km * 1000
      )
    );
$$;

revoke all on function public.count_saved_search_matches(double precision, double precision, double precision, integer, integer, public.tenant_type, smallint, timestamptz) from public;
grant execute on function public.count_saved_search_matches(double precision, double precision, double precision, integer, integer, public.tenant_type, smallint, timestamptz) to authenticated;
