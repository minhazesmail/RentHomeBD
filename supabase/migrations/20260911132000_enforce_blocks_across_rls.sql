-- F20 follow-up: the trigger functions must see a block regardless of which
-- participant created it. RLS intentionally lets a user read only their own
-- block list, so run these trigger-only validators as the function owner while
-- preserving explicit auth.uid(), participant and listing checks in the bodies.

alter function private.prepare_conversation() security definer;
alter function private.prepare_message() security definer;

revoke all on function private.prepare_conversation() from public, anon, authenticated;
revoke all on function private.prepare_message() from public, anon, authenticated;
