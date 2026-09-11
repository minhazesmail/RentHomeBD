-- F16: expose only the other conversation participant's verification fact.
-- F17: serialize per-user quota checks so concurrent requests cannot all pass
-- the same pre-insert count.

create or replace function public.get_conversation_participant_trust(conversation_uuid uuid)
returns table (phone_verified boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select (other_profile.phone_verified_at is not null) as phone_verified
  from public.conversations conversation
  join public.profiles other_profile
    on other_profile.id = case
      when conversation.renter_id = (select auth.uid()) then conversation.owner_id
      when conversation.owner_id = (select auth.uid()) then conversation.renter_id
      else null
    end
  where conversation.id = conversation_uuid
    and (select auth.uid()) is not null
    and (
      conversation.renter_id = (select auth.uid())
      or conversation.owner_id = (select auth.uid())
    );
$$;

revoke all on function public.get_conversation_participant_trust(uuid) from public;
revoke all on function public.get_conversation_participant_trust(uuid) from anon, authenticated;
grant execute on function public.get_conversation_participant_trust(uuid) to authenticated;

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
  if actor is null or new.renter_id <> actor then
    raise exception 'Only the renter can start this conversation';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nearbasha:conversation-start:' || actor::text, 0)
  );

  select count(*) into recent_conversation_count
  from public.conversations conversation
  where conversation.renter_id = actor
    and conversation.created_at >= now() - interval '1 hour';

  if recent_conversation_count >= 20 then
    raise exception 'Conversation start limit reached. Please try again later';
  end if;

  select property.owner_id, property.title, property.public_owner_display_name
  into listing
  from public.properties property
  where property.id = new.property_id
    and property.status = 'available'::public.listing_status
    and property.published_at is not null
    and (property.expires_at is null or property.expires_at > now());

  if not found then
    raise exception 'This property is not currently available';
  end if;

  if listing.owner_id = new.renter_id then
    raise exception 'Owners cannot start a renter conversation with their own listing';
  end if;

  select profile.display_name into renter_name
  from public.profiles profile
  where profile.id = new.renter_id;

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
  select * into conversation
  from public.conversations
  where id = new.conversation_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if actor is null or new.sender_id <> actor then
    raise exception 'Sender mismatch';
  end if;

  if new.sender_id <> conversation.renter_id and new.sender_id <> conversation.owner_id then
    raise exception 'Not a participant';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nearbasha:message-send:' || actor::text, 0)
  );

  select count(*) into recent_minute_count
  from public.messages message
  where message.sender_id = actor
    and message.created_at >= now() - interval '1 minute';

  if recent_minute_count >= 30 then
    raise exception 'Message rate limit reached. Please wait a moment before sending more messages';
  end if;

  select count(*) into recent_hour_count
  from public.messages message
  where message.sender_id = actor
    and message.created_at >= now() - interval '1 hour';

  if recent_hour_count >= 300 then
    raise exception 'Hourly message limit reached. Please try again later';
  end if;

  new.body := btrim(new.body);
  new.created_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_message() from public;
revoke all on function private.prepare_message() from anon, authenticated;

-- Production already carries this transaction lock from the September 4
-- hardening migration. Re-state the full function here so fresh databases and
-- repository replay preserve the same protection instead of depending on
-- production-only migration drift.
create or replace function public.reveal_property_owner_phone(property_uuid uuid)
returns table(phone text, owner_phone_verified_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  viewer_verified_at timestamptz;
  listing record;
  owner_phone text;
  recent_reveals integer;
begin
  if viewer is null then
    raise exception 'Sign in required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(viewer::text, 0)
  );

  select profile.phone_verified_at
  into viewer_verified_at
  from public.profiles profile
  where profile.id = viewer;

  if viewer_verified_at is null then
    raise exception 'Phone verification required';
  end if;

  select property.owner_id, owner.phone_verified_at
  into listing
  from public.properties property
  join public.profiles owner on owner.id = property.owner_id
  where property.id = property_uuid
    and property.status = 'available'::public.listing_status
    and property.published_at is not null
    and (property.expires_at is null or property.expires_at > now());

  if not found then
    raise exception 'Property is not currently available';
  end if;

  if listing.owner_id = viewer then
    raise exception 'Owners cannot reveal their own contact through this endpoint';
  end if;

  if listing.phone_verified_at is null then
    raise exception 'Owner phone is not verified';
  end if;

  select count(*)::integer
  into recent_reveals
  from private.phone_reveal_events event
  where event.viewer_id = viewer
    and event.revealed_at > now() - interval '1 hour';

  if recent_reveals >= 20 then
    raise exception 'Phone reveal rate limit reached';
  end if;

  select auth_user.phone
  into owner_phone
  from auth.users auth_user
  where auth_user.id = listing.owner_id;

  if owner_phone is null or btrim(owner_phone) = '' then
    raise exception 'Owner phone is unavailable';
  end if;

  insert into private.phone_reveal_events (viewer_id, property_id, owner_id)
  values (viewer, property_uuid, listing.owner_id);

  return query select owner_phone, listing.phone_verified_at;
end;
$$;

revoke all on function public.reveal_property_owner_phone(uuid) from public;
revoke all on function public.reveal_property_owner_phone(uuid) from anon, authenticated;
grant execute on function public.reveal_property_owner_phone(uuid) to authenticated;
