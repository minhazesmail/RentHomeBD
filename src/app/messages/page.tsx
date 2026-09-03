import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const INBOX_PAGE_SIZE = 20;

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

function pageNumber(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const auth = await requireUser();
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { page: pageValue } = await searchParams;
  const page = pageNumber(pageValue);
  const offset = (page - 1) * INBOX_PAGE_SIZE;

  const { data, error } = await supabase
    .rpc("get_message_inbox")
    .range(offset, offset + INBOX_PAGE_SIZE);
  if (error) throw error;

  const pageRows = (data ?? []) as ConversationSummary[];
  const hasNextPage = pageRows.length > INBOX_PAGE_SIZE;
  const conversations = pageRows.slice(0, INBOX_PAGE_SIZE);

  return (
    <main className="messages-page">
      <div className="messages-shell">
        <header className="messages-header">
          <div><Link className="brand-link compact-brand" href="/">NearBasha</Link><p className="eyebrow">Private messaging</p><h1>Messages</h1></div>
          <div className="owner-header-actions"><Link className="secondary-button link-button" href="/homes">Browse homes</Link><Link className="text-link" href="/dashboard">Dashboard</Link></div>
        </header>

        {!conversations.length ? (
          page > 1 ? (
            <div className="empty-conversations">There are no conversations on this page. <Link className="text-link" href="/messages">Return to your latest messages</Link>.</div>
          ) : (
            <div className="empty-conversations">No conversations yet. Open an available property and choose <strong>Message owner</strong> to start one.</div>
          )
        ) : (
          <>
            <div className="messages-list">
              {conversations.map((conversation) => {
                const unread = Number(conversation.unread_count);
                const otherName = auth.userId === conversation.renter_id ? conversation.owner_display_name : conversation.renter_display_name;
                return (
                  <Link className="conversation-card" href={`/messages/${conversation.id}`} key={conversation.id}>
                    <div className="conversation-main"><strong>{otherName || "NearBasha user"}</strong><span>{conversation.property_title || "Rental property"}</span><small>{conversation.last_message_body || "Conversation started — send the first message."}</small></div>
                    <div className="conversation-meta">{unread > 0 && <span className="unread-badge">{unread}</span>}<span>{new Date(conversation.last_message_at || conversation.created_at).toLocaleDateString("en-BD")}</span></div>
                  </Link>
                );
              })}
            </div>

            {(page > 1 || hasNextPage) && (
              <nav className="messages-pagination" aria-label="Messages pages">
                {page > 1 ? <Link className="secondary-button link-button" href={page === 2 ? "/messages" : `/messages?page=${page - 1}`}>Newer conversations</Link> : <span />}
                <span className="messages-page-number">Page {page}</span>
                {hasNextPage ? <Link className="secondary-button link-button" href={`/messages?page=${page + 1}`}>Older conversations</Link> : <span />}
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
