#!/usr/bin/env bash
set -euo pipefail

: "${DB_CONTAINER:?DB_CONTAINER must identify the local Supabase Postgres container}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

OWNER_ID="e1111111-1111-4111-8111-111111111111"
OTHER_ID="e2222222-2222-4222-8222-222222222222"
PROPERTY_A="eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
PROPERTY_B="ebbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1"

psql_stdin() {
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres
}

psql_scalar() {
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -Atqc "$1"
}

cat <<SQL | psql_stdin
insert into auth.users (id, raw_user_meta_data)
values
  ('${OWNER_ID}', '{"role":"owner","display_name":"Account Quota QA"}'::jsonb),
  ('${OTHER_ID}', '{"role":"owner","display_name":"Other Account Quota QA"}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '${OWNER_ID}', false);
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"${OWNER_ID}"}',
  false
);

-- Leave one slot below each launch ceiling so two overlapping requests compete
-- for the same final slot.
select public.ensure_property_draft(gen_random_uuid())
from generate_series(1, 24);

insert into public.saved_searches (
  user_id, name, center_lat, center_long, radius_km
)
select
  '${OWNER_ID}',
  'Quota search ' || series,
  23.8103,
  90.4125,
  15
from generate_series(1, 49) series;

reset role;
SQL

run_property_request() {
  local property_id="$1"
  local sleep_seconds="$2"
  cat <<SQL | psql_stdin
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '${OWNER_ID}', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"${OWNER_ID}"}', true);
select public.ensure_property_draft('${property_id}');
select pg_sleep(${sleep_seconds});
commit;
SQL
}

run_saved_search_request() {
  local name="$1"
  local sleep_seconds="$2"
  cat <<SQL | psql_stdin
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '${OWNER_ID}', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"${OWNER_ID}"}', true);
insert into public.saved_searches (
  user_id, name, center_lat, center_long, radius_km
) values (
  '${OWNER_ID}', '${name}', 23.8103, 90.4125, 15
);
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

# At 24 unfinished properties, exactly one overlapping creation may become the
# 25th. The second must wait for the same-account advisory lock, re-count after
# commit, and fail.
expect_second_request_limited \
  "property-draft" \
  "Property draft limit reached" \
  "run_property_request ${PROPERTY_A} 2" \
  "run_property_request ${PROPERTY_B} 0"

property_count="$(psql_scalar "select count(*) from public.properties where owner_id = '${OWNER_ID}' and status in ('draft','rejected','pending_review');")"
if [ "$property_count" != "25" ]; then
  echo "Expected exactly 25 unfinished properties after the concurrent boundary test, got ${property_count}." >&2
  exit 1
fi

# Retrying an already-created draft is idempotent and must not consume another
# account slot or fail merely because the account is at its ceiling.
cat <<SQL | psql_stdin
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '${OWNER_ID}', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"${OWNER_ID}"}', true);
select public.ensure_property_draft('${PROPERTY_A}');
commit;
SQL

property_count="$(psql_scalar "select count(*) from public.properties where owner_id = '${OWNER_ID}' and status in ('draft','rejected','pending_review');")"
if [ "$property_count" != "25" ]; then
  echo "Idempotent draft retry changed the unfinished-property count to ${property_count}." >&2
  exit 1
fi

# At 49 saved searches, one overlapping request may become the 50th. The
# parallel insert must wait and then be rejected.
expect_second_request_limited \
  "saved-search" \
  "Saved search limit reached" \
  "run_saved_search_request 'Concurrent quota search A' 2" \
  "run_saved_search_request 'Concurrent quota search B' 0"

saved_search_count="$(psql_scalar "select count(*) from public.saved_searches where user_id = '${OWNER_ID}';")"
if [ "$saved_search_count" != "50" ]; then
  echo "Expected exactly 50 saved searches after the concurrent boundary test, got ${saved_search_count}." >&2
  exit 1
fi

# Locks are account-scoped, not global: another account can create its own draft
# and saved search while the first account is already at both ceilings.
cat <<SQL | psql_stdin
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '${OTHER_ID}', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"${OTHER_ID}"}', true);
select public.ensure_property_draft(gen_random_uuid());
insert into public.saved_searches (
  user_id, name, center_lat, center_long, radius_km
) values (
  '${OTHER_ID}', 'Independent account search', 23.7937, 90.4066, 10
);
commit;
SQL

other_property_count="$(psql_scalar "select count(*) from public.properties where owner_id = '${OTHER_ID}' and status in ('draft','rejected','pending_review');")"
other_saved_search_count="$(psql_scalar "select count(*) from public.saved_searches where user_id = '${OTHER_ID}';")"
if [ "$other_property_count" != "1" ] || [ "$other_saved_search_count" != "1" ]; then
  echo "Account-scoped quotas unexpectedly blocked an independent account." >&2
  exit 1
fi

echo "F18 account creation quota concurrency QA passed."
