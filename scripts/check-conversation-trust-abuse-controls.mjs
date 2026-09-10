import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath = new URL("../supabase/migrations/20260911050000_conversation_trust_and_atomic_abuse_limits.sql", import.meta.url);
const threadRoutePath = new URL("../src/app/messages/[id]/page.tsx", import.meta.url);
const concurrencyTestPath = new URL("../supabase/tests/f17_atomic_abuse_limits.sh", import.meta.url);

const [migrationSource, routeSource, concurrencySource] = await Promise.all([
  readFile(migrationPath, "utf8"),
  readFile(threadRoutePath, "utf8"),
  readFile(concurrencyTestPath, "utf8"),
]);

function requireSource(source, pattern, message) {
  assert.match(source, pattern, message);
}

function forbidSource(source, pattern, message) {
  assert.doesNotMatch(source, pattern, message);
}

requireSource(
  routeSource,
  /\.rpc\(["']get_conversation_participant_trust["'],\s*\{\s*conversation_uuid:\s*conversation\.id\s*\}\)/,
  "message thread must use the conversation-scoped trust RPC",
);
forbidSource(
  routeSource,
  /\.from\(["']profiles["']\)[\s\S]{0,120}\.select\(["']phone_verified_at["']\)/,
  "message thread must not query another participant profile directly",
);

requireSource(
  migrationSource,
  /create or replace function public\.get_conversation_participant_trust\(conversation_uuid uuid\)/i,
  "scoped participant trust RPC must exist",
);
requireSource(
  migrationSource,
  /get_conversation_participant_trust[\s\S]{0,500}security definer[\s\S]{0,120}set search_path = ''/i,
  "trust RPC must use a fixed-search-path security definer",
);
requireSource(
  migrationSource,
  /conversation\.renter_id = \(select auth\.uid\(\)\)[\s\S]{0,180}conversation\.owner_id = \(select auth\.uid\(\)\)/,
  "trust RPC must authorize only conversation participants",
);
requireSource(
  migrationSource,
  /returns table \(phone_verified boolean\)/i,
  "trust RPC must expose only the boolean verification fact",
);
requireSource(
  migrationSource,
  /revoke all on function public\.get_conversation_participant_trust\(uuid\) from anon, authenticated;/i,
  "trust RPC must clear inherited API execution privileges",
);
requireSource(
  migrationSource,
  /grant execute on function public\.get_conversation_participant_trust\(uuid\) to authenticated;/i,
  "trust RPC must be authenticated-only",
);

const advisoryLockCalls = migrationSource.match(/pg_advisory_xact_lock\s*\(/g) ?? [];
assert.equal(advisoryLockCalls.length, 3, "all three count-before-write abuse gates must be transaction-serialized");
requireSource(
  migrationSource,
  /nearbasha:conversation-start:/,
  "conversation-start quota needs a dedicated per-user advisory-lock namespace",
);
requireSource(
  migrationSource,
  /nearbasha:message-send:/,
  "message quota needs a dedicated per-user advisory-lock namespace",
);
requireSource(
  migrationSource,
  /hashtextextended\(viewer::text,\s*0\)/,
  "phone reveal must retain the deployed per-viewer advisory lock",
);
requireSource(
  migrationSource,
  /if actor is null or new\.sender_id <> actor then/,
  "message trigger must reject an absent authenticated actor explicitly",
);
requireSource(migrationSource, /recent_conversation_count\s*>=\s*20/, "conversation-start limit must remain 20/hour");
requireSource(migrationSource, /recent_minute_count\s*>=\s*30/, "message minute limit must remain 30/minute");
requireSource(migrationSource, /recent_hour_count\s*>=\s*300/, "message hour limit must remain 300/hour");
requireSource(migrationSource, /recent_reveals\s*>=\s*20/, "phone reveal limit must remain 20/hour");

for (const label of ["message", "conversation", "phone-reveal"]) {
  requireSource(
    concurrencySource,
    new RegExp(`expect_second_request_limited[\\s\\S]{0,220}["']${label}["']`),
    `${label} must have an overlapping-transaction boundary regression`,
  );
}
requireSource(
  concurrencySource,
  /sleep 0\.4/,
  "second quota request must overlap the first transaction rather than run sequentially",
);
requireSource(
  concurrencySource,
  /pg_sleep\(\$\{sleep_seconds\}\)/,
  "first request must keep the advisory transaction lock open during the overlap window",
);

console.log("Conversation trust and atomic abuse-control QA passed.");
