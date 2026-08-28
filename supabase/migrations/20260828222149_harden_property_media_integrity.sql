-- Enforce listing media limits at Storage and bind metadata to real owned objects.

create or replace function private.guard_property_media_storage_object()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  path_parts text[];
  path_owner uuid;
  path_property uuid;
  target_status public.listing_status;
  existing_count integer;
begin
  if new.bucket_id <> 'property-media' then
    return new;
  end if;

  path_parts := storage.foldername(new.name);
  if coalesce(array_length(path_parts, 1), 0) < 2 then
    raise exception 'Property media path is invalid';
  end if;

  begin
    path_owner := path_parts[1]::uuid;
    path_property := path_parts[2]::uuid;
  exception when invalid_text_representation then
    raise exception 'Property media path is invalid';
  end;

  if path_owner <> (select auth.uid()) then
    raise exception 'Property media owner path does not match authenticated user';
  end if;

  select p.status
  into target_status
  from public.properties p
  where p.id = path_property
    and p.owner_id = path_owner
  for update;

  if not found then
    raise exception 'Property media path does not belong to an owned listing';
  end if;

  if target_status not in ('draft'::public.listing_status, 'rejected'::public.listing_status) then
    raise exception 'Media can only be changed while a listing is editable';
  end if;

  if tg_op = 'INSERT' then
    select count(*)
    into existing_count
    from storage.objects object
    where object.bucket_id = 'property-media'
      and (storage.foldername(object.name))[1] = path_owner::text
      and (storage.foldername(object.name))[2] = path_property::text;

    if existing_count >= 10 then
      raise exception 'A listing can have up to 10 media files';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_property_media_storage_object() from public;

drop trigger if exists property_media_storage_object_guard on storage.objects;
create trigger property_media_storage_object_guard
before insert or update of name, bucket_id on storage.objects
for each row execute function private.guard_property_media_storage_object();

create or replace function private.guard_property_media_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  property_owner uuid;
  property_status public.listing_status;
  object_mime text;
  metadata_count integer;
begin
  select p.owner_id, p.status
  into property_owner, property_status
  from public.properties p
  where p.id = new.property_id
  for update;

  if not found then
    raise exception 'Property not found';
  end if;

  if property_owner <> (select auth.uid()) then
    raise exception 'Only the property owner can register media';
  end if;

  if property_status not in ('draft'::public.listing_status, 'rejected'::public.listing_status) then
    raise exception 'Media can only be changed while a listing is editable';
  end if;

  if (storage.foldername(new.storage_path))[1] is distinct from property_owner::text
     or (storage.foldername(new.storage_path))[2] is distinct from new.property_id::text then
    raise exception 'Media path does not match this property';
  end if;

  select lower(coalesce(object.metadata ->> 'mimetype', ''))
  into object_mime
  from storage.objects object
  where object.bucket_id = 'property-media'
    and object.name = new.storage_path;

  if not found then
    raise exception 'Media file must exist in property storage before metadata is registered';
  end if;

  if new.media_type = 'photo'::public.media_type
     and object_mime not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception 'Photo metadata does not match the uploaded file type';
  end if;

  if new.media_type = 'video'::public.media_type
     and object_mime not in ('video/mp4', 'video/webm') then
    raise exception 'Video metadata does not match the uploaded file type';
  end if;

  if tg_op = 'INSERT' then
    select count(*)
    into metadata_count
    from public.property_media media
    where media.property_id = new.property_id;

    if metadata_count >= 10 then
      raise exception 'A listing can have up to 10 media files';
    end if;
  end if;

  new.created_at := case when tg_op = 'INSERT' then now() else old.created_at end;
  return new;
end;
$$;

revoke all on function private.guard_property_media_metadata() from public;

drop trigger if exists property_media_metadata_guard on public.property_media;
create trigger property_media_metadata_guard
before insert or update of property_id, storage_path, media_type on public.property_media
for each row execute function private.guard_property_media_metadata();

alter table public.property_media
  drop constraint if exists property_media_sort_nonnegative;

alter table public.property_media
  add constraint property_media_sort_range
  check (sort_order between 0 and 9);
