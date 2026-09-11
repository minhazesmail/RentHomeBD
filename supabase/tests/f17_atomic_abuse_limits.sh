#!/usr/bin/env bash
set -euo pipefail

: "${DB_CONTAINER:?DB_CONTAINER must identify the local Supabase Postgres container}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

psql_stdin() {
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres
}

psql_scalar() {
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -Atqc "$1"
}

cat <<'SQL' | psql_stdin
insert into auth.users (id, raw_user_meta_data)
values
  ('d1111111-1111-4111-8111-111111111111', '{"role":"renter","display_name":"Message Quota QA"}'::jsonb),
  ('d2222222-2222-4222-8222-222222222222', '{"role":"renter","display_name":"Conversation Quota QA"}'::jsonb),
  ('d3333333-3333-4333-8333-333333333333', '{"role":"renter","display_name":"Reveal Quota QA"}'::jsonb),
  ('d4444444-4444-4444-8444-444444444444', '{"role":"owner","display_name":"Quota QA Owner"}'::jsonb);

-- Phone verification is server-owned state. Updating auth.users exercises the
-- existing synchronization trigger used in production.
update auth.users
set phone = case id
      when 'd3333333-3333-4333-8333-333333333333' then '+8801710000001'
      when 'd4444444-4444-4444-8444-444444444444' then '+8801710000002'
      else phone
    end,
    phone_confirmed_at = case
      when id in (
        'd3333333-3333-4333-8333-333333333333',
        'd4444444-4444-4444-8444-444444444444'
      ) then now() - interval '1 day'
      else phone_confirmed_at
    end
where id in (
  'd3333333-3333-4333-8333-333333333333',
  'd4444444-4444-4444-8444-444444444444'
);

-- Build quota-boundary fixtures without consuming the very triggers under
-- test. Normal trigger/RLS behavior is restored before concurrent requests.
set session_replication_role = replica;

insert into public.properties (
  id, owner_id, title, address_text, property_type, rent_bdt, deposit_bdt,
  available_from, latitude, longitude, status, published_at, expires_at,
  public_owner_display_name, public_owner_role, public_owner_phone_verified_at
)
values
  (
    'deeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    'd4444444-4444-4444-8444-444444444444',
    'Message quota QA home', 'Dhanmondi, Dhaka', 'apartment', 22000, 22000,
    current_date, 23.7465, 90.3760, 'available', now() - interval '1 day',
    now() + interval '13 days', 'Quota QA Owner', 'owner', now() - interval '1 day'
  ),
  (
    'dfffffff-ffff-4fff-8fff-fffffffffff1',
    'd4444444-4444-4444-8444-444444444444',
    'Reveal quota QA home', 'Banani, Dhaka', 'apartment', 30000, 30000,
    current_date, 23.7937, 90.4066, 'available', now() - interval '1 day',
    now() + interval '13 days', 'Quota QA Owner', 'owner', now() - interval '1 day'
  ),
  (
    'daaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'd4444444-4444-4444-8444-444444444444',
    'Conversation quota target A', 'Mirpur, Dhaka', 'apartment', 18000, 18000,
    current_date, 23.8223, 90.3654, 'available', now() - interval '1 day',
    now() + interval '13 days', 'Quota QA Owner', 'owner', now() - interval '1 day'
  ),
  (
    'dbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'd4444444-4444-4444-8444-444444444444',
    'Conversation quota target B', 'Uttara, Dhaka', 'apartment', 20000, 20000,
    current_date, 23.8759, 90.3795, 'available', now() - interval '1 day',
    now() + interval '13 days', 'Quota QA Owner', 'owner', now() - interval '1 day'
  );

insert into public.conversations (
  id, property_id, renter_id, owner_id, renter_display_name, owner_display_name,
  property_title, created_at
)
values (
  'dccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  'deeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  'd1111111-1111-4111-8111-111111111111',
  'd4444444-4444-4444-8444-444444444444',
  'Message Quota QA', 'Quota QA Owner', 'Message quota QA home', now()
);

insert into public.messages (conversation_id, sender_id, body, created_at)
select
  'dccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  'd1111111-1111-4111-8111-111111111111',
  'Seed message ' || series,
  now() - interval '10 seconds'
from generate_series(1, 29) series;

with seeded_properties as (
  insert into public.properties (
    id, owner_id, title, address_text, property_type, rent_bdt, deposit_bdt,
    available_from, latitude, longitude, status, published_at, expires_at,
    public_owner_display_name, public_owner_role, public_owner_phone_verified_at
  )
  select
    gen_random_uuid(),
    'd4444444-4444-4444-8444-444444444444',
    'Conversation quota seed ' || series,
    'Dhaka',
    'apartment'::public.property_type,
    15000 + series,
    15000,
    current_date,
    23.8103,
    90.4125,
    'available'::public.listing_status,
    now() - interval '1 day',
    now() + interval '13 days',
    'Quota QA Owner',
    'owner'::public.profile_role,
    now() - interval '1 day'
  from generate_series(1, 19) series
  returning id, title
)
insert into public.conversations (
  property_id, renter_id, owner_id, renter_display_name, owner_display_name,
  property_title, created_at
)
select
  id,
  'd2222222-2222-4222-8222-222222222222',
  'd4444444-4444-4444-8444-444444444444',
  'Conversation Quota QA',
  'Quota QA Owner',
  title,
  now() - interval '10 seconds'
