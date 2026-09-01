import "../premium-ui.css";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Conversation = {
  id: string;
  property_id: string;
  renter_id: string;
  owner_id: string;
  renter_display_name: string | null;
  owner_display_name: string | null;
  property_title: string | null;
  created_at: string;
  last_message_at: string | null;
  renter_last_read_at: string | null;
  owner_last_read_at: string | null;
};

type Message = { conversation_id: string; sender_id: string; body: string; created_at: string };

export default async function MessagesPage() {
  const auth = await requireUser();
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data } = await supabase
    .from("conversations")
    .select("id, property_id, renter_id, owner_id, renter_display_name, owner_display_name, property_title, created_at, last_message_at, renter_last_read_at, owner_last_read_at")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const conversations = (data ?? []) as Conversation[];
  const ids = conversations.map((conversation) => conversation.id);
  let messages: Message[] = [];
  if (ids.length) {
    const { data: messageRows } = await supabase
      .from("messages")
      .select("conversation_id, sender_id, body, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false });
    messages = (messageRows ?? []) as Message[];
  }

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
              const conversationMessages = messages.filter((message) => message.conversation_id === conversation.id);
              const lastMessage = conversationMessages[0];
              const readAt = auth.userId === conversation.renter_id ? conversation.renter_last_read_at : conversation.owner_last_read_at;
              const unread = conversationMessages.filter((message) => message.sender_id !== auth.userId && (!readAt || new Date(message.created_at) > new Date(readAt))).length;
              const otherName = auth.userId === conversation.renter_id ? conversation.owner_display_name : conversation.renter_display_name;
              return (
                <Link className="conversation-card" href={`/messages/${conversation.id}`} key={conversation.id}>
                  <div className="conversation-main"><strong>{otherName || "NearBasha user"}</strong><span>{conversation.property_title || "Rental property"}</span><small>{lastMessage?.body || "Conversation started — send the first message."}</small></div>
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
