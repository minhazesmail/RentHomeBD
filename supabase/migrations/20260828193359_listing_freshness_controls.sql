create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

grant update (last_confirmed_at, expires_at) on table public.properties to authenticated;

create or replace function private.prepare_property_listing()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  acting_user uuid := (select auth.uid());
  owner_reconfirmed boolean := false;
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := extensions.st_point(new.longitude, new.latitude)::extensions.geography;
  else
    new.location := null;
  end if;

  if tg_op = 'UPDATE' and acting_user is not null and acting_user = new.owner_id then
    owner_reconfirmed :=
      old.status in ('available'::public.listing_status, 'pending_confirmation'::public.listing_status)
      and new.last_confirmed_at is distinct from old.last_confirmed_at;

    if owner_reconfirmed then
      new.status := 'available'::public.listing_status;
      new.last_confirmed_at := now();
      new.expires_at := now() + interval '14 days';
    elsif new.last_confirmed_at is distinct from old.last_confirmed_at
       or new.expires_at is distinct from old.expires_at then
      raise exception 'Freshness timestamps can only be changed by reconfirming an active listing';
    end if;

    if new.status is distinct from old.status and not owner_reconfirmed then
      if not (
        (old.status in ('draft'::public.listing_status, 'rejected'::public.listing_status)
          and new.status = 'pending_review'::public.listing_status)
        or (old.status = 'pending_review'::public.listing_status
          and new.status = 'draft'::public.listing_status)
        or (old.status in ('available'::public.listing_status, 'pending_confirmation'::public.listing_status)
          and new.status = 'rented'::public.listing_status)
      ) then
        raise exception 'Listing status transition is not allowed for the owner';
      end if;
    end if;
  end if;

  if new.status = 'pending_review'::public.listing_status then
    if new.title is null or char_length(btrim(new.title)) < 5 then raise exception 'A title of at least 5 characters is required before submission'; end if;
    if new.address_text is null or char_length(btrim(new.address_text)) < 3 then raise exception 'Address or area is required before submission'; end if;
    if new.property_type is null then raise exception 'Property type is required before submission'; end if;
    if new.rent_bdt is null or new.rent_bdt <= 0 then raise exception 'Monthly rent is required before submission'; end if;
    if new.available_from is null then raise exception 'Availability date is required before submission'; end if;
    if new.latitude is null or new.longitude is null then raise exception 'Exact map coordinates are required before submission'; end if;
    if not exists (select 1 from public.property_tenant_types tenant where tenant.property_id = new.id) then raise exception 'Choose at least one preferred tenant type before submission'; end if;
    if not exists (select 1 from public.property_media media where media.property_id = new.id and media.media_type = 'photo'::public.media_type) then raise exception 'Upload at least one property photo before submission'; end if;
  end if;

  return new;
end;
$$;

revoke all on function private.prepare_property_listing() from public;

create or replace function private.sweep_stale_properties()
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.properties
  set status = 'pending_confirmation'::public.listing_status,
      updated_at = now()
  where status = 'available'::public.listing_status
    and expires_at is not null
    and expires_at <= now();

  update public.properties
  set status = 'expired'::public.listing_status,
      updated_at = now()
  where status = 'pending_confirmation'::public.listing_status
    and expires_at is not null
    and expires_at <= now() - interval '7 days';
end;
$$;

revoke all on function private.sweep_stale_properties() from public;

select cron.unschedule(jobid)
from cron.job
where jobname = 'renthomebd-stale-listing-sweep';

select cron.schedule(
  'renthomebd-stale-listing-sweep',
  '17 * * * *',
  'select private.sweep_stale_properties();'
);
