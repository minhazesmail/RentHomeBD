create type public.listing_report_reason as enum (
  'fake_listing',
  'wrong_location',
  'unavailable',
  'scam_suspicion',
  'discrimination',
  'inappropriate_content',
  'duplicate',
  'other'
);

create type public.listing_report_status as enum ('open', 'closed');
create type public.listing_report_action as enum ('dismiss', 'resolve', 'hide_listing');

create table public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason public.listing_report_reason not null,
  details text,
  status public.listing_report_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint listing_reports_details_length check (details is null or char_length(btrim(details)) between 3 and 2000),
  constraint listing_reports_reporter_property_unique unique (property_id, reporter_id)
);

create table public.listing_report_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.listing_reports(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  action public.listing_report_action not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint listing_report_actions_notes_length check (notes is null or char_length(btrim(notes)) between 3 and 2000),
  constraint listing_report_actions_hide_notes check (
    action <> 'hide_listing'::public.listing_report_action
    or (notes is not null and char_length(btrim(notes)) between 3 and 2000)
  )
);

create index listing_reports_status_created_at_idx on public.listing_reports(status, created_at);
create index listing_reports_reporter_id_idx on public.listing_reports(reporter_id, created_at desc);
create index listing_reports_property_id_idx on public.listing_reports(property_id, created_at desc);
create index listing_report_actions_report_id_idx on public.listing_report_actions(report_id, created_at desc);
create index listing_report_actions_reviewer_id_idx on public.listing_report_actions(reviewer_id, created_at desc);

alter table public.listing_reports enable row level security;
alter table public.listing_report_actions enable row level security;

revoke all on table public.listing_reports from anon, authenticated;
revoke all on table public.listing_report_actions from anon, authenticated;
grant select, insert on table public.listing_reports to authenticated;
grant select, insert on table public.listing_report_actions to authenticated;

create policy "reporters and moderators can read listing reports"
on public.listing_reports
for select
to authenticated
using (
  reporter_id = (select auth.uid())
  or exists (select 1 from public.moderators moderator where moderator.user_id = (select auth.uid()))
);

create policy "users can report public listings"
on public.listing_reports
for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and exists (
    select 1 from public.properties property
    where property.id = property_id
      and property.owner_id <> (select auth.uid())
      and property.status = 'available'::public.listing_status
      and property.published_at is not null
      and (property.expires_at is null or property.expires_at > now())
  )
);

create policy "moderators can read listing report actions"
on public.listing_report_actions
for select
to authenticated
using (exists (select 1 from public.moderators moderator where moderator.user_id = (select auth.uid())));

create policy "moderators can create listing report actions"
on public.listing_report_actions
for insert
to authenticated
with check (
  reviewer_id = (select auth.uid())
  and exists (select 1 from public.moderators moderator where moderator.user_id = (select auth.uid()))
  and exists (select 1 from public.listing_reports report where report.id = report_id and report.status = 'open'::public.listing_report_status)
);

create or replace function private.apply_listing_report_action()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_property_id uuid;
  current_report_status public.listing_report_status;
begin
  if new.reviewer_id <> (select auth.uid()) then
    raise exception 'Reviewer identity does not match authenticated user';
  end if;

  if not exists (select 1 from public.moderators moderator where moderator.user_id = (select auth.uid())) then
    raise exception 'Moderator access required';
  end if;

  select report.property_id, report.status
  into target_property_id, current_report_status
  from public.listing_reports report
  where report.id = new.report_id
  for update;

  if target_property_id is null then raise exception 'Report not found'; end if;
  if current_report_status <> 'open'::public.listing_report_status then raise exception 'Report is already closed'; end if;

  update public.listing_reports set status = 'closed'::public.listing_report_status where id = new.report_id;

  if new.action = 'hide_listing'::public.listing_report_action then
    update public.properties
    set status = 'rejected'::public.listing_status,
        moderation_notes = btrim(new.notes),
        published_at = null,
        last_confirmed_at = null,
        expires_at = null,
        updated_at = now()
    where id = target_property_id;
  end if;

  return new;
end;
$$;

revoke all on function private.apply_listing_report_action() from public;
revoke all on function private.apply_listing_report_action() from anon, authenticated;

drop trigger if exists listing_report_action_apply on public.listing_report_actions;
create trigger listing_report_action_apply
after insert on public.listing_report_actions
for each row execute function private.apply_listing_report_action();
