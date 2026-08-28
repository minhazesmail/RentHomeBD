-- Preserve moderation, reporting, messaging, and trust history by limiting hard deletion.
-- Only never-moderated drafts may be physically deleted, and storage must be emptied first.

create or replace function private.guard_property_hard_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.owner_id <> (select auth.uid()) then
    raise exception 'Only the property owner can delete this listing';
  end if;
  if old.status <> 'draft'::public.listing_status then
    raise exception 'Only draft listings can be permanently deleted. Retire moderated listings through their status workflow';
  end if;
  if exists (select 1 from public.property_moderation_actions action where action.property_id = old.id) then
    raise exception 'Listings with moderation history cannot be permanently deleted';
  end if;
  if exists (select 1 from public.listing_reports report where report.property_id = old.id) then
    raise exception 'Listings with report history cannot be permanently deleted';
  end if;
  if exists (select 1 from public.conversations conversation where conversation.property_id = old.id) then
    raise exception 'Listings with conversation history cannot be permanently deleted';
  end if;
  if exists (
    select 1 from storage.objects object
    where object.bucket_id = 'property-media'
      and (storage.foldername(object.name))[1] = old.owner_id::text
      and (storage.foldername(object.name))[2] = old.id::text
  ) then
    raise exception 'Remove all uploaded property media before permanently deleting this draft';
  end if;
  return old;
end;
$$;
revoke all on function private.guard_property_hard_delete() from public;

drop trigger if exists properties_guard_hard_delete on public.properties;
create trigger properties_guard_hard_delete before delete on public.properties for each row execute function private.guard_property_hard_delete();

drop policy if exists "owners can delete own properties" on public.properties;
create policy "owners can delete unmoderated draft properties"
on public.properties
for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and status = 'draft'::public.listing_status
  and not exists (select 1 from public.property_moderation_actions action where action.property_id = id)
  and not exists (select 1 from public.listing_reports report where report.property_id = id)
  and not exists (select 1 from public.conversations conversation where conversation.property_id = id)
);
