-- Defense in depth: an incomplete listing must never become public, even if a
-- legacy/imported row somehow reaches pending_review without passing the owner
-- submission trigger.

create or replace function private.apply_property_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status public.listing_status;
begin
  if new.reviewer_id <> (select auth.uid()) then
    raise exception 'Reviewer identity does not match authenticated user';
  end if;

  if not exists (select 1 from public.moderators m where m.user_id = (select auth.uid())) then
    raise exception 'Moderator access required';
  end if;

  select p.status into current_status
  from public.properties p
  where p.id = new.property_id
  for update;

  if current_status is distinct from 'pending_review'::public.listing_status then
    raise exception 'Only pending-review listings can be moderated';
  end if;

  if new.decision = 'approve'::public.moderation_decision then
    if not exists (
      select 1
      from public.property_tenant_types tenant
      where tenant.property_id = new.property_id
    ) then
      raise exception 'Cannot approve listing without at least one preferred tenant type';
    end if;

    if not exists (
      select 1
      from public.property_media media
      where media.property_id = new.property_id
        and media.media_type = 'photo'::public.media_type
    ) then
      raise exception 'Cannot approve listing without at least one property photo';
    end if;

    update public.properties
    set status = 'available'::public.listing_status,
        moderation_notes = null,
        published_at = coalesce(published_at, now()),
        last_confirmed_at = now(),
        expires_at = now() + interval '14 days'
    where id = new.property_id;
  else
    update public.properties
    set status = 'rejected'::public.listing_status,
        moderation_notes = btrim(new.notes),
        published_at = null,
        last_confirmed_at = null,
        expires_at = null
    where id = new.property_id;
  end if;

  return new;
end;
$$;

revoke all on function private.apply_property_moderation() from public;
