-- F06/F07: make owner listing saves retry-safe and give published/rented/expired
-- listings an explicit path back to a private editable draft.
--
-- Storage bytes still live outside Postgres transactions. The browser therefore
-- creates/validates a stable draft shell before uploads, then this migration
-- atomically reconciles property fields, relationships and media metadata. A
-- failed metadata save rolls back as one unit and can safely be retried against
-- the same property/media UUIDs.

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
      if old.status in (
          'available'::public.listing_status,
          'pending_confirmation'::public.listing_status,
          'rented'::public.listing_status,
          'expired'::public.listing_status
        )
        and new.status = 'draft'::public.listing_status
      then
        -- Beginning an edit/relist immediately takes the old publication out of
        -- circulation. Moderation actions remain intact as immutable history;
        -- a later approval creates the next public publication window.
        new.published_at := null;
        new.last_confirmed_at := null;
        new.expires_at := null;
        new.moderation_notes := null;
        new.public_owner_display_name := null;
        new.public_owner_role := null;
        new.public_owner_phone_verified_at := null;
        new.public_owner_role_verified_at := null;
        new.public_owner_role_verified_role := null;
      elsif not (
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

-- Establish an idempotent draft shell before Storage uploads. The caller chooses
-- the UUID once and reuses it for every retry. If a previous request created the
-- shell but its response was lost, the same UUID resolves to the same draft.
create or replace function public.ensure_property_draft(property_uuid uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user uuid := (select auth.uid());
  property_owner uuid;
  current_status public.listing_status;
begin
  if acting_user is null then
    raise exception 'Authentication required';
  end if;

  if property_uuid is null then
    raise exception 'Property id is required';
  end if;

  select property.owner_id, property.status
  into property_owner, current_status
  from public.properties property
  where property.id = property_uuid
  for update;

  if found then
    if property_owner <> acting_user then
      raise exception 'Only the property owner can save this listing';
    end if;

    if current_status = 'pending_review'::public.listing_status then
      update public.properties
      set status = 'draft'::public.listing_status
      where id = property_uuid;
      current_status := 'draft'::public.listing_status;
    end if;

    if current_status not in ('draft'::public.listing_status, 'rejected'::public.listing_status) then
      raise exception 'Start editing or relisting this property before changing its content';
    end if;

    return property_uuid;
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = acting_user
      and profile.primary_role in ('owner'::public.profile_role, 'agent'::public.profile_role)
  ) then
    raise exception 'Only owner or agent accounts can create property drafts';
  end if;

  insert into public.properties (id, owner_id, status)
  values (property_uuid, acting_user, 'draft'::public.listing_status);

  return property_uuid;
end;
$$;

revoke all on function public.ensure_property_draft(uuid) from public;
grant execute on function public.ensure_property_draft(uuid) to authenticated;

-- Reconcile all Postgres-backed listing state in one transaction. This function
-- deliberately does not submit for review: callers first save a valid private
-- draft, perform any best-effort Storage cleanup while the listing is editable,
-- then call submit_property_for_review. A failed submission therefore leaves a
-- complete retryable draft rather than a partially-mutated listing.
create or replace function public.save_property_draft(
  property_uuid uuid,
  property_payload jsonb,
  tenant_types public.tenant_type[] default array[]::public.tenant_type[],
  amenity_slugs text[] default array[]::text[],
  media_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user uuid := (select auth.uid());
  property_owner uuid;
  current_status public.listing_status;
  listing record;
  media_count integer;
  distinct_media_ids integer;
  distinct_media_paths integer;
  distinct_media_orders integer;
  minimum_media_order integer;
  maximum_media_order integer;
  media_item record;
  existing_media_property uuid;
  existing_media_path text;
  existing_media_type public.media_type;
begin
  if acting_user is null then
    raise exception 'Authentication required';
  end if;

  if property_uuid is null then
    raise exception 'Property id is required';
  end if;

  if property_payload is null or jsonb_typeof(property_payload) <> 'object' then
    raise exception 'Property payload must be a JSON object';
  end if;

  if media_items is null then
    media_items := '[]'::jsonb;
  end if;
  if jsonb_typeof(media_items) <> 'array' then
    raise exception 'Media items must be a JSON array';
  end if;

  select property.owner_id, property.status
  into property_owner, current_status
  from public.properties property
  where property.id = property_uuid
  for update;

  if not found then
    raise exception 'Property draft not found';
  end if;
  if property_owner <> acting_user then
    raise exception 'Only the property owner can save this listing';
  end if;

  if current_status = 'pending_review'::public.listing_status then
    update public.properties
    set status = 'draft'::public.listing_status
    where id = property_uuid;
    current_status := 'draft'::public.listing_status;
  end if;

  if current_status not in ('draft'::public.listing_status, 'rejected'::public.listing_status) then
    raise exception 'Listing must be editable before it can be saved';
  end if;

  select *
  into listing
  from jsonb_to_record(property_payload) as fields(
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
    longitude double precision
  );

  if listing.furnishing is null then
    raise exception 'Furnishing status is required';
  end if;
  if listing.gender_preference is null then
    raise exception 'Gender preference is required';
  end if;

  update public.properties
  set title = nullif(btrim(listing.title), ''),
      description = nullif(btrim(listing.description), ''),
      address_text = nullif(btrim(listing.address_text), ''),
      property_type = listing.property_type,
      rent_bdt = listing.rent_bdt,
      deposit_bdt = coalesce(listing.deposit_bdt, 0),
      utilities_included = coalesce(listing.utilities_included, array[]::text[]),
      size_sqft = listing.size_sqft,
      bedrooms = listing.bedrooms,
      bathrooms = listing.bathrooms,
      floor_number = listing.floor_number,
      total_floors = listing.total_floors,
      furnishing = listing.furnishing,
      gender_preference = listing.gender_preference,
      available_from = listing.available_from,
      latitude = listing.latitude,
      longitude = listing.longitude
  where id = property_uuid;

  delete from public.property_tenant_types
  where property_id = property_uuid;

  insert into public.property_tenant_types (property_id, tenant_type)
  select property_uuid, selected_type
  from unnest(coalesce(tenant_types, array[]::public.tenant_type[])) as selected_type
  where selected_type is not null
  on conflict do nothing;

  delete from public.property_amenities
  where property_id = property_uuid;

  insert into public.property_amenities (property_id, amenity_slug)
  select property_uuid, selected_slug
  from unnest(coalesce(amenity_slugs, array[]::text[])) as selected_slug
  where selected_slug is not null and btrim(selected_slug) <> ''
  on conflict do nothing;

  select
    count(*)::integer,
    count(distinct item.id)::integer,
    count(distinct item.storage_path)::integer,
    count(distinct item.sort_order)::integer,
    min(item.sort_order),
    max(item.sort_order)
  into
    media_count,
    distinct_media_ids,
    distinct_media_paths,
    distinct_media_orders,
    minimum_media_order,
    maximum_media_order
  from jsonb_to_recordset(media_items) as item(
    id uuid,
    storage_path text,
    media_type public.media_type,
    sort_order integer
  );

  if media_count > 10 then
    raise exception 'A listing can have up to 10 media files';
  end if;

  if media_count > 0 and (
    distinct_media_ids <> media_count
    or distinct_media_paths <> media_count
    or distinct_media_orders <> media_count
    or minimum_media_order <> 0
    or maximum_media_order <> media_count - 1
  ) then
    raise exception 'Media order must contain unique contiguous positions from 0';
  end if;

  -- Validate identities and immutable storage bindings before deleting any old
  -- metadata. An error anywhere below rolls the entire function back.
  for media_item in
    select *
    from jsonb_to_recordset(media_items) as item(
      id uuid,
      storage_path text,
      media_type public.media_type,
      sort_order integer
    )
  loop
    if media_item.id is null
       or media_item.storage_path is null
       or btrim(media_item.storage_path) = ''
       or media_item.media_type is null
       or media_item.sort_order is null
    then
      raise exception 'Every media item requires id, storage path, type and sort order';
    end if;

    if (storage.foldername(media_item.storage_path))[1] is distinct from acting_user::text
       or (storage.foldername(media_item.storage_path))[2] is distinct from property_uuid::text
    then
      raise exception 'Media path does not match this property';
    end if;

    select media.property_id, media.storage_path, media.media_type
    into existing_media_property, existing_media_path, existing_media_type
    from public.property_media media
    where media.id = media_item.id;

    if found and (
      existing_media_property <> property_uuid
      or existing_media_path <> media_item.storage_path
      or existing_media_type <> media_item.media_type
    ) then
      raise exception 'Existing media identity cannot be rebound to another file or property';
    end if;
  end loop;

  delete from public.property_media existing
  where existing.property_id = property_uuid
    and not exists (
      select 1
      from jsonb_to_recordset(media_items) as desired(id uuid)
      where desired.id = existing.id
    );

  for media_item in
    select *
    from jsonb_to_recordset(media_items) as item(
      id uuid,
      storage_path text,
      media_type public.media_type,
      sort_order integer
    )
    order by item.sort_order
  loop
    if exists (
      select 1 from public.property_media existing
      where existing.id = media_item.id and existing.property_id = property_uuid
    ) then
      update public.property_media
      set sort_order = media_item.sort_order
      where id = media_item.id and property_id = property_uuid;
    else
      insert into public.property_media (id, property_id, storage_path, media_type, sort_order)
      values (media_item.id, property_uuid, media_item.storage_path, media_item.media_type, media_item.sort_order);
    end if;
  end loop;

  return property_uuid;
end;
$$;

revoke all on function public.save_property_draft(uuid, jsonb, public.tenant_type[], text[], jsonb) from public;
grant execute on function public.save_property_draft(uuid, jsonb, public.tenant_type[], text[], jsonb) to authenticated;

-- Idempotent submission: if the request committed but the response was lost,
-- retrying returns the same property instead of attempting another transition.
create or replace function public.submit_property_for_review(property_uuid uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user uuid := (select auth.uid());
  property_owner uuid;
  current_status public.listing_status;
begin
  if acting_user is null then
    raise exception 'Authentication required';
  end if;

  select property.owner_id, property.status
  into property_owner, current_status
  from public.properties property
  where property.id = property_uuid
  for update;

  if not found then
    raise exception 'Property draft not found';
  end if;
  if property_owner <> acting_user then
    raise exception 'Only the property owner can submit this listing';
  end if;

  if current_status = 'pending_review'::public.listing_status then
    return property_uuid;
  end if;

  if current_status not in ('draft'::public.listing_status, 'rejected'::public.listing_status) then
    raise exception 'Only an editable draft can be submitted for review';
  end if;

  update public.properties
  set status = 'pending_review'::public.listing_status
  where id = property_uuid;

  return property_uuid;
end;
$$;

revoke all on function public.submit_property_for_review(uuid) from public;
grant execute on function public.submit_property_for_review(uuid) to authenticated;

-- Explicit edit/relist entry point. The prepare trigger owns the transition
-- cleanup so even an owner issuing the equivalent status-only UPDATE gets the
-- same safe behavior: the old publication/freshness/trust snapshot is cleared
-- and the listing must pass moderation before becoming public again.
create or replace function public.begin_property_edit(property_uuid uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user uuid := (select auth.uid());
  property_owner uuid;
  current_status public.listing_status;
begin
  if acting_user is null then
    raise exception 'Authentication required';
  end if;

  select property.owner_id, property.status
  into property_owner, current_status
  from public.properties property
  where property.id = property_uuid
  for update;

  if not found then
    raise exception 'Property not found';
  end if;
  if property_owner <> acting_user then
    raise exception 'Only the property owner can edit or relist this listing';
  end if;

  if current_status in ('draft'::public.listing_status, 'rejected'::public.listing_status) then
    return property_uuid;
  end if;

  if current_status not in (
    'pending_review'::public.listing_status,
    'available'::public.listing_status,
    'pending_confirmation'::public.listing_status,
    'rented'::public.listing_status,
    'expired'::public.listing_status
  ) then
    raise exception 'This listing cannot be moved into editing from its current state';
  end if;

  update public.properties
  set status = 'draft'::public.listing_status
  where id = property_uuid;

  return property_uuid;
end;
$$;

revoke all on function public.begin_property_edit(uuid) from public;
grant execute on function public.begin_property_edit(uuid) to authenticated;
