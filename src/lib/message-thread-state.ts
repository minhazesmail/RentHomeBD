export type ThreadMessageLike = {
  id: string;
  sender_id: string;
  created_at: string;
};

type ScrollViewport = {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
};

function timestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function compareThreadMessages(a: ThreadMessageLike, b: ThreadMessageLike) {
  const timeDifference = timestamp(a.created_at) - timestamp(b.created_at);
  return timeDifference || a.id.localeCompare(b.id);
}

export function mergeThreadMessages<T extends ThreadMessageLike>(current: T[], incoming: T[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return Array.from(byId.values()).sort(compareThreadMessages);
}

export function latestIncomingMessageAt(messages: ThreadMessageLike[], userId: string) {
  let latest: ThreadMessageLike | null = null;
  for (const message of messages) {
    if (message.sender_id === userId) continue;
    if (!latest || compareThreadMessages(latest, message) < 0) latest = message;
  }
  return latest?.created_at ?? null;
}

export function shouldAdvanceReadAt(current: string | null, target: string | null) {
  if (!target) return false;
  const targetTime = timestamp(target);
  if (!Number.isFinite(targetTime)) return false;
  if (!current) return true;
  return targetTime > timestamp(current);
}

export function isThreadBottomVisible(viewport: ScrollViewport, tolerancePx = 2) {
  return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= tolerancePx;
}

export function threadCanAdvanceRead(
  visibilityState: DocumentVisibilityState,
  hasFocus: boolean,
  bottomVisible: boolean,
) {
  return visibilityState === "visible" && hasFocus && bottomVisible;
}
