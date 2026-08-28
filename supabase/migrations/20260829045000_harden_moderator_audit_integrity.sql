-- Keep moderation/audit records server-authoritative and prevent self-verification.

create or replace function private.prepare_property_moderation_action()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reviewer_id <> (select auth.uid()) then
    raise exception 'Reviewer identity does not match authenticated user';
  end if;
  if not exists (select 1 from public.moderators m where m.user_id = (select auth.uid())) then
    raise exception 'Moderator access required';
  end if;
  new.created_at := now();
  return new;
end;
$$;
revoke all on function private.prepare_property_moderation_action() from public;

drop trigger if exists property_moderation_action_prepare on public.property_moderation_actions;
create trigger property_moderation_action_prepare
before insert on public.property_moderation_actions
for each row execute function private.prepare_property_moderation_action();

create or replace function private.prepare_listing_report()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reporter_id <> (select auth.uid()) then
    raise exception 'Reporter identity does not match authenticated user';
  end if;
  new.status := 'open'::public.listing_report_status;
  new.created_at := now();
  return new;
end;
$$;
revoke all on function private.prepare_listing_report() from public;

drop trigger if exists listing_report_prepare on public.listing_reports;
create trigger listing_report_prepare
before insert on public.listing_reports
for each row execute function private.prepare_listing_report();

create or replace function private.prepare_listing_report_action()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reviewer_id <> (select auth.uid()) then
    raise exception 'Reviewer identity does not match authenticated user';
  end if;
  if not exists (select 1 from public.moderators m where m.user_id = (select auth.uid())) then
    raise exception 'Moderator access required';
  end if;
  new.created_at := now();
  return new;
end;
$$;
revoke all on function private.prepare_listing_report_action() from public;

drop trigger if exists listing_report_action_prepare on public.listing_report_actions;
create trigger listing_report_action_prepare
before insert on public.listing_report_actions
for each row execute function private.prepare_listing_report_action();

create or replace function private.prepare_profile_verification_action()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_verified_at timestamptz;
begin
  if new.reviewer_id <> (select auth.uid()) then
    raise exception 'Reviewer identity does not match authenticated user';
  end if;
  if not exists (select 1 from public.moderators m where m.user_id = (select auth.uid())) then
    raise exception 'Moderator access required';
  end if;
  if new.target_user_id = new.reviewer_id then
    raise exception 'Moderators cannot verify or revoke verification on their own account';
  end if;

  select p.role_verified_at
  into current_verified_at
  from public.profiles p
  where p.id = new.target_user_id
  for update;

  if not found then
    raise exception 'Target account not found';
  end if;

  if new.decision = 'verify'::public.profile_verification_decision and current_verified_at is not null then
    raise exception 'Account role is already verified';
  end if;
  if new.decision = 'revoke'::public.profile_verification_decision and current_verified_at is null then
    raise exception 'Account role is not currently verified';
  end if;

  new.created_at := now();
  return new;
end;
$$;
revoke all on function private.prepare_profile_verification_action() from public;

drop trigger if exists profile_verification_action_prepare on public.profile_verification_actions;
create trigger profile_verification_action_prepare
before insert on public.profile_verification_actions
for each row execute function private.prepare_profile_verification_action();