from seeded_properties;

insert into private.phone_reveal_events (viewer_id, property_id, owner_id, revealed_at)
select
  'd3333333-3333-4333-8333-333333333333',
  'dfffffff-ffff-4fff-8fff-fffffffffff1',
  'd4444444-4444-4444-8444-444444444444',
  now() - interval '10 seconds'
from generate_series(1, 19);

set session_replication_role = origin;
SQL

run_message_request() {
  local sleep_seconds="$1"
  cat <<SQL | psql_stdin
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'd1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"d1111111-1111-4111-8111-111111111111"}', true);
insert into public.messages (conversation_id, sender_id, body)
values (
  'dccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  'd1111111-1111-4111-8111-111111111111',
  'Concurrent boundary message'
);
select pg_sleep(${sleep_seconds});
commit;
SQL
}

run_conversation_request() {
  local property_id="$1"
  local sleep_seconds="$2"
  cat <<SQL | psql_stdin
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'd2222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"d2222222-2222-4222-8222-222222222222"}', true);
insert into public.conversations (property_id, renter_id)
values (
  '${property_id}',
  'd2222222-2222-4222-8222-222222222222'
);
select pg_sleep(${sleep_seconds});
commit;
SQL
}

run_reveal_request() {
  local sleep_seconds="$1"
  cat <<SQL | psql_stdin
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'd3333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"d3333333-3333-4333-8333-333333333333"}', true);
select * from public.reveal_property_owner_phone('dfffffff-ffff-4fff-8fff-fffffffffff1');
select pg_sleep(${sleep_seconds});
commit;
SQL
}

expect_second_request_limited() {
  local label="$1"
  local expected_error="$2"
  local first_function="$3"
  local second_function="$4"
  local first_log="$TMP_DIR/${label}-first.log"
  local second_log="$TMP_DIR/${label}-second.log"

  ( eval "$first_function" ) >"$first_log" 2>&1 &
  local first_pid=$!
  sleep 0.4

  set +e
  eval "$second_function" >"$second_log" 2>&1
  local second_status=$?
  set -e

  if ! wait "$first_pid"; then
    echo "First ${label} request failed unexpectedly:" >&2
    cat "$first_log" >&2
    exit 1
  fi

  if [ "$second_status" -eq 0 ]; then
    echo "Second ${label} request unexpectedly crossed the quota boundary." >&2
    cat "$second_log" >&2
    exit 1
  fi

  if ! grep -Fq "$expected_error" "$second_log"; then
    echo "Second ${label} request failed for the wrong reason:" >&2
    cat "$second_log" >&2
    exit 1
  fi
}

# At 29 recent messages, exactly one parallel request may become the 30th. The
# second waits for the same-user advisory lock, then observes the committed 30th
# row and is rejected.
expect_second_request_limited \
  "message" \
  "Message rate limit reached" \
  "run_message_request 2" \
  "run_message_request 0"

message_count="$(psql_scalar "select count(*) from public.messages where sender_id = 'd1111111-1111-4111-8111-111111111111' and created_at >= now() - interval '1 minute';")"
if [ "$message_count" != "30" ]; then
  echo "Expected exactly 30 recent messages after concurrent boundary test, got ${message_count}." >&2
  exit 1
fi

# At 19 recent conversations, one request may become the 20th; the parallel
# request must wait and then see the committed boundary row.
expect_second_request_limited \
  "conversation" \
  "Conversation start limit reached" \
  "run_conversation_request daaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1 2" \
  "run_conversation_request dbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1 0"

conversation_count="$(psql_scalar "select count(*) from public.conversations where renter_id = 'd2222222-2222-4222-8222-222222222222' and created_at >= now() - interval '1 hour';")"
if [ "$conversation_count" != "20" ]; then
  echo "Expected exactly 20 recent conversations after concurrent boundary test, got ${conversation_count}." >&2
  exit 1
fi

# Production already serializes phone reveals. Reproduce and verify that guard
# in repository migrations: one request becomes the 20th reveal; the parallel
# request must wait and then fail.
expect_second_request_limited \
  "phone-reveal" \
  "Phone reveal rate limit reached" \
  "run_reveal_request 2" \
  "run_reveal_request 0"

reveal_count="$(psql_scalar "select count(*) from private.phone_reveal_events where viewer_id = 'd3333333-3333-4333-8333-333333333333' and revealed_at >= now() - interval '1 hour';")"
if [ "$reveal_count" != "20" ]; then
  echo "Expected exactly 20 recent phone reveals after concurrent boundary test, got ${reveal_count}." >&2
  exit 1
fi

echo "F17 atomic abuse-limit concurrency QA passed."
