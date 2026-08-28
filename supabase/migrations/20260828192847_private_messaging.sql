create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  renter_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  renter_display_name text,
  owner_display_name text,
  property_title text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  renter_last_read_at timestamptz,
  owner_last_read_at timestamptz,
  unique (property_id, renter_id),
  check (renter_id <> owner_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  check (char_length(btrim(body)) between 1 and 4000)
);

create index conversations_renter_last_message_idx on public.conversations (renter_id, last_message_at desc nulls last);
create index conversations_owner_last_message_idx on public.conversations (owner_id, last_message_at desc nulls last);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;
grant select, insert on public.conversations to authenticated;
grant update (renter_last_read_at, owner_last_read_at) on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

create policy "participants can read conversations" on public.conversations for select to authenticated using ((select auth.uid()) = renter_id or (select auth.uid()) = owner_id);
create policy "renters can start conversations" on public.conversations for insert to authenticated with check ((select auth.uid()) = renter_id);
create policy "participants can update read state" on public.conversations for update to authenticated using ((select auth.uid()) = renter_id or (select auth.uid()) = owner_id) with check ((select auth.uid()) = renter_id or (select auth.uid()) = owner_id);
create policy "participants can read messages" on public.messages for select to authenticated using (exists (select 1 from public.conversations c where c.id = messages.conversation_id and ((select auth.uid()) = c.renter_id or (select auth.uid()) = c.owner_id)));
create policy "participants can send messages" on public.messages for insert to authenticated with check (sender_id = (select auth.uid()) and exists (select 1 from public.conversations c where c.id = messages.conversation_id and ((select auth.uid()) = c.renter_id or (select auth.uid()) = c.owner_id)));

create or replace function private.prepare_conversation() returns trigger language plpgsql set search_path = '' as $$
declare listing record; renter_name text;
begin
  if (select auth.uid()) is null or new.renter_id <> (select auth.uid()) then raise exception 'Only the renter can start this conversation'; end if;
  select p.owner_id, p.title, p.public_owner_display_name into listing from public.properties p where p.id = new.property_id and p.status = 'available'::public.listing_status and p.published_at is not null and (p.expires_at is null or p.expires_at > now());
  if not found then raise exception 'This property is not currently available'; end if;
  if listing.owner_id = new.renter_id then raise exception 'Owners cannot start a renter conversation with their own listing'; end if;
  select display_name into renter_name from public.profiles where id = new.renter_id;
  new.owner_id := listing.owner_id; new.renter_display_name := renter_name; new.owner_display_name := listing.public_owner_display_name; new.property_title := listing.title; new.renter_last_read_at := coalesce(new.renter_last_read_at, now()); return new;
end; $$;
revoke all on function private.prepare_conversation() from public;
create trigger conversations_prepare before insert on public.conversations for each row execute function private.prepare_conversation();

create or replace function private.guard_conversation_read_state() returns trigger language plpgsql set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid = old.renter_id then if new.owner_last_read_at is distinct from old.owner_last_read_at then raise exception 'Cannot update the other participant read state'; end if;
  elsif uid = old.owner_id then if new.renter_last_read_at is distinct from old.renter_last_read_at then raise exception 'Cannot update the other participant read state'; end if;
  else raise exception 'Not a conversation participant'; end if;
  new.id := old.id; new.property_id := old.property_id; new.renter_id := old.renter_id; new.owner_id := old.owner_id; new.renter_display_name := old.renter_display_name; new.owner_display_name := old.owner_display_name; new.property_title := old.property_title; new.created_at := old.created_at; new.last_message_at := old.last_message_at; return new;
end; $$;
revoke all on function private.guard_conversation_read_state() from public;
create trigger conversations_guard_read_state before update on public.conversations for each row execute function private.guard_conversation_read_state();

create or replace function private.prepare_message() returns trigger language plpgsql set search_path = '' as $$
declare conv public.conversations%rowtype;
begin
  select * into conv from public.conversations where id = new.conversation_id; if not found then raise exception 'Conversation not found'; end if;
  if new.sender_id <> (select auth.uid()) then raise exception 'Sender mismatch'; end if;
  if new.sender_id <> conv.renter_id and new.sender_id <> conv.owner_id then raise exception 'Not a participant'; end if;
  new.body := btrim(new.body); return new;
end; $$;
revoke all on function private.prepare_message() from public;
create trigger messages_prepare before insert on public.messages for each row execute function private.prepare_message();

create or replace function private.bump_conversation_after_message() returns trigger language plpgsql set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at, renter_last_read_at = case when renter_id = new.sender_id then new.created_at else renter_last_read_at end, owner_last_read_at = case when owner_id = new.sender_id then new.created_at else owner_last_read_at end where id = new.conversation_id; return null;
end; $$;
revoke all on function private.bump_conversation_after_message() from public;
create trigger messages_bump_conversation after insert on public.messages for each row execute function private.bump_conversation_after_message();
