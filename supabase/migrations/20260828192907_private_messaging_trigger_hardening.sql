create or replace function private.guard_conversation_read_state()
returns trigger
language plpgsql
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if pg_trigger_depth() > 1 then return new; end if;
  if uid = old.renter_id then
    if new.owner_last_read_at is distinct from old.owner_last_read_at then raise exception 'Cannot update the other participant read state'; end if;
  elsif uid = old.owner_id then
    if new.renter_last_read_at is distinct from old.renter_last_read_at then raise exception 'Cannot update the other participant read state'; end if;
  else
    raise exception 'Not a conversation participant';
  end if;
  new.id := old.id; new.property_id := old.property_id; new.renter_id := old.renter_id; new.owner_id := old.owner_id;
  new.renter_display_name := old.renter_display_name; new.owner_display_name := old.owner_display_name; new.property_title := old.property_title;
  new.created_at := old.created_at; new.last_message_at := old.last_message_at; return new;
end; $$;
revoke all on function private.guard_conversation_read_state() from public;

create or replace function private.bump_conversation_after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sender_id <> (select auth.uid()) then raise exception 'Sender mismatch'; end if;
  update public.conversations
  set last_message_at = new.created_at,
      renter_last_read_at = case when renter_id = new.sender_id then new.created_at else renter_last_read_at end,
      owner_last_read_at = case when owner_id = new.sender_id then new.created_at else owner_last_read_at end
  where id = new.conversation_id and (renter_id = new.sender_id or owner_id = new.sender_id);
  return null;
end; $$;
revoke all on function private.bump_conversation_after_message() from public;
