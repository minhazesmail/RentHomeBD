import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { formatNumber } from "@/i18n/format";
import { getLocale } from "@/i18n/get-locale";
import { formatWorkflowText, getWorkflowCopy } from "@/i18n/workflow-copy";
import { messageConversationHref, messageInboxHref } from "@/lib/message-navigation";
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
  renderedAtMs: number;
  page?: number;
  query?: string;
  unreadOnly?: boolean;
  currentConversationId?: string | null;
};

export async function MessagesInboxPane({
  userId,
  renderedAtMs,
  page = 1,
  query = "",
  unreadOnly = false,
  currentConversationId = null,
}: Props) {
  const [supabase, locale] = await Promise.all([
    createClient() as unknown as Promise<SupabaseClient>,
    getLocale(),
  ]);
  const copy = getWorkflowCopy(locale).messages.inbox;
  const offset = (page - 1) * INBOX_PAGE_SIZE;
  const renderedAt = new Date(renderedAtMs);

  const { data, error } = await supabase
    .rpc("get_message_inbox", { search_text: query || null, unread_only: unreadOnly })
    .range(offset, offset + INBOX_PAGE_SIZE);
  if (error) throw error;

  const pageRows = (data ?? []) as ConversationSummary[];
  const hasNextPage = pageRows.length > INBOX_PAGE_SIZE;
  const conversations = pageRows.slice(0, INBOX_PAGE_SIZE);
  const hasOrganizationFilters = Boolean(query || unreadOnly);
  const firstPageHref = messageInboxHref({ query, unreadOnly });

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
    <aside className="messages-workspace-inbox" aria-label={copy.conversationsAria}>
      <div className="messages-workspace-inbox-head">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
        </div>
        <span className="messages-inbox-page-label">{page > 1 ? formatWorkflowText(copy.page, { page: formatNumber(page, locale) }) : copy.recent}</span>
      </div>

      <section className="messages-organization" aria-label={copy.organizeAria}>
        <form className="messages-search-form" action="/messages" method="get">
          <label className="sr-only" htmlFor="message-search">{copy.searchLabel}</label>
          <input id="message-search" name="q" type="search" defaultValue={query} maxLength={120} placeholder={copy.searchPlaceholder} />
          {unreadOnly && <input type="hidden" name="filter" value="unread" />}
          <button className="secondary-button" type="submit">{copy.search}</button>
          {query && <Link className="text-link" href={messageInboxHref({ unreadOnly })}>{copy.clear}</Link>}
        </form>
        <nav className="messages-filter-tabs" aria-label={copy.filtersAria}>
          <Link className={!unreadOnly ? "messages-filter-active" : ""} href={messageInboxHref({ query })} aria-current={!unreadOnly ? "page" : undefined}>{copy.all}</Link>
          <Link className={unreadOnly ? "messages-filter-active" : ""} href={messageInboxHref({ query, unreadOnly: true })} aria-current={unreadOnly ? "page" : undefined}>{copy.unread}</Link>
        </nav>
      </section>

      <div className="messages-workspace-list">
        {!conversations.length ? (
          page > 1 ? (
            <div className="empty-conversations">{copy.emptyPage} <Link className="text-link" href={firstPageHref}>{copy.returnFirst}</Link>.</div>
          ) : hasOrganizationFilters ? (
            <div className="empty-conversations">{copy.emptyFilter} <Link className="text-link" href="/messages">{copy.showAll}</Link>.</div>
          ) : (
            <div className="empty-conversations">{copy.empty}</div>
          )
        ) : (
          conversations.map((conversation) => {
            const unread = Number(conversation.unread_count);
            const otherName = userId === conversation.renter_id ? conversation.owner_display_name : conversation.renter_display_name;
            const timestamp = conversation.last_message_at || conversation.created_at;
            const propertyTitle = conversation.property_title || copy.rentalProperty;
            const coverUrl = coverUrlByProperty.get(conversation.property_id);
            const active = conversation.id === currentConversationId;
            return (
              <Link
                className={`conversation-card messages-workspace-conversation${active ? " is-active" : ""}`}
                href={messageConversationHref({ id: conversation.id, page, query, unreadOnly })}
                key={conversation.id}
                aria-current={active ? "page" : undefined}
              >
                <span className="conversation-property-media" aria-hidden="true">
                  {coverUrl ? <img src={coverUrl} alt="" loading="lazy" /> : <span>{copy.home}</span>}
                </span>
                <div className="conversation-main">
                  <strong>{otherName || copy.user}</strong>
                  <span>{propertyTitle}</span>
                  <small>{conversation.last_message_body || copy.started}</small>
                </div>
                <div className="conversation-meta">
                  {unread > 0 && <span className="unread-badge">{formatNumber(unread, locale)}</span>}
                  <time dateTime={timestamp} title={formatExactMessageTime(timestamp, locale)}>{formatInboxMessageTime(timestamp, renderedAt, locale)}</time>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {(page > 1 || hasNextPage) && (
        <nav className="messages-pagination messages-workspace-pagination" aria-label={copy.pagesAria}>
          {page > 1 ? <Link className="secondary-button link-button" href={messageInboxHref({ page: page - 1, query, unreadOnly })}>{copy.newer}</Link> : <span />}
          <span className="messages-page-number">{formatWorkflowText(copy.page, { page: formatNumber(page, locale) })}</span>
          {hasNextPage ? <Link className="secondary-button link-button" href={messageInboxHref({ page: page + 1, query, unreadOnly })}>{copy.older}</Link> : <span />}
        </nav>
      )}
    </aside>
  );
}
