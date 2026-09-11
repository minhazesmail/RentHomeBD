revoke execute on function public.ensure_property_draft(uuid) from anon;
revoke execute on function public.save_property_draft(uuid, jsonb, public.tenant_type[], text[], jsonb) from anon;
revoke execute on function public.submit_property_for_review(uuid) from anon;
revoke execute on function public.begin_property_edit(uuid) from anon;

grant execute on function public.ensure_property_draft(uuid) to authenticated;
grant execute on function public.save_property_draft(uuid, jsonb, public.tenant_type[], text[], jsonb) to authenticated;
grant execute on function public.submit_property_for_review(uuid) to authenticated;
grant execute on function public.begin_property_edit(uuid) to authenticated;
