import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { formatExactMessageTime, formatInboxMessageTime } from "@/lib/message-time";
import { createClient } from "@/lib/supabase/server";

const INBOX_PAGE_SIZE = 20;
const MESSAGE_MEDIA_TTL_SECONDS = 300;

type ConversationSummary = {
  id: string;
  property_id: string;
  renter_id: string;
  owner_id: string;
  renter_display_name: string | null;
  owner_display_name: string | null;
  property_title: string | null;
  created_at: string;
  last_message_at: string | null;
  last_message_body: string | null;
  unread_count: number | string;
};

type Props = {
  userId: string;
  page?: number;
  query?: string;
  unreadOnly?: boolean;
  currentConversationId?: string | null;
};

function inboxHref({ page = 1, query = "", unreadOnly = false }: { page?: number; query?: string; unreadOnly?: boolean }) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (unreadOnly) params.set("filter", "unread");
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/messages?${search}` : "/messages";
}

function conversationHref(id: string, query: string, unreadOnly: boolean) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (unreadOnly) params.set("filter", "unread");
  const search = params.toString();
  return search ? `/messages/${id}?${search}` : `/messages/${id}`;
}

export async function MessagesInboxPane({ userId, page = 1, query = "", unreadOnly = false, currentConversationId = null }: Props) {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const offset = (page - 1) * INBOX_PAGE_SIZE;
  const renderedAt = new Date();

  const { data, error } = await supabase
    .rpc("get_message_inbox", { search_text: query || null, unread_only: unreadOnly })
    .range(offset, offset + INBOX_PAGE_SIZE);
  if (error) throw error;

  const pageRows = (data ?? []) as ConversationSummary[];
  const hasNextPage = pageRows.length > INBOX_PAGE_SIZE;
  const conversations = pageRows.slice(0, INBOX_PAGE_SIZE);
  const hasOrganizationFilters = Boolean(query || unreadOnly);
  const firstPageHref = inboxHref({ query, unreadOnly });

  const propertyIds = Array.from(new Set(conversations.map((conversation) => conversation.property_id)));
  const { data: mediaRows } = propertyIds.length
    ? await supabase
        .from("property_media")
        .select("property_id, storage_path, sort_order")
        .in("property_id", propertyIds)
        .eq("media_type", "photo")
        .order("sort_order", { ascending: true })
    : { data: [] };

  const coverPathByProperty = new Map<string, string>();
  for (const media of mediaRows ?? []) {
    const propertyId = media.property_id as string;
    if (!coverPathByProperty.has(propertyId) && media.storage_path) coverPathByProperty.set(propertyId, media.storage_path as string);
  }

  const coverEntries = await Promise.all(
    Array.from(coverPathByProperty.entries()).map(async ([propertyId, storagePath]) => {
      const { data: signed } = await supabase.storage.from("property-media").createSignedUrl(storagePath, MESSAGE_MEDIA_TTL_SECONDS);
      return [propertyId, signed?.signedUrl ?? null] as const;
    }),
  );
  const coverUrlByProperty = new Map(coverEntries);

  return (
    <aside className="messages-workspace-inbox" aria-label="Conversations">
      <div className="messages-workspace-inbox-head">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1>Messages</h1>
        </div>
        <span className="messages-inbox-page-label">{page > 1 ? `Page ${page}` : "Recent"}</span>
      </div>

      <section className="messages-organization" aria-label="Organize conversations">
        <form className="messages-search-form" action="/messages" method="get">
          <label className="sr-only" htmlFor="message-search">Search conversations</label>
          <input id="message-search" name="q" type="search" defaultValue={query} maxLength={120} placeholder="Search people or homes" />
          {unreadOnly && <input type="hidden" name="filter" value="unread" />}
          <button className="secondary-button" type="submit">Search</button>
          {query && <Link className="text-link" href={inboxHref({ unreadOnly })}>Clear</Link>}
        </form>
        <nav className="messages-filter-tabs" aria-label="Conversation filters">
          <Link className={!unreadOnly ? "messages-filter-active" : ""} href={inboxHref({ query })} aria-current={!unreadOnly ? "page" : undefined}>All</Link>
          <Link className={unreadOnly ? "messages-filter-active" : ""} href={inboxHref({ query, unreadOnly: true })} aria-current={unreadOnly ? "page" : undefined}>Unread</Link>
        </nav>
      </section>

      <div className="messages-workspace-list">
        {!conversations.length ? (
          page > 1 ? (
            <div className="empty-conversations">No conversations on this page. <Link className="text-link" href={firstPageHref}>Return to the first page</Link>.</div>
          ) : hasOrganizationFilters ? (
            <div className="empty-conversations">No conversations match these filters. <Link className="text-link" href="/messages">Show all</Link>.</div>
          ) : (
            <div className="empty-conversations">No conversations yet. Open a property and choose <strong>Message owner</strong> to start one.</div>
          )
        ) : (
          conversations.map((conversation) => {
            const unread = Number(conversation.unread_count);
            const otherName = userId === conversation.renter_id ? conversation.owner_display_name : conversation.renter_display_name;
            const timestamp = conversation.last_message_at || conversation.created_at;
            const propertyTitle = conversation.property_title || "Rental property";
            const coverUrl = coverUrlByProperty.get(conversation.property_id);
            const active = conversation.id === currentConversationId;
            return (
              <Link
                className={`conversation-card messages-workspace-conversation${active ? " is-active" : ""}`}
                href={conversationHref(conversation.id, query, unreadOnly)}
                key={conversation.id}
                aria-current={active ? "page" : undefined}
              >
                <span className="conversation-property-media" aria-hidden="true">
                  {coverUrl ? <img src={coverUrl} alt="" loading="lazy" /> : <span>Home</span>}
                </span>
                <div className="conversation-main">
                  <strong>{otherName || "NearBasha user"}</strong>
                  <span>{propertyTitle}</span>
                  <small>{conversation.last_message_body || "Conversation started — send the first message."}</small>
                </div>
                <div className="conversation-meta">
                  {unread > 0 && <span className="unread-badge">{unread}</span>}
                  <time dateTime={timestamp} title={formatExactMessageTime(timestamp)}>{formatInboxMessageTime(timestamp, renderedAt)}</time>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {(page > 1 || hasNextPage) && (
        <nav className="messages-pagination messages-workspace-pagination" aria-label="Messages pages">
          {page > 1 ? <Link className="secondary-button link-button" href={inboxHref({ page: page - 1, query, unreadOnly })}>Newer</Link> : <span />}
          <span className="messages-page-number">Page {page}</span>
          {hasNextPage ? <Link className="secondary-button link-button" href={inboxHref({ page: page + 1, query, unreadOnly })}>Older</Link> : <span />}
        </nav>
      )}
    </aside>
  );
}
