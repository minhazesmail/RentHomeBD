create or replace function public.get_public_property_detail(property_uuid uuid)
returns table (
  id uuid,
  title text,
  description text,
  address_text text,
  property_type public.property_type,
  rent_bdt integer,
  deposit_bdt integer,
  utilities_included text[],
  size_sqft integer,
  bedrooms integer,
  bathrooms integer,
  floor_number integer,
  total_floors integer,
  furnishing public.furnishing_status,
  gender_preference public.gender_preference,
  available_from date,
  latitude double precision,
  longitude double precision,
  published_at timestamptz,
  expires_at timestamptz,
  owner_display_name text,
  owner_role public.profile_role,
  tenant_types public.tenant_type[],
  amenities jsonb,
  media jsonb
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    p.id,
    p.title,
    p.description,
    p.address_text,
    p.property_type,
    p.rent_bdt,
    p.deposit_bdt,
    p.utilities_included,
    p.size_sqft,
    p.bedrooms,
    p.bathrooms,
    p.floor_number,
    p.total_floors,
    p.furnishing,
    p.gender_preference,
    p.available_from,
    p.latitude,
    p.longitude,
    p.published_at,
    p.expires_at,
    owner.display_name,
    owner.primary_role,
    coalesce((
      select array_agg(ptt.tenant_type order by ptt.tenant_type::text)
      from public.property_tenant_types ptt
      where ptt.property_id = p.id
    ), array[]::public.tenant_type[]),
    coalesce((
      select jsonb_agg(jsonb_build_object('slug', a.slug, 'name', a.name) order by a.name)
      from public.property_amenities pa
      join public.amenities a on a.slug = pa.amenity_slug
      where pa.property_id = p.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', pm.id, 'storage_path', pm.storage_path, 'media_type', pm.media_type, 'sort_order', pm.sort_order) order by pm.sort_order, pm.created_at)
      from public.property_media pm
      where pm.property_id = p.id
    ), '[]'::jsonb)
  from public.properties p
  join public.profiles owner on owner.id = p.owner_id
  where p.id = property_uuid
    and p.status = 'available'::public.listing_status
    and p.published_at is not null
    and (p.expires_at is null or p.expires_at > now());
$$;

revoke all on function public.get_public_property_detail(uuid) from public;
grant execute on function public.get_public_property_detail(uuid) to anon, authenticated;
