import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ProductNavigation } from "@/components/product-navigation";
import { requireUser } from "@/lib/auth";
import { formatExactMessageTime, formatInboxMessageTime } from "@/lib/message-time";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

type InboxSearchParams = {
  page?: string | string[];
  q?: string | string[];
  filter?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageNumber(value: string | string[] | undefined) {
  const parsed = Number.parseInt(firstValue(value) || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function inboxHref({ page = 1, query = "", unreadOnly = false }: { page?: number; query?: string; unreadOnly?: boolean }) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (unreadOnly) params.set("filter", "unread");
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/messages?${search}` : "/messages";
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<InboxSearchParams> }) {
  const auth = await requireUser();
  const canList = auth.profile.primary_role === "owner" || auth.profile.primary_role === "agent";
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const resolvedSearchParams = await searchParams;
  const page = pageNumber(resolvedSearchParams.page);
  const query = (firstValue(resolvedSearchParams.q) || "").trim().slice(0, 120);
  const unreadOnly = firstValue(resolvedSearchParams.filter) === "unread";
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
    <main className="messages-page">
      <ProductNavigation authenticated canList={canList} current="messages" />
      <div className="messages-shell">
        <header className="messages-header">
          <div><p className="eyebrow">Private messaging</p><h1>Messages</h1></div>
        </header>

        <section className="messages-organization" aria-label="Organize conversations">
          <form className="messages-search-form" action="/messages" method="get">
            <label className="sr-only" htmlFor="message-search">Search conversations</label>
            <input id="message-search" name="q" type="search" defaultValue={query} maxLength={120} placeholder="Search people, properties, or latest messages" />
            {unreadOnly && <input type="hidden" name="filter" value="unread" />}
            <button className="secondary-button" type="submit">Search</button>
            {query && <Link className="text-link" href={inboxHref({ unreadOnly })}>Clear search</Link>}
          </form>
          <nav className="messages-filter-tabs" aria-label="Conversation filters">
            <Link className={!unreadOnly ? "messages-filter-active" : ""} href={inboxHref({ query })} aria-current={!unreadOnly ? "page" : undefined}>All conversations</Link>
            <Link className={unreadOnly ? "messages-filter-active" : ""} href={inboxHref({ query, unreadOnly: true })} aria-current={unreadOnly ? "page" : undefined}>Unread</Link>
          </nav>
        </section>

        {!conversations.length ? (
          page > 1 ? (
            <div className="empty-conversations">There are no conversations on this page. <Link className="text-link" href={firstPageHref}>Return to the first matching page</Link>.</div>
          ) : hasOrganizationFilters ? (
            <div className="empty-conversations">No conversations match these inbox filters. <Link className="text-link" href="/messages">Show all conversations</Link>.</div>
          ) : (
            <div className="empty-conversations">No conversations yet. Open an available property and choose <strong>Message owner</strong> to start one.</div>
          )
        ) : (
          <>
            <div className="messages-list">
              {conversations.map((conversation) => {
                const unread = Number(conversation.unread_count);
                const otherName = auth.userId === conversation.renter_id ? conversation.owner_display_name : conversation.renter_display_name;
                const timestamp = conversation.last_message_at || conversation.created_at;
                const propertyTitle = conversation.property_title || "Rental property";
                const coverUrl = coverUrlByProperty.get(conversation.property_id);
                return (
                  <Link className="conversation-card" href={`/messages/${conversation.id}`} key={conversation.id}>
                    <span className="conversation-property-media" aria-hidden="true">
                      {coverUrl ? <img src={coverUrl} alt="" loading="lazy" /> : <span>Home</span>}
                    </span>
                    <div className="conversation-main"><strong>{otherName || "NearBasha user"}</strong><span>Regarding {propertyTitle}</span><small>{conversation.last_message_body || "Conversation started — send the first message."}</small></div>
                    <div className="conversation-meta">{unread > 0 && <span className="unread-badge">{unread}</span>}<time dateTime={timestamp} title={formatExactMessageTime(timestamp)}>{formatInboxMessageTime(timestamp, renderedAt)}</time></div>
                  </Link>
                );
              })}
            </div>

            {(page > 1 || hasNextPage) && (
              <nav className="messages-pagination" aria-label="Messages pages">
                {page > 1 ? <Link className="secondary-button link-button" href={inboxHref({ page: page - 1, query, unreadOnly })}>Newer conversations</Link> : <span />}
                <span className="messages-page-number">Page {page}</span>
                {hasNextPage ? <Link className="secondary-button link-button" href={inboxHref({ page: page + 1, query, unreadOnly })}>Older conversations</Link> : <span />}
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
