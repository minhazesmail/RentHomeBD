-- F20: provide support that works while signed out, durable data/account
-- request intake, and participant blocking enforced below the UI.

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  category text not null check (category in ('account_recovery', 'otp_delivery', 'data_export', 'account_deletion', 'safety_abuse', 'other')),
  subject text not null check (char_length(subject) between 3 and 120),
  details text not null check (char_length(details) between 10 and 4000),
  context jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_requests_user_created_idx on public.support_requests (user_id, created_at desc) where user_id is not null;
create index if not exists support_requests_email_created_idx on public.support_requests (lower(email), created_at desc);

alter table public.support_requests enable row level security;
revoke all on public.support_requests from public, anon, authenticated;
grant select on public.support_requests to authenticated;

drop policy if exists "users can read own support requests" on public.support_requests;
create policy "users can read own support requests"
on public.support_requests
for select
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.submit_support_request(
  request_email text,
  request_category text,
  request_subject text,
  request_details text,
  request_context jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  normalized_email text := lower(btrim(coalesce(request_email, '')));
  normalized_category text := btrim(coalesce(request_category, ''));
  normalized_subject text := btrim(coalesce(request_subject, ''));
  normalized_details text := btrim(coalesce(request_details, ''));
  new_id uuid;
  recent_count integer;
begin
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(normalized_email) > 254 then
    raise exception 'Please enter a valid support email address';
  end if;
  if normalized_category not in ('account_recovery', 'otp_delivery', 'data_export', 'account_deletion', 'safety_abuse', 'other') then
    raise exception 'Unsupported support category';
  end if;
  if char_length(normalized_subject) < 3 or char_length(normalized_subject) > 120 then
    raise exception 'Support subject must be between 3 and 120 characters';
  end if;
  if char_length(normalized_details) < 10 or char_length(normalized_details) > 4000 then
    raise exception 'Support details must be between 10 and 4000 characters';
  end if;
  if jsonb_typeof(coalesce(request_context, '{}'::jsonb)) <> 'object' then
    raise exception 'Support context must be an object';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nearbasha:support:' || coalesce(actor::text, normalized_email), 0)
  );

  select count(*)::integer into recent_count
  from public.support_requests request
  where request.created_at >= now() - interval '1 hour'
    and (
      (actor is not null and request.user_id = actor)
      or (actor is null and lower(request.email) = normalized_email)
    );

  if recent_count >= 5 then
    raise exception 'Support request limit reached. Please try again later';
  end if;

  insert into public.support_requests (user_id, email, category, subject, details, context)
  values (actor, normalized_email, normalized_category, normalized_subject, normalized_details, coalesce(request_context, '{}'::jsonb))
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_support_request(text, text, text, text, jsonb) from public;
revoke all on function public.submit_support_request(text, text, text, text, jsonb) from anon, authenticated;
grant execute on function public.submit_support_request(text, text, text, text, jsonb) to anon, authenticated;

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from public, anon, authenticated;
grant select on public.user_blocks to authenticated;

drop policy if exists "users can read own blocks" on public.user_blocks;
create policy "users can read own blocks"
on public.user_blocks
for select
to authenticated
using (blocker_id = (select auth.uid()));

