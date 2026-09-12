export type MessageNavigationState = {
  page?: number;
  query?: string;
  unreadOnly?: boolean;
};

export function normalizeMessagePage(value: string | string[] | null | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(candidate || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function messageInboxHref({ page = 1, query = "", unreadOnly = false }: MessageNavigationState = {}) {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();
  if (normalizedQuery) params.set("q", normalizedQuery);
  if (unreadOnly) params.set("filter", "unread");
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/messages?${search}` : "/messages";
}

export function messageConversationHref({
  id,
  page = 1,
  query = "",
  unreadOnly = false,
}: MessageNavigationState & { id: string }) {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();
  if (normalizedQuery) params.set("q", normalizedQuery);
  if (unreadOnly) params.set("filter", "unread");
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/messages/${id}?${search}` : `/messages/${id}`;
}
