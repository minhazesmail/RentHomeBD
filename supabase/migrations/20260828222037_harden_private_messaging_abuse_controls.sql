-- Keep messaging chronology server-authoritative and apply conservative abuse limits.

create index if not exists messages_sender_created_idx
on public.messages (sender_id, created_at desc);

create index if not exists conversations_renter_created_idx
on public.conversations (renter_id, created_at desc);

create or replace function private.prepare_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  listing record;
  renter_name text;
  recent_conversation_count integer;
begin
  if (select auth.uid()) is null or new.renter_id <> (select auth.uid()) then
    raise exception 'Only the renter can start this conversation';
  end if;
  select count(*) into recent_conversation_count
  from public.conversations c
  where c.renter_id = (select auth.uid()) and c.created_at >= now() - interval '1 hour';
  if recent_conversation_count >= 20 then
    raise exception 'Conversation start limit reached. Please try again later';
  end if;
  select p.owner_id, p.title, p.public_owner_display_name into listing
  from public.properties p
  where p.id = new.property_id and p.status = 'available'::public.listing_status
    and p.published_at is not null and (p.expires_at is null or p.expires_at > now());
  if not found then raise exception 'This property is not currently available'; end if;
  if listing.owner_id = new.renter_id then raise exception 'Owners cannot start a renter conversation with their own listing'; end if;
  select display_name into renter_name from public.profiles where id = new.renter_id;
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

create or replace function private.prepare_message()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  conv public.conversations%rowtype;
  recent_minute_count integer;
  recent_hour_count integer;
begin
  select * into conv from public.conversations where id = new.conversation_id;
  if not found then raise exception 'Conversation not found'; end if;
  if new.sender_id <> (select auth.uid()) then raise exception 'Sender mismatch'; end if;
  if new.sender_id <> conv.renter_id and new.sender_id <> conv.owner_id then raise exception 'Not a participant'; end if;
  select count(*) into recent_minute_count from public.messages m
  where m.sender_id = (select auth.uid()) and m.created_at >= now() - interval '1 minute';
  if recent_minute_count >= 30 then raise exception 'Message rate limit reached. Please wait a moment before sending more messages'; end if;
  select count(*) into recent_hour_count from public.messages m
  where m.sender_id = (select auth.uid()) and m.created_at >= now() - interval '1 hour';
  if recent_hour_count >= 300 then raise exception 'Hourly message limit reached. Please try again later'; end if;
  new.body := btrim(new.body);
  new.created_at := now();
  return new;
end;
$$;
revoke all on function private.prepare_message() from public;
