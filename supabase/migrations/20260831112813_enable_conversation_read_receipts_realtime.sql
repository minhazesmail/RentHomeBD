-- Keep read receipts live and index phone-reveal audit foreign keys.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end
$$;

create index if not exists phone_reveal_events_property_idx
on private.phone_reveal_events (property_id);

create index if not exists phone_reveal_events_owner_idx
on private.phone_reveal_events (owner_id);
