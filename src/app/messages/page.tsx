import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

export default async function MessagesPage() {
  const auth = await requireUser();
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data, error } = await supabase.rpc("get_message_inbox");
  if (error) throw error;

  const conversations = (data ?? []) as ConversationSummary[];

  return (
    <main className="messages-page">
      <div className="messages-shell">
        <header className="messages-header">
          <div><Link className="brand-link compact-brand" href="/">NearBasha</Link><p className="eyebrow">Private messaging</p><h1>Messages</h1></div>
          <div className="owner-header-actions"><Link className="secondary-button link-button" href="/homes">Browse homes</Link><Link className="text-link" href="/dashboard">Dashboard</Link></div>
        </header>

        {!conversations.length ? <div className="empty-conversations">No conversations yet. Open an available property and choose <strong>Message owner</strong> to start one.</div> : (
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
        )}
      </div>
    </main>
  );
}
