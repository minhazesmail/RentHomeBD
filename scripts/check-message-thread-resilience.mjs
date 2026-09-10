import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const helperPath = new URL("../src/lib/message-thread-state.ts", import.meta.url);
const threadPath = new URL("../src/components/realtime-message-thread.tsx", import.meta.url);
const routePath = new URL("../src/app/messages/[id]/page.tsx", import.meta.url);

const [helperSource, threadSource, routeSource] = await Promise.all([
  readFile(helperPath, "utf8"),
  readFile(threadPath, "utf8"),
  readFile(routePath, "utf8"),
]);

const transpiled = ts.transpileModule(helperSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "message-thread-state.ts",
}).outputText;

const helperModule = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);
const {
  isThreadBottomVisible,
  latestIncomingMessageAt,
  mergeThreadMessages,
  shouldAdvanceReadAt,
  threadCanAdvanceRead,
} = helperModule;

const viewerId = "viewer";
const otherId = "other";
const baseMessages = [
  { id: "b", sender_id: viewerId, created_at: "2026-09-11T00:00:02.000Z" },
  { id: "a", sender_id: otherId, created_at: "2026-09-11T00:00:01.000Z" },
];
const merged = mergeThreadMessages(baseMessages, [
  { id: "b", sender_id: viewerId, created_at: "2026-09-11T00:00:02.000Z" },
  { id: "c", sender_id: otherId, created_at: "2026-09-11T00:00:02.000Z" },
  { id: "d", sender_id: otherId, created_at: "2026-09-11T00:00:03.000Z" },
]);
assert.deepEqual(merged.map((message) => message.id), ["a", "b", "c", "d"], "catch-up merge must sort and dedupe by ID");
assert.equal(latestIncomingMessageAt(merged, viewerId), "2026-09-11T00:00:03.000Z", "read target must ignore viewer-sent messages");
assert.equal(shouldAdvanceReadAt(null, "2026-09-11T00:00:03.000Z"), true);
assert.equal(shouldAdvanceReadAt("2026-09-11T00:00:03.000Z", "2026-09-11T00:00:03.000Z"), false);
assert.equal(shouldAdvanceReadAt("2026-09-11T00:00:04.000Z", "2026-09-11T00:00:03.000Z"), false, "read state must never move backward");
assert.equal(isThreadBottomVisible({ scrollHeight: 1000, scrollTop: 400, clientHeight: 500 }), false, "offscreen bottom must be detected synchronously");
assert.equal(isThreadBottomVisible({ scrollHeight: 1000, scrollTop: 499, clientHeight: 500 }), true, "small browser rounding at the bottom should be tolerated");
assert.equal(threadCanAdvanceRead("hidden", true, true), false, "hidden tabs cannot mark a thread read");
assert.equal(threadCanAdvanceRead("visible", false, true), false, "unfocused windows cannot mark a thread read");
assert.equal(threadCanAdvanceRead("visible", true, false), false, "messages below the viewport cannot be marked read");
assert.equal(threadCanAdvanceRead("visible", true, true), true, "only a visible focused thread at the bottom may advance read state");

function requireSource(source, pattern, message) {
  assert.match(source, pattern, message);
}

function forbidSource(source, pattern, message) {
  assert.doesNotMatch(source, pattern, message);
}

requireSource(threadSource, /status\s*===\s*["']SUBSCRIBED["'][\s\S]{0,240}catchUpMessages\(\)/, "SUBSCRIBED must trigger database catch-up");
requireSource(threadSource, /\.gte\(["']created_at["'],\s*latestMessage\.created_at\)/, "catch-up must inclusively resume from the latest known timestamp");
requireSource(threadSource, /\.order\(["']created_at["'],\s*\{\s*ascending:\s*true\s*\}\)[\s\S]{0,120}\.order\(["']id["'],\s*\{\s*ascending:\s*true\s*\}\)/, "catch-up needs deterministic created_at/id ordering");
requireSource(threadSource, /\.range\(offset,\s*offset\s*\+\s*CATCH_UP_PAGE_SIZE\s*-\s*1\)/, "catch-up must paginate rather than silently truncate gaps");
requireSource(threadSource, /mergeMessages\(current,\s*batch\)/, "catch-up results must be ID-deduped into local state");
requireSource(threadSource, /document\.visibilityState/, "read receipts must consider document visibility");
requireSource(threadSource, /document\.hasFocus\(\)/, "read receipts must consider window focus");
requireSource(threadSource, /new IntersectionObserver/, "read receipts must require actual thread-bottom visibility");
requireSource(threadSource, /useLayoutEffect\(\(\)\s*=>\s*\{[\s\S]{0,600}isThreadBottomVisible\(node\)/, "message renders must synchronously re-measure whether the bottom is still visible");
requireSource(threadSource, /latestIncomingMessageAt\(messages,\s*userId\)/, "read state must advance only through incoming messages actually present in the thread");
requireSource(threadSource, /threadCanAdvanceRead\(documentVisibility,\s*windowFocused,\s*bottomVisible\)/, "visibility, focus and viewport state must gate read writes");
requireSource(threadSource, /if\s*\(next\.sender_id\s*!==\s*userId\s*&&\s*bottomVisibleRef\.current\)\s*followIncomingRef\.current\s*=\s*true;/, "incoming auto-follow must only be armed when the viewer was already at the bottom");
requireSource(threadSource, /if\s*\(!lastMessageMine\s*&&\s*!followIncomingRef\.current\)\s*return;/, "offscreen incoming messages must not force the thread to the bottom");
forbidSource(threadSource, /if\s*\(next\.sender_id\s*!==\s*userId\)[\s\S]{0,260}\.update\(\{\s*\[readField\]:\s*next\.created_at\s*\}\)/, "Realtime INSERT handlers must not mark messages read automatically");

forbidSource(routeSource, /\.update\(\{\s*\[readField\]:\s*new Date\(\)\.toISOString\(\)\s*\}\)/, "server rendering must not mutate read state");
requireSource(routeSource, /initialReadAt=\{viewerReadAt\}/, "server-provided existing viewer read state must seed the client thread");
requireSource(routeSource, /const viewerReadAt\s*=\s*viewerIsRenter\s*\?\s*conversation\.renter_last_read_at\s*:\s*conversation\.owner_last_read_at/, "viewer read timestamp must come from the correct participant field");

console.log("Message realtime catch-up and visibility-aware read-receipt QA passed.");
