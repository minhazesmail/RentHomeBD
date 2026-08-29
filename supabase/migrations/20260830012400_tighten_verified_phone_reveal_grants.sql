revoke execute on function public.reveal_property_owner_phone(uuid) from anon;
revoke execute on function public.reveal_property_owner_phone(uuid) from public;
grant execute on function public.reveal_property_owner_phone(uuid) to authenticated;
