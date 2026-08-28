-- Allow moderators to inspect child metadata for listings under review without reopening
-- those rows to all authenticated users.

alter policy "authenticated can read tenant types for visible properties"
on public.property_tenant_types
to authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.id = property_id
      and (
        p.owner_id = (select auth.uid())
        or (
          p.status = 'available'::public.listing_status
          and p.published_at is not null
          and (p.expires_at is null or p.expires_at > now())
        )
        or exists (
          select 1
          from public.moderators m
          where m.user_id = (select auth.uid())
        )
      )
  )
);

alter policy "authenticated can read amenities for visible properties"
on public.property_amenities
to authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.id = property_id
      and (
        p.owner_id = (select auth.uid())
        or (
          p.status = 'available'::public.listing_status
          and p.published_at is not null
          and (p.expires_at is null or p.expires_at > now())
        )
        or exists (
          select 1
          from public.moderators m
          where m.user_id = (select auth.uid())
        )
      )
  )
);

alter policy "authenticated can read media for visible properties"
on public.property_media
to authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.id = property_id
      and (
        p.owner_id = (select auth.uid())
        or (
          p.status = 'available'::public.listing_status
          and p.published_at is not null
          and (p.expires_at is null or p.expires_at > now())
        )
        or exists (
          select 1
          from public.moderators m
          where m.user_id = (select auth.uid())
        )
      )
  )
);