create or replace function public.set_user_block(blocked_user uuid, should_block boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null then raise exception 'Sign in required'; end if;
  if blocked_user is null or blocked_user = actor then raise exception 'Invalid block target'; end if;

  if not exists (
    select 1 from public.conversations conversation
    where (conversation.renter_id = actor and conversation.owner_id = blocked_user)
       or (conversation.owner_id = actor and conversation.renter_id = blocked_user)
  ) then
    raise exception 'You can only block someone from an existing conversation';
  end if;

  if should_block then
    insert into public.user_blocks (blocker_id, blocked_id)
    values (actor, blocked_user)
    on conflict (blocker_id, blocked_id) do nothing;
  else
    delete from public.user_blocks
    where blocker_id = actor and blocked_id = blocked_user;
  end if;
  return should_block;
end;
$$;

revoke all on function public.set_user_block(uuid, boolean) from public;
revoke all on function public.set_user_block(uuid, boolean) from anon, authenticated;
grant execute on function public.set_user_block(uuid, boolean) to authenticated;

create or replace function public.get_conversation_block_state(conversation_uuid uuid)
returns table (blocked boolean, blocked_by_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with participant as (
    select conversation.renter_id, conversation.owner_id,
      case when conversation.renter_id = (select auth.uid()) then conversation.owner_id
           when conversation.owner_id = (select auth.uid()) then conversation.renter_id
           else null end as other_id
    from public.conversations conversation
    where conversation.id = conversation_uuid
      and ((conversation.renter_id = (select auth.uid())) or (conversation.owner_id = (select auth.uid())))
  )
  select
    exists (
      select 1 from public.user_blocks block
      join participant on true
      where (block.blocker_id = (select auth.uid()) and block.blocked_id = participant.other_id)
         or (block.blocker_id = participant.other_id and block.blocked_id = (select auth.uid()))
    ) as blocked,
    exists (
      select 1 from public.user_blocks block
      join participant on true
      where block.blocker_id = (select auth.uid()) and block.blocked_id = participant.other_id
    ) as blocked_by_me
  from participant;
$$;

revoke all on function public.get_conversation_block_state(uuid) from public;
revoke all on function public.get_conversation_block_state(uuid) from anon, authenticated;
grant execute on function public.get_conversation_block_state(uuid) to authenticated;

create or replace function private.prepare_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  listing record;
  renter_name text;
  recent_conversation_count integer;
begin
  if actor is null or new.renter_id <> actor then raise exception 'Only the renter can start this conversation'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('nearbasha:conversation-start:' || actor::text, 0));
  select count(*) into recent_conversation_count from public.conversations conversation
  where conversation.renter_id = actor and conversation.created_at >= now() - interval '1 hour';
  if recent_conversation_count >= 20 then raise exception 'Conversation start limit reached. Please try again later'; end if;

  select property.owner_id, property.title, property.public_owner_display_name into listing
  from public.properties property
  where property.id = new.property_id and property.status = 'available'::public.listing_status
    and property.published_at is not null and (property.expires_at is null or property.expires_at > now());
  if not found then raise exception 'This property is not currently available'; end if;
  if listing.owner_id = new.renter_id then raise exception 'Owners cannot start a renter conversation with their own listing'; end if;
  if exists (select 1 from public.user_blocks block where (block.blocker_id = actor and block.blocked_id = listing.owner_id) or (block.blocker_id = listing.owner_id and block.blocked_id = actor)) then
    raise exception 'Messaging is blocked between these accounts';
  end if;

  select profile.display_name into renter_name from public.profiles profile where profile.id = new.renter_id;
  new.owner_id := listing.owner_id;
  new.renter_display_name := renter_name;
  new.owner_display_name := listing.public_owner_display_name;
  new.property_title := listing.title;
  new.created_at := now();
  new.last_message_at := null;
  new.renter_last_read_at := now();
  new.owner_last_read_at := null;
  return new;
end;
$$;

revoke all on function private.prepare_conversation() from public;
revoke all on function private.prepare_conversation() from anon, authenticated;

create or replace function private.prepare_message()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  conversation public.conversations%rowtype;
  recent_minute_count integer;
  recent_hour_count integer;
begin
  select * into conversation from public.conversations where id = new.conversation_id;
  if not found then raise exception 'Conversation not found'; end if;
  if actor is null or new.sender_id <> actor then raise exception 'Sender mismatch'; end if;
  if new.sender_id <> conversation.renter_id and new.sender_id <> conversation.owner_id then raise exception 'Not a participant'; end if;
  if exists (
    select 1 from public.user_blocks block
    where (block.blocker_id = conversation.renter_id and block.blocked_id = conversation.owner_id)
       or (block.blocker_id = conversation.owner_id and block.blocked_id = conversation.renter_id)
  ) then raise exception 'Messaging is blocked between these accounts'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('nearbasha:message-send:' || actor::text, 0));
  select count(*) into recent_minute_count from public.messages message where message.sender_id = actor and message.created_at >= now() - interval '1 minute';
  if recent_minute_count >= 30 then raise exception 'Message rate limit reached. Please wait a moment before sending more messages'; end if;
  select count(*) into recent_hour_count from public.messages message where message.sender_id = actor and message.created_at >= now() - interval '1 hour';
  if recent_hour_count >= 300 then raise exception 'Hourly message limit reached. Please try again later'; end if;
  new.body := btrim(new.body);
  new.created_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_message() from public;
revoke all on function private.prepare_message() from anon, authenticated;
