-- Supabase's default function privileges grant EXECUTE directly to API roles.
-- Keep public read RPCs public while removing anonymous access to account and
-- mutation functions that require an authenticated identity.

revoke execute on function public.get_my_property_moderation_notes(uuid[]) from anon;
revoke execute on function public.replace_property_listing_relations(uuid, public.tenant_type[], text[]) from anon;
revoke execute on function public.reveal_property_owner_phone(uuid) from anon;
revoke execute on function public.count_saved_search_matches(
  double precision, double precision, double precision, integer, integer,
  public.tenant_type, smallint, timestamptz
) from anon;

grant execute on function public.get_my_property_moderation_notes(uuid[]) to authenticated;
grant execute on function public.replace_property_listing_relations(uuid, public.tenant_type[], text[]) to authenticated;
grant execute on function public.reveal_property_owner_phone(uuid) to authenticated;
grant execute on function public.count_saved_search_matches(
  double precision, double precision, double precision, integer, integer,
  public.tenant_type, smallint, timestamptz
) to authenticated;
