create type public.moderation_decision as enum ('approve', 'reject');

create table public.moderators (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.property_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  decision public.moderation_decision not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint property_moderation_reject_notes check (
    decision <> 'reject'::public.moderation_decision
    or (notes is not null and char_length(btrim(notes)) between 3 and 2000)
  ),
  constraint property_moderation_notes_length check (notes is null or char_length(notes) <= 2000)
);

create index property_moderation_actions_property_id_idx on public.property_moderation_actions(property_id, created_at desc);
create index property_moderation_actions_reviewer_id_idx on public.property_moderation_actions(reviewer_id, created_at desc);

alter table public.moderators enable row level security;
alter table public.property_moderation_actions enable row level security;

revoke all on table public.moderators from anon, authenticated;
revoke all on table public.property_moderation_actions from anon, authenticated;
grant select on table public.moderators to authenticated;
grant select, insert on table public.property_moderation_actions to authenticated;

create policy "moderators can read own membership" on public.moderators for select to authenticated
using (user_id = (select auth.uid()));

create policy "moderators can read moderation actions" on public.property_moderation_actions for select to authenticated
using (exists (select 1 from public.moderators m where m.user_id = (select auth.uid())));

create policy "moderators can create moderation actions" on public.property_moderation_actions for insert to authenticated
with check (
  reviewer_id = (select auth.uid())
  and exists (select 1 from public.moderators m where m.user_id = (select auth.uid()))
);

create policy "moderators can read properties" on public.properties for select to authenticated
using (exists (select 1 from public.moderators m where m.user_id = (select auth.uid())));

create policy "moderators can read profiles" on public.profiles for select to authenticated
using (exists (select 1 from public.moderators m where m.user_id = (select auth.uid())));

create policy "moderators can read property media files" on storage.objects for select to authenticated
using (
  bucket_id = 'property-media'
  and exists (select 1 from public.moderators m where m.user_id = (select auth.uid()))
);

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

drop trigger if exists property_moderation_apply on public.property_moderation_actions;
create trigger property_moderation_apply
after insert on public.property_moderation_actions
for each row execute function private.apply_property_moderation();
