import "../../premium-ui.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { RealtimeMessageThread } from "@/components/realtime-message-thread";
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
  renter_last_read_at: string | null;
  owner_last_read_at: string | null;
};

type Message = { id: string; sender_id: string; body: string; created_at: string };

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  const { id } = await params;
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const { data: conversationData } = await supabase
    .from("conversations")
    .select("id, property_id, renter_id, owner_id, renter_display_name, owner_display_name, property_title, renter_last_read_at, owner_last_read_at")
    .eq("id", id)
    .maybeSingle();

  const conversation = conversationData as Conversation | null;
  if (!conversation) notFound();

  const viewerIsRenter = auth.userId === conversation.renter_id;
  const readField = viewerIsRenter ? "renter_last_read_at" : "owner_last_read_at";
  const otherReadField = viewerIsRenter ? "owner_last_read_at" : "renter_last_read_at";
  const otherReadAt = viewerIsRenter ? conversation.owner_last_read_at : conversation.renter_last_read_at;
  const otherUserId = viewerIsRenter ? conversation.owner_id : conversation.renter_id;

  await supabase.from("conversations").update({ [readField]: new Date().toISOString() }).eq("id", conversation.id);

  const [{ data: messageRows }, { data: otherProfile }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("phone_verified_at").eq("id", otherUserId).maybeSingle(),
  ]);

  const messages = (messageRows ?? []) as Message[];
  const otherName = viewerIsRenter ? conversation.owner_display_name : conversation.renter_display_name;
  const otherRole = viewerIsRenter ? "Owner / agent" : "Renter";
  const phoneVerified = Boolean(otherProfile?.phone_verified_at);
  const initial = (otherName || "R").slice(0, 1).toUpperCase();

  return (
    <main className="messages-page">
      <div className="thread-shell">
        <header className="thread-header modern-thread-header">
          <div className="thread-identity-wrap">
            <Link className="thread-back-button" href="/messages" aria-label="Back to messages">←</Link>
            <div className="thread-avatar" aria-hidden="true">{initial}</div>
            <div className="thread-identity">
              <div className="thread-name-row">
                <h1>{otherName || "NearBasha user"}</h1>
                {phoneVerified && <span className="message-verified-badge" title="Phone verified">✓ Verified</span>}
              </div>
              <p>{otherRole} · {conversation.property_title || "Rental property"}</p>
            </div>
          </div>
          <Link className="secondary-button link-button thread-property-link" href={`/homes/${conversation.property_id}`}>View property</Link>
        </header>

        <RealtimeMessageThread
          conversationId={conversation.id}
          userId={auth.userId}
          readField={readField}
          otherReadField={otherReadField}
          initialOtherReadAt={otherReadAt}
          initialMessages={messages}
        />
      </div>
    </main>
  );
}
