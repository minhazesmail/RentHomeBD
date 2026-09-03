create or replace function public.get_message_inbox(search_text text, unread_only boolean)
returns table (
  id uuid,
  property_id uuid,
  renter_id uuid,
  owner_id uuid,
  renter_display_name text,
  owner_display_name text,
  property_title text,
  created_at timestamptz,
  last_message_at timestamptz,
  last_message_body text,
  unread_count bigint
)
language sql
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.property_id,
    c.renter_id,
    c.owner_id,
    c.renter_display_name,
    c.owner_display_name,
    c.property_title,
    c.created_at,
    c.last_message_at,
    latest.body as last_message_body,
    coalesce(unread.unread_count, 0) as unread_count
  from public.conversations c
  left join lateral (
    select m.body
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) latest on true
  left join lateral (
    select count(*) as unread_count
    from public.messages m
    where m.conversation_id = c.id
      and m.sender_id <> (select auth.uid())
      and m.created_at > coalesce(
        case
          when c.renter_id = (select auth.uid()) then c.renter_last_read_at
          when c.owner_id = (select auth.uid()) then c.owner_last_read_at
          else null
        end,
        '-infinity'::timestamptz
      )
  ) unread on true
  where (c.renter_id = (select auth.uid()) or c.owner_id = (select auth.uid()))
    and (
      nullif(btrim(search_text), '') is null
      or case
        when c.renter_id = (select auth.uid()) then coalesce(c.owner_display_name, '')
        else coalesce(c.renter_display_name, '')
      end ilike '%' || btrim(search_text) || '%'
      or coalesce(c.property_title, '') ilike '%' || btrim(search_text) || '%'
      or coalesce(latest.body, '') ilike '%' || btrim(search_text) || '%'
    )
    and (not unread_only or coalesce(unread.unread_count, 0) > 0)
  order by c.last_message_at desc nulls last, c.created_at desc;
$$;

revoke all on function public.get_message_inbox(text, boolean) from public;
grant execute on function public.get_message_inbox(text, boolean) to authenticated;
