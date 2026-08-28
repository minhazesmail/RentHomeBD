-- Restrict authenticated reads of listing child metadata to listings the user
-- can actually see: their own listings, or currently public available listings.

alter policy "authenticated can read tenant types for visible properties"
on public.property_tenant_types
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and (
        p.owner_id = (select auth.uid())
        or (
          p.status = 'available'
          and p.published_at is not null
          and (p.expires_at is null or p.expires_at > now())
        )
      )
  )
);

alter policy "authenticated can read amenities for visible properties"
on public.property_amenities
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and (
        p.owner_id = (select auth.uid())
        or (
          p.status = 'available'
          and p.published_at is not null
          and (p.expires_at is null or p.expires_at > now())
        )
      )
  )
);

alter policy "authenticated can read media for visible properties"
on public.property_media
to authenticated
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
      and (
        p.owner_id = (select auth.uid())
        or (
          p.status = 'available'
          and p.published_at is not null
          and (p.expires_at is null or p.expires_at > now())
        )
      )
  )
);
